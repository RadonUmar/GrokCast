import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';

interface ChatRequest {
  message: string;
  videoId?: string;
  timestamp?: number;
  sessionId: string;
  personaName: string;
}

interface ChatResponse {
  replyText: string;
  audioBase64?: string;
  audioDuration?: number;
  error?: string;
}

// Import the transcript store from the YouTube API
let transcriptStore: Map<string, any>;
try {
  const youtubeModule = require('../youtube/process/route');
  transcriptStore = youtubeModule.transcriptStore;
} catch {
  transcriptStore = new Map();
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();
    const { message, videoId, timestamp, sessionId, personaName } = body;

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    console.log(`📨 Chat request from ${personaName} - Message: "${message.substring(0, 50)}..."`);

    // Get transcript context if available
    let transcriptContext = '';
    let audioPath = '';

    if (videoId && transcriptStore.has(videoId)) {
      const cached = transcriptStore.get(videoId);
      transcriptContext = cached.transcript || '';
      audioPath = cached.audioPath || '';

      console.log(`📜 Using transcript context (${transcriptContext.length} chars)`);

      // If we have a timestamp, try to find relevant context around that time
      if (timestamp && cached.utterances) {
        const relevantUtterances = cached.utterances.filter((u: any) => {
          return Math.abs(u.start / 1000 - timestamp) < 30; // Within 30 seconds
        });

        if (relevantUtterances.length > 0) {
          const relevantText = relevantUtterances
            .map((u: any) => `${u.speaker}: ${u.text}`)
            .join('\n');
          transcriptContext = relevantText + '\n\n' + transcriptContext.substring(0, 1000);
          console.log(`🎯 Using time-relevant context around ${timestamp}s`);
        }
      } else if (transcriptContext.length > 2000) {
        // Limit transcript to avoid token limits
        transcriptContext = transcriptContext.substring(0, 2000) + '...';
      }
    }

    // Build system prompt with context
    const systemPrompt = buildSystemPrompt(personaName, transcriptContext);

    // Call Grok API
    const xaiApiKey = process.env.XAI_API_KEY;
    if (!xaiApiKey) {
      return NextResponse.json(
        { error: 'XAI API key not configured' },
        { status: 500 }
      );
    }

    console.log('🤖 Calling Grok API...');

    const grokResponse = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${xaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'grok-2-latest',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message },
        ],
        temperature: 0.8,
        max_tokens: 150,
      }),
    });

    if (!grokResponse.ok) {
      const errorText = await grokResponse.text();
      console.error('❌ Grok API error:', errorText);
      return NextResponse.json(
        { error: 'Failed to get AI response' },
        { status: 500 }
      );
    }

    const grokData = await grokResponse.json();
    const replyText = grokData.choices[0].message.content;

    console.log(`✅ Grok response: "${replyText.substring(0, 100)}..."`);

    // Generate TTS audio using Grok Voice API
    let audioBase64 = undefined;
    let audioDuration = estimateAudioDuration(replyText);

    try {
      console.log('🎵 Generating TTS audio with Grok Voice API...');

      // Get voice file for cloning
      const voiceBase64 = await getVoiceFileBase64(personaName);
      if (voiceBase64) {
        console.log(`🎤 Using voice cloning for: ${personaName}`);
      }

      const ttsEndpoint = 'https://us-east-4.api.x.ai/voice-staging/api/v1/text-to-speech/generate';
      const ttsPayload = {
        model: 'grok-voice',
        input: replyText.substring(0, 4096), // Max length
        response_format: 'mp3',
        instructions: 'audio',
        voice: voiceBase64 || 'None',
        sampling_params: {
          max_new_tokens: 512,
          temperature: 1.0,
          min_p: 0.01,
        },
      };

      const ttsResponse = await fetch(ttsEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${xaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ttsPayload),
      });

      if (ttsResponse.ok) {
        const audioBuffer = await ttsResponse.arrayBuffer();
        audioBase64 = Buffer.from(audioBuffer).toString('base64');
        console.log(`✅ TTS audio generated: ${audioBuffer.byteLength} bytes`);

        // Calculate actual duration based on mp3 size (rough estimate)
        // MP3 at 128kbps ≈ 16KB/second
        audioDuration = audioBuffer.byteLength / 16000;
      } else {
        const errorText = await ttsResponse.text();
        console.error('⚠️ TTS generation failed:', ttsResponse.status, errorText);
      }
    } catch (error) {
      console.error('⚠️ TTS generation error:', error);
      // Continue without audio - will use estimated duration
    }

    const response: ChatResponse = {
      replyText,
      audioBase64,
      audioDuration,
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('❌ Error in /api/chat:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

function buildSystemPrompt(personaName: string, transcriptContext: string): string {
  let prompt = `You are ${personaName}. Respond briefly in ${personaName}'s voice and style.`;

  if (transcriptContext) {
    prompt += `\n\nPODCAST CONTEXT:\n${transcriptContext}`;
  }

  prompt += `

CRITICAL INSTRUCTIONS:
- Keep your response to 1-3 sentences MAX. This is a CONVERSATION, not a lecture.
- Be direct and casual, like you're chatting with a friend.
- Don't repeat the question back. Don't use filler phrases like "Great question!" or "That's interesting."
- If you don't know something, just say so briefly.
- Match the energy and tone of casual podcast banter.`;

  return prompt;
}

function estimateAudioDuration(text: string): number {
  // Rough estimate: ~150 words per minute = 2.5 words per second
  // Average 5 characters per word
  const words = text.split(/\s+/).length;
  const durationSeconds = words / 2.5;
  return Math.max(3, durationSeconds); // Minimum 3 seconds
}

async function getVoiceFileBase64(personaName: string): Promise<string | null> {
  try {
    // Try to find voice file in public/voices directory
    const voicesPath = path.join(process.cwd(), 'public', 'voices');

    // Create normalized filename variations
    const normalized = personaName.toLowerCase().replace(/\s+/g, '-');
    const variations = [
      `${normalized}.mp3`,
      `${normalized}.m4a`,
      `${normalized}.wav`,
      `${personaName.toLowerCase().replace(/\s+/g, '')}.mp3`,
      `${personaName.toLowerCase().replace(/\s+/g, '_')}.mp3`,
    ];

    // Try each variation
    for (const filename of variations) {
      const filePath = path.join(voicesPath, filename);
      try {
        const fileBuffer = await fs.readFile(filePath);
        const base64 = fileBuffer.toString('base64');
        console.log(`✅ Found voice file: ${filename} (${fileBuffer.length} bytes)`);
        return base64;
      } catch {
        // File doesn't exist, try next variation
        continue;
      }
    }

    console.log(`⚠️ No voice file found for ${personaName}, using default voice`);
    return null;
  } catch (error) {
    console.error('Error loading voice file:', error);
    return null;
  }
}
