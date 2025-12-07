import { VideoState, StateConfig } from '@/app/types';

// State configuration defining behavior and transitions
export const STATE_CONFIGS: Record<VideoState, StateConfig> = {
  [VideoState.IDLE_LISTENING]: {
    id: VideoState.IDLE_LISTENING,
    duration: 3,
    loop: true,
    allowedTransitions: [
      VideoState.SPEAKING_NEUTRAL,
      VideoState.REACT_SMILE,
      VideoState.THINKING_PAUSE,
      VideoState.REACT_NOD
    ],
    priority: 1,
    promptTemplate: "Photorealistic professional person listening attentively, subtle breathing, minimal movement, maintaining eye contact, neutral warm expression, professional lighting"
  },
  [VideoState.SPEAKING_NEUTRAL]: {
    id: VideoState.SPEAKING_NEUTRAL,
    duration: 2,
    loop: false,
    allowedTransitions: [
      VideoState.IDLE_LISTENING,
      VideoState.SPEAKING_EMPHATIC,
      VideoState.REACT_SMILE
    ],
    priority: 3,
    promptTemplate: "Photorealistic professional person speaking calmly and clearly, natural mouth movements, slight head gestures, warm engaging expression, professional lighting"
  },
  [VideoState.SPEAKING_EMPHATIC]: {
    id: VideoState.SPEAKING_EMPHATIC,
    duration: 2,
    loop: false,
    allowedTransitions: [
      VideoState.SPEAKING_NEUTRAL,
      VideoState.IDLE_LISTENING
    ],
    priority: 4,
    promptTemplate: "Photorealistic professional person speaking with emphasis and confidence, expressive hand gestures, passionate engaged tone, animated facial expressions, professional lighting"
  },
  [VideoState.REACT_SMILE]: {
    id: VideoState.REACT_SMILE,
    duration: 1.5,
    loop: false,
    allowedTransitions: [
      VideoState.IDLE_LISTENING,
      VideoState.SPEAKING_NEUTRAL
    ],
    priority: 2,
    promptTemplate: "Photorealistic professional person smiling warmly and genuinely, eyes crinkling with joy, slight head tilt, friendly approachable expression, professional lighting"
  },
  [VideoState.REACT_NOD]: {
    id: VideoState.REACT_NOD,
    duration: 1,
    loop: false,
    allowedTransitions: [
      VideoState.IDLE_LISTENING,
      VideoState.SPEAKING_NEUTRAL
    ],
    priority: 2,
    promptTemplate: "Photorealistic professional person nodding in agreement, smooth natural head movement, affirming expression, engaged eye contact, professional lighting"
  },
  [VideoState.THINKING_PAUSE]: {
    id: VideoState.THINKING_PAUSE,
    duration: 2,
    loop: false,
    allowedTransitions: [
      VideoState.SPEAKING_NEUTRAL,
      VideoState.IDLE_LISTENING
    ],
    priority: 2,
    promptTemplate: "Photorealistic professional person pausing thoughtfully, eyes moving slightly upward, contemplative focused expression, considering carefully, professional lighting"
  }
};

// State machine logic
export class VideoStateMachine {
  private currentState: VideoState;
  private isTransitioning: boolean = false;

  constructor(initialState: VideoState = VideoState.IDLE_LISTENING) {
    this.currentState = initialState;
  }

  getCurrentState(): VideoState {
    return this.currentState;
  }

  setState(state: VideoState): void {
    this.currentState = state;
  }

  canTransitionTo(targetState: VideoState): boolean {
    const config = STATE_CONFIGS[this.currentState];
    return config.allowedTransitions.includes(targetState);
  }

  selectTransition(targetState: VideoState): {
    fromState: VideoState;
    toState: VideoState;
    transitionType: 'crossfade' | 'snap' | 'bridge';
  } {
    // Direct transition allowed
    if (this.canTransitionTo(targetState)) {
      return {
        fromState: this.currentState,
        toState: targetState,
        transitionType: 'crossfade'
      };
    }

    // Need bridge state (find common allowed transition)
    const bridge = this.findBridgeState(this.currentState, targetState);
    if (bridge) {
      return {
        fromState: this.currentState,
        toState: bridge,
        transitionType: 'snap'
      };
    }

    // Fallback: go to idle first
    return {
      fromState: this.currentState,
      toState: VideoState.IDLE_LISTENING,
      transitionType: 'crossfade'
    };
  }

  private findBridgeState(from: VideoState, to: VideoState): VideoState | null {
    const fromConfig = STATE_CONFIGS[from];
    const toConfig = STATE_CONFIGS[to];

    // Find common allowed transition
    const commonStates = fromConfig.allowedTransitions.filter(s =>
      toConfig.allowedTransitions.includes(s)
    );

    return commonStates[0] || null;
  }

  getConfig(state: VideoState): StateConfig {
    return STATE_CONFIGS[state];
  }
}

// Helper to generate video prompts
export function generateVideoPrompt(state: VideoState, emotionalTone: string): string {
  const config = STATE_CONFIGS[state];
  return `${config.promptTemplate}, ${emotionalTone} tone, 16:9 aspect ratio, high quality, ${config.duration} seconds`;
}
