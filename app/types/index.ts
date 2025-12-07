// Core video state enum
export enum VideoState {
  IDLE_LISTENING = "idle_listening",
  SPEAKING_NEUTRAL = "speaking_neutral",
  SPEAKING_EMPHATIC = "speaking_emphatic",
  REACT_SMILE = "react_smile",
  REACT_NOD = "react_nod",
  THINKING_PAUSE = "thinking_pause"
}

// Configuration for each video state
export interface StateConfig {
  id: VideoState;
  duration: number;           // Target duration in seconds
  loop: boolean;              // Can this state loop?
  allowedTransitions: VideoState[];
  priority: number;           // For conflict resolution
  promptTemplate: string;     // Base prompt for video generation
}

// Grok chat response structure
export interface GrokChatResponse {
  replyText: string;
  videoState: VideoState;
  emotionalTone: string;
}

// Clip metadata
export interface ClipMetadata {
  url: string;
  duration: number;
  wasGenerated: boolean;
  state: VideoState;
}

// API response types
export interface RespondAPIResponse {
  replyText: string;
  videoState: VideoState;
  clipUrl: string;
  clipDuration: number;
  needsGeneration: boolean;
  metadata: {
    emotion: string;
    promptUsed: string;
  };
}

export interface RespondAPIRequest {
  message: string;
  conversationHistory: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  currentState: VideoState;
  sessionId: string;
  personaName?: string;
}

// Message type for chat
export interface Message {
  role: 'user' | 'assistant';
  content: string;
}
