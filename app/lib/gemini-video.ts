import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Gemini Video Generation Client
 * Note: Gemini doesn't have direct video generation yet, so we:
 * 1. Use Imagen for image generation
 * 2. Create animated sequences
 * 3. Or use stock videos as placeholders with AI-selected states
 */

const STOCK_VIDEOS: Record<string, string> = {
  // Free stock videos from Pexels/Pixabay
  idle_listening: 'https://cdn.pixabay.com/video/2023/10/23/185693-877062389_large.mp4',
  speaking_neutral: 'https://cdn.pixabay.com/video/2023/05/22/163311-829058062_large.mp4',
  speaking_emphatic: 'https://cdn.pixabay.com/video/2023/04/12/158567-817065933_large.mp4',
  react_smile: 'https://cdn.pixabay.com/video/2023/09/15/180437-863822895_large.mp4',
  react_nod: 'https://cdn.pixabay.com/video/2023/06/19/168354-839378530_large.mp4',
  thinking_pause: 'https://cdn.pixabay.com/video/2023/07/11/171378-845485769_large.mp4',
};

class GeminiVideoClient {
  private genAI: GoogleGenerativeAI | null = null;
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || '';

    if (this.apiKey && this.apiKey !== 'YOUR_GEMINI_API_KEY_HERE') {
      this.genAI = new GoogleGenerativeAI(this.apiKey);
      console.log('✅ Gemini API initialized');
    } else {
      console.log('⚠️  Gemini API key not set - using stock videos');
    }
  }

  async generateVideo(prompt: string, state: string): Promise<string> {
    console.log(`🎬 Generating video for state: ${state}`);
    console.log(`📝 Prompt: ${prompt}`);

    try {
      // For now, use curated stock videos that match each state
      // These are free, royalty-free videos from Pixabay
      const videoUrl = STOCK_VIDEOS[state as keyof typeof STOCK_VIDEOS];

      if (videoUrl) {
        console.log(`✅ Using stock video for ${state}`);
        return videoUrl;
      }

      // Fallback
      return STOCK_VIDEOS.idle_listening;

    } catch (error) {
      console.error('Error generating video:', error);
      return STOCK_VIDEOS.idle_listening;
    }
  }

  /**
   * Future: When Gemini gets video generation API
   */
  async generateVideoWithGemini(prompt: string): Promise<string> {
    if (!this.genAI) {
      throw new Error('Gemini API not initialized');
    }

    // This is a placeholder for future Gemini video generation
    // For now, Gemini can generate images which could be animated
    const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const result = await model.generateContent([
      {
        text: `Generate a photorealistic talking head video: ${prompt}.
        The video should be 2-3 seconds, showing natural facial expressions and movements.`
      }
    ]);

    // This would return a video URL once Gemini supports it
    const response = await result.response;
    console.log('Gemini response:', response.text());

    // For now, return stock video
    return STOCK_VIDEOS.idle_listening;
  }

  /**
   * Check if we have a valid API key
   */
  isConfigured(): boolean {
    return this.genAI !== null;
  }
}

export const geminiVideoClient = new GeminiVideoClient();
