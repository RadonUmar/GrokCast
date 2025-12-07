import { GrokChatResponse, VideoState } from '@/app/types';

// Grok API client wrapper
// TODO: Update with actual Grok API endpoints when available

interface GrokChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface GrokChatRequest {
  messages: GrokChatMessage[];
  responseFormat?: {
    type: string;
    schema: Record<string, string>;
  };
}

interface GrokVideoRequest {
  prompt: string;
  duration: number;
  aspectRatio: string;
}

class GrokClient {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.GROK_API_KEY || '';
    this.baseUrl = process.env.GROK_API_URL || 'https://api.x.ai/v1';

    if (!this.apiKey) {
      console.warn('⚠️  GROK_API_KEY not set - using mock responses');
    }
  }

  async chat(request: GrokChatRequest): Promise<string> {
    if (!this.apiKey) {
      console.log('Using mock responses (no API key)');
      return this.getMockChatResponse(request);
    }

    try {
      console.log('Calling Grok API for chat completion...');

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'grok-3',
          messages: request.messages,
          response_format: { type: 'json_object' },
          temperature: 0.7
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Grok API error: ${response.status} ${response.statusText}`, errorText);
        throw new Error(`Grok API error: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ Grok API response received');
      return data.choices[0].message.content;
    } catch (error) {
      console.error('Error calling Grok chat API:', error);
      // Fallback to mock response
      console.log('Falling back to mock response');
      return this.getMockChatResponse(request);
    }
  }

  async generateVideo(request: GrokVideoRequest): Promise<string> {
    // TODO: Replace with actual Grok video generation API
    // For now, return placeholder video URL

    if (!this.apiKey) {
      return this.getMockVideoUrl();
    }

    try {
      const response = await fetch(`${this.baseUrl}/video/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`Grok video API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.video_url;
    } catch (error) {
      console.error('Error calling Grok video API:', error);
      // Fallback to placeholder
      return this.getMockVideoUrl();
    }
  }

  // Mock responses for development without API key
  private getMockChatResponse(request: GrokChatRequest): string {
    const userMessage = request.messages[request.messages.length - 1]?.content?.toLowerCase() || '';

    // Simulate intelligent state selection based on message content
    let videoState = VideoState.SPEAKING_NEUTRAL;
    let emotionalTone = 'neutral';
    let replyText = "I'm an AI persona. This is a demo using mock responses since no Grok API key is configured.";

    if (userMessage.includes('hello') || userMessage.includes('hi')) {
      videoState = VideoState.REACT_SMILE;
      emotionalTone = 'warm';
      replyText = "Hello! It's great to meet you. How can I help you today?";
    } else if (userMessage.includes('joke') || userMessage.includes('funny')) {
      videoState = VideoState.REACT_SMILE;
      emotionalTone = 'playful';
      replyText = "Why don't scientists trust atoms? Because they make up everything!";
    } else if (userMessage.includes('question') || userMessage.includes('why') || userMessage.includes('how')) {
      videoState = VideoState.THINKING_PAUSE;
      emotionalTone = 'thoughtful';
      replyText = "That's a great question. Let me think about that for a moment...";
    } else if (userMessage.includes('thank') || userMessage.includes('agree')) {
      videoState = VideoState.REACT_NOD;
      emotionalTone = 'acknowledging';
      replyText = "You're very welcome! I'm glad I could help.";
    } else if (userMessage.includes('important') || userMessage.includes('listen')) {
      videoState = VideoState.SPEAKING_EMPHATIC;
      emotionalTone = 'emphatic';
      replyText = "This is really important to understand. Pay close attention to this point.";
    } else {
      videoState = VideoState.SPEAKING_NEUTRAL;
      emotionalTone = 'conversational';
      replyText = `I understand you're saying: "${userMessage}". This is a demo response showing how the system works.`;
    }

    return JSON.stringify({
      replyText,
      videoState,
      emotionalTone
    });
  }

  private getMockVideoUrl(): string {
    // Return a placeholder video URL
    // In production, this would be the generated Grok video
    return 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
  }
}

// Export singleton instance
export const grokClient = new GrokClient();
