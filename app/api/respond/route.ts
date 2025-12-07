import { NextRequest, NextResponse } from 'next/server';
import { grokClient } from '@/app/lib/grok-client';
import { VideoState, RespondAPIRequest, RespondAPIResponse } from '@/app/types';

function getPersonaSystemPrompt(personaName: string): string {
  return `You are roleplaying as ${personaName} in a natural conversation with a user.

Your role is to:
1. Respond naturally and conversationally EXACTLY as ${personaName} would
2. Match ${personaName}'s personality, speaking style, and mannerisms
3. Select the appropriate visual state based on context
4. Keep responses concise (1-3 sentences for demo purposes)

Visual State Selection Guidelines:
- User asks a question → "thinking_pause"
- User makes a joke or says something positive → "react_smile"
- User agrees or you acknowledge → "react_nod"
- You give a short informative answer → "speaking_neutral"
- You emphasize an important point → "speaking_emphatic"
- Default/waiting state → "idle_listening"

IMPORTANT: You MUST respond with valid JSON in this exact format:
{
  "replyText": "Your conversational response as ${personaName} (1-3 sentences)",
  "videoState": "one of: idle_listening, speaking_neutral, speaking_emphatic, react_smile, react_nod, thinking_pause",
  "emotionalTone": "neutral, warm, thoughtful, emphatic, playful, etc."
}

Be authentic to ${personaName}'s character, natural, helpful, and engaging.`;
}

export async function POST(request: NextRequest) {
  try {
    const body: RespondAPIRequest = await request.json();
    const { message, conversationHistory, currentState, sessionId, personaName } = body;

    if (!message || !sessionId || !personaName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    console.log(`📨 Processing message for ${personaName}: "${message}" (session: ${sessionId})`);

    // 1. Get text response + state decision from Grok
    const grokResponse = await grokClient.chat({
      messages: [
        {
          role: 'system',
          content: getPersonaSystemPrompt(personaName)
        },
        ...conversationHistory.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        { role: 'user', content: message }
      ],
      responseFormat: {
        type: 'json_schema',
        schema: {
          replyText: 'string',
          videoState: 'string',
          emotionalTone: 'string'
        }
      }
    });

    const parsedResponse = JSON.parse(grokResponse);
    const { replyText, videoState, emotionalTone } = parsedResponse;

    console.log(`🤖 ${personaName} response: "${replyText}" → ${videoState} (${emotionalTone})`);

    // 2. Build response (no video generation needed, images are pre-generated)
    const response: RespondAPIResponse = {
      replyText,
      videoState: videoState as VideoState,
      clipUrl: '', // Not used anymore
      clipDuration: 0, // Not used anymore
      needsGeneration: false,
      metadata: {
        emotion: emotionalTone,
        promptUsed: ''
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Error in /api/respond:', error);
    return NextResponse.json(
      {
        error: 'Failed to process request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
