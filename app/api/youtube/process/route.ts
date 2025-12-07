import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

const execAsync = promisify(exec);

interface ProcessYouTubeRequest {
  youtubeUrl: string;
  speakerName?: string;
}

interface ProcessYouTubeResponse {
  success: boolean;
  videoId: string;
  transcript?: string;
  transcriptPreview?: string;
  utterances?: Array<{
    speaker: string;
    text: string;
    start: number;
    end: number;
  }>;
  error?: string;
}

// Store transcripts in memory (in production, use a database)
const transcriptStore = new Map<string, any>();

export async function POST(request: NextRequest) {
  try {
    const body: ProcessYouTubeRequest = await request.json();
    const { youtubeUrl, speakerName = 'Joe Rogan' } = body;

    if (!youtubeUrl) {
      return NextResponse.json(
        { success: false, error: 'YouTube URL is required' },
        { status: 400 }
      );
    }

    // Extract video ID from URL
    const videoId = extractVideoId(youtubeUrl);
    if (!videoId) {
      return NextResponse.json(
        { success: false, error: 'Invalid YouTube URL' },
        { status: 400 }
      );
    }

    console.log(`📹 Processing YouTube video: ${videoId}`);

    // Check if we already have this transcript
    if (transcriptStore.has(videoId)) {
      const cached = transcriptStore.get(videoId);
      return NextResponse.json({
        success: true,
        videoId,
        transcript: cached.transcript,
        transcriptPreview: cached.transcriptPreview,
        utterances: cached.utterances,
      });
    }

    // Create storage directory
    const storageDir = path.join(process.cwd(), 'storage', 'youtube');
    await fs.mkdir(storageDir, { recursive: true });

    const audioPath = path.join(storageDir, `${videoId}.mp3`);

    // Download audio using yt-dlp
    console.log('⬇️ Downloading audio...');
    try {
      // Add Homebrew path to environment for yt-dlp and ffmpeg
      const env = {
        ...process.env,
        PATH: `/opt/homebrew/bin:/usr/local/bin:${process.env.PATH}`,
      };

      await execAsync(
        `yt-dlp -x --audio-format mp3 --audio-quality 0 -o "${audioPath}" --no-playlist "${youtubeUrl}"`,
        {
          timeout: 600000, // 10 minute timeout
          env
        }
      );
    } catch (error: any) {
      console.error('❌ yt-dlp error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to download YouTube video. Make sure yt-dlp is installed.' },
        { status: 500 }
      );
    }

    if (!existsSync(audioPath)) {
      return NextResponse.json(
        { success: false, error: 'Failed to download audio file' },
        { status: 500 }
      );
    }

    console.log('✅ Audio downloaded successfully');

    // Transcribe using AssemblyAI
    console.log('📝 Transcribing audio...');
    const assemblyAIKey = process.env.ASSEMBLYAI_API_KEY;

    if (!assemblyAIKey) {
      return NextResponse.json(
        { success: false, error: 'AssemblyAI API key not configured' },
        { status: 500 }
      );
    }

    let transcript = '';
    let utterances: any[] = [];

    try {
      // Upload file to AssemblyAI
      const audioData = await fs.readFile(audioPath);
      const uploadResponse = await fetch('https://api.assemblyai.com/v2/upload', {
        method: 'POST',
        headers: {
          'authorization': assemblyAIKey,
        },
        body: audioData,
      });

      const uploadData = await uploadResponse.json();
      const audioUrl = uploadData.upload_url;

      // Request transcription with speaker labels
      const transcriptResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
        method: 'POST',
        headers: {
          'authorization': assemblyAIKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          audio_url: audioUrl,
          speaker_labels: true,
        }),
      });

      const transcriptData = await transcriptResponse.json();
      const transcriptId = transcriptData.id;

      // Poll for completion
      let completed = false;
      let attempts = 0;
      const maxAttempts = 120; // 10 minutes max

      while (!completed && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds

        const statusResponse = await fetch(
          `https://api.assemblyai.com/v2/transcript/${transcriptId}`,
          {
            headers: {
              'authorization': assemblyAIKey,
            },
          }
        );

        const statusData = await statusResponse.json();

        if (statusData.status === 'completed') {
          transcript = statusData.text || '';
          utterances = statusData.utterances || [];
          completed = true;
        } else if (statusData.status === 'error') {
          throw new Error(`Transcription failed: ${statusData.error}`);
        }

        attempts++;
      }

      if (!completed) {
        throw new Error('Transcription timeout');
      }

    } catch (error: any) {
      console.error('❌ Transcription error:', error);
      return NextResponse.json(
        { success: false, error: `Transcription failed: ${error.message}` },
        { status: 500 }
      );
    }

    console.log('✅ Transcription complete');

    // Format utterances
    const formattedUtterances = utterances.map((u: any) => ({
      speaker: u.speaker || 'Unknown',
      text: u.text || '',
      start: u.start || 0,
      end: u.end || 0,
    }));

    const transcriptPreview = transcript.substring(0, 500) + (transcript.length > 500 ? '...' : '');

    // Store in memory
    transcriptStore.set(videoId, {
      transcript,
      transcriptPreview,
      utterances: formattedUtterances,
      speakerName,
      audioPath,
    });

    return NextResponse.json({
      success: true,
      videoId,
      transcript,
      transcriptPreview,
      utterances: formattedUtterances,
    });

  } catch (error: any) {
    console.error('❌ Error processing YouTube video:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve cached transcript
export async function GET(request: NextRequest) {
  const videoId = request.nextUrl.searchParams.get('videoId');

  if (!videoId) {
    return NextResponse.json(
      { success: false, error: 'Video ID required' },
      { status: 400 }
    );
  }

  const cached = transcriptStore.get(videoId);

  if (!cached) {
    return NextResponse.json(
      { success: false, error: 'Transcript not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    videoId,
    transcript: cached.transcript,
    transcriptPreview: cached.transcriptPreview,
    utterances: cached.utterances,
  });
}

function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
    /youtube\.com\/embed\/([^&\n?#]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

// Export transcript store for use in other API routes
export { transcriptStore };
