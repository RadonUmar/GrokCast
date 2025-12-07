'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import PodcastSurface from './PodcastSurface';
import AIVideoSurface from './AIVideoSurface';
import VoiceConsole from './VoiceConsole';

interface JoeRoganVisionOSProps {
  podcastUrl: string;
  sessionId: string;
  personaName: string;
}

type AIMode = 'idle' | 'listening' | 'talking';

export default function JoeRoganVisionOS({
  podcastUrl,
  sessionId,
  personaName
}: JoeRoganVisionOSProps) {
  // Video URLs
  const listeningVideoUrl = '/clips/JoeListening.mov';
  const talkingVideoUrl = '/clips/JoeTalking.mov';

  // State
  const [aiMode, setAIMode] = useState<AIMode>('idle');
  const [isPodcastPaused, setIsPodcastPaused] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [captions, setCaptions] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Refs
  const recognitionRef = useRef<any>(null);
  const savedTimestampRef = useRef(0);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setCurrentTranscript(transcript);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // Handle space press - start listening
  const handleSpacePress = useCallback(() => {
    setAIMode('listening');
    setIsPodcastPaused(true);
    setCurrentTranscript('');

    // Start speech recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error('Failed to start recognition:', error);
      }
    }
  }, []);

  // Handle space release - process and respond
  const handleSpaceRelease = useCallback(async () => {
    // Stop listening
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    if (!currentTranscript.trim()) {
      // No transcript, go back to idle
      setAIMode('idle');
      setIsPodcastPaused(false);
      return;
    }

    // Switch to talking mode
    setAIMode('talking');
    setIsProcessing(true);

    try {
      // Call API to get response
      const response = await fetch('/api/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: currentTranscript,
          conversationHistory: [],
          currentState: 'speaking_neutral',
          sessionId,
          personaName
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const data = await response.json();

      // Add AI response to captions
      setCaptions(prev => [...prev, data.replyText]);

      // Wait for response to "play" (simulate TTS duration)
      const responseLength = data.replyText.length;
      const estimatedDuration = Math.max(3000, responseLength * 50); // ~50ms per character minimum

      await new Promise(resolve => setTimeout(resolve, estimatedDuration));

    } catch (error) {
      console.error('Failed to get response:', error);
      setCaptions(prev => [...prev, 'Sorry, I encountered an error processing your message.']);
      await new Promise(resolve => setTimeout(resolve, 3000));
    } finally {
      // Return to idle and resume podcast
      setAIMode('idle');
      setIsPodcastPaused(false);
      setIsProcessing(false);
      setCurrentTranscript('');
    }
  }, [currentTranscript, sessionId, personaName]);

  // Handle timestamp updates from podcast
  const handleTimeUpdate = useCallback((time: number) => {
    savedTimestampRef.current = time;
  }, []);

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-900 via-black to-black relative overflow-hidden">
      {/* Deep space background effects */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl animate-pulse-glow" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: '1s' }} />
      </div>

      {/* Subtle grid overlay */}
      {/* <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-5" /> */}

      {/* Main content container */}
      <div className="relative container mx-auto px-8 py-12 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent mb-4">
            GrokCast VisionOS
          </h1>
          <p className="text-white/40 text-sm">Voice-first podcast interaction with Joe Rogan</p>
        </div>

        {/* Single center stage - seamlessly switches between podcast and AI */}
        <div className="max-w-5xl mx-auto">
          <div className="relative">
            {/* Podcast Surface - visible when aiMode is 'idle' */}
            <div
              className={`transition-opacity duration-500 ${
                aiMode === 'idle' ? 'opacity-100 relative z-10' : 'opacity-0 absolute inset-0 z-0 pointer-events-none'
              }`}
            >
              <PodcastSurface
                youtubeUrl={podcastUrl}
                isPaused={isPodcastPaused}
                onTimeUpdate={handleTimeUpdate}
              />
            </div>

            {/* AI Video Surface - visible when aiMode is 'listening' or 'talking' */}
            <div
              className={`transition-opacity duration-500 ${
                aiMode !== 'idle' ? 'opacity-100 relative z-10' : 'opacity-0 absolute inset-0 z-0 pointer-events-none'
              }`}
            >
              <AIVideoSurface
                mode={aiMode}
                listeningVideoUrl={listeningVideoUrl}
                talkingVideoUrl={talkingVideoUrl}
                captions={captions}
              />
            </div>
          </div>
        </div>

        {/* Voice Console (fixed at bottom) */}
        <VoiceConsole
          isListening={aiMode === 'listening'}
          isProcessing={isProcessing}
          transcript={currentTranscript}
          onSpacePress={handleSpacePress}
          onSpaceRelease={handleSpaceRelease}
        />
      </div>

      {/* Ambient particle effects (optional future enhancement) */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Add floating particles here if desired */}
      </div>
    </div>
  );
}
