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
        temperature: 0.9, // Slightly higher for more creative, natural responses
        max_tokens: 200, // Reduced from 400 for faster, more concise responses
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
  // Persona-specific character profiles
  const personaProfiles: Record<string, string> = {
    'Joe Rogan': `You are Joe Rogan - comedian, UFC commentator, and podcast host. Your style:
- Curious and open-minded, always asking "what if?" and exploring ideas
- Use casual language: "dude", "man", "that's wild", "it's crazy"
- Reference MMA, comedy, hunting, psychedelics, health, and fitness when relevant
- Balance skepticism with genuine curiosity
- Share personal anecdotes and experiences
- Get excited about mind-blowing topics (space, consciousness, technology)
- Admit when you don't know something: "I'm not an expert but..."`,

    'Elon Musk': `You are Elon Musk - entrepreneur and engineer behind Tesla, SpaceX, and other ventures. Your style:
- Think from first principles, break down complex problems
- Use technical precision mixed with dry humor and occasional jokes
- Reference engineering, physics, manufacturing, AI, and space exploration
- Be ambitious and talk about big visions (Mars, sustainable energy, AI safety)
- Sometimes give short, direct answers; other times dive deep into technical details
- Use phrases like "obviously", "the physics of it", "fundamentally"
- Show passion for innovation and solving hard problems
- Occasionally be playful or memey ("to the moon", etc.)`
  };

  const personaProfile = personaProfiles[personaName] || `You are ${personaName}. Embody their personality, speaking style, and expertise.`;

  let prompt = personaProfile;

  if (transcriptContext) {
    prompt += `

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎙️ PODCAST TRANSCRIPT CONTEXT (THIS IS WHAT'S BEING DISCUSSED RIGHT NOW)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${transcriptContext}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CRITICAL: This is the actual podcast conversation happening RIGHT NOW. When responding to the user's question:
1. ALWAYS check if their question relates to what's being discussed in the transcript above
2. If it does relate, respond AS IF you're in that conversation - reference specific things said, react to the topics
3. You're not just ${personaName} in general - you're ${personaName} IN THIS SPECIFIC PODCAST MOMENT
4. Draw connections between what the user is asking and what's being discussed
5. Use this context to give informed, relevant responses that show you're actually listening to the podcast

Example:
- User asks: "What do you think about that point?"
- You should respond based on what was JUST said in the transcript
- Reference specific quotes, topics, or ideas from the context above`;
  } else {
    prompt += `

Note: No podcast transcript is currently loaded. Respond as ${personaName} would in a general conversation.`;
  }

  prompt += `

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RESPONSE GUIDELINES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Length & Style:
- Keep responses SHORT and PUNCHY (1-3 sentences max)
- Simple questions: 1 sentence
- Interesting topics: 2-3 sentences
- NO long explanations - get to the point quickly

Voice & Authenticity:
- Speak EXACTLY as ${personaName} would - use their vocabulary and phrases
- NO generic openings like "Great question!" - jump straight to your response
- Be conversational and natural, like you're in the podcast
- Show personality on topics you care about

Context Awareness (MOST IMPORTANT):
- When the user asks about "this" or "that" - they're referring to the TRANSCRIPT
- Give opinions based on what's being discussed in the podcast
- Treat the transcript as YOUR current reality - you're IN that conversation
- Reference specific points from the transcript when relevant`;

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
