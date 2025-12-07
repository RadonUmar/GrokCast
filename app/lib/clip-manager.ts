import fs from 'fs/promises';
import path from 'path';
import { VideoState } from '@/app/types';
import { STATE_CONFIGS, generateVideoPrompt } from './state-machine';
import { geminiVideoClient } from './gemini-video';

export interface ClipInfo {
  url: string;
  duration: number;
  wasGenerated: boolean;
}

class ClipManager {
  private storageDir: string;
  private publicDir: string;

  constructor() {
    this.storageDir = path.join(process.cwd(), 'storage');
    this.publicDir = path.join(process.cwd(), 'public', 'clips');
  }

  /**
   * Get a video clip - either from cache or generate new one
   */
  async getClip(
    state: VideoState,
    sessionId: string,
    prompt: string
  ): Promise<ClipInfo> {
    const cacheKey = this.generateCacheKey(state);

    // 1. Check public clips (pre-generated)
    const publicPath = path.join(this.publicDir, `${cacheKey}.mp4`);
    if (await this.fileExists(publicPath)) {
      return {
        url: `/clips/${cacheKey}.mp4`,
        duration: STATE_CONFIGS[state].duration,
        wasGenerated: false
      };
    }

    // 2. Check session storage (runtime generated)
    const sessionDir = path.join(this.storageDir, sessionId);
    const sessionPath = path.join(sessionDir, `${cacheKey}.mp4`);
    if (await this.fileExists(sessionPath)) {
      return {
        url: `/api/clips/${sessionId}/${cacheKey}`,
        duration: STATE_CONFIGS[state].duration,
        wasGenerated: false
      };
    }

    // 3. Generate new clip
    console.log(`Generating new clip for state: ${state}`);
    const videoUrl = await this.generateClip(state, prompt, sessionId, cacheKey);

    return {
      url: videoUrl,
      duration: STATE_CONFIGS[state].duration,
      wasGenerated: true
    };
  }

  /**
   * Generate a new video clip using Grok API
   */
  private async generateClip(
    state: VideoState,
    prompt: string,
    sessionId: string,
    cacheKey: string
  ): Promise<string> {
    try {
      // Use Gemini to get video URL (returns stock video for now)
      const videoUrl = await geminiVideoClient.generateVideo(prompt, state);

      console.log(`✅ Got video URL for ${state}: ${videoUrl}`);

      // Return the direct URL - no need to download stock videos
      // They're already hosted and cached
      return videoUrl;

    } catch (error) {
      console.error('Error generating clip:', error);
      // Return fallback video
      return 'https://cdn.pixabay.com/video/2023/10/23/185693-877062389_large.mp4';
    }
  }

  /**
   * Get a clip from session storage
   */
  async getSessionClip(sessionId: string, clipId: string): Promise<Buffer | null> {
    const clipPath = path.join(this.storageDir, sessionId, `${clipId}.mp4`);

    if (!await this.fileExists(clipPath)) {
      return null;
    }

    return await fs.readFile(clipPath);
  }

  /**
   * Generate cache key for a state
   */
  private generateCacheKey(state: VideoState): string {
    // Simple cache key based on state
    // Could be enhanced with persona ID, variant number, etc.
    return state;
  }

  /**
   * Check if file exists
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Cleanup old session clips (call periodically)
   */
  async cleanupOldSessions(maxAgeMs: number = 24 * 60 * 60 * 1000): Promise<void> {
    try {
      const sessions = await fs.readdir(this.storageDir);
      const now = Date.now();

      for (const sessionId of sessions) {
        const sessionPath = path.join(this.storageDir, sessionId);
        const stats = await fs.stat(sessionPath);

        if (now - stats.mtimeMs > maxAgeMs) {
          await fs.rm(sessionPath, { recursive: true });
          console.log(`🗑️  Cleaned up old session: ${sessionId}`);
        }
      }
    } catch (error) {
      console.error('Error cleaning up sessions:', error);
    }
  }
}

// Export singleton instance
export const clipManager = new ClipManager();
