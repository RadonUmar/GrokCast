'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import PodcastSurface from './PodcastSurface';
import AIVideoSurface from './AIVideoSurface';
import VoiceConsole from './VoiceConsole';
import YouTubeInput from './YouTubeInput';

interface JoeRoganVisionOSProps {
  podcastUrl?: string;
  sessionId: string;
  personaName: string;
  listeningVideoUrl?: string;
  talkingVideoUrl?: string;
}

type AIMode = 'idle' | 'listening' | 'talking';

export default function JoeRoganVisionOS({
  podcastUrl: initialPodcastUrl,
  sessionId,
  personaName,
  listeningVideoUrl: providedListeningUrl,
  talkingVideoUrl: providedTalkingUrl,
}: JoeRoganVisionOSProps) {
  // Video URLs - use provided or default to Joe Rogan
  const listeningVideoUrl = providedListeningUrl || '/clips/JoeListening.mov';
  const talkingVideoUrl = providedTalkingUrl || '/clips/JoeTalking.mov';

  // State
  const [podcastUrl, setPodcastUrl] = useState(initialPodcastUrl || '');
  const [videoId, setVideoId] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(!initialPodcastUrl);
  const [aiMode, setAIMode] = useState<AIMode>('idle');
  const [isPodcastPaused, setIsPodcastPaused] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [captions, setCaptions] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);

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

    // STAY in listening mode while processing
    // setAIMode('talking'); // DON'T switch yet!
    setIsProcessing(true);

    let audioElement: HTMLAudioElement | null = null;

    try {
      // Call new chat API with transcript context
      console.log('🔄 Fetching AI response...');
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: currentTranscript,
          videoId: videoId || undefined,
          timestamp: savedTimestampRef.current,
          sessionId,
          personaName
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ AI response received');

      // Add AI response to captions
      setCaptions(prev => [...prev, data.replyText]);

      // Play audio if available, otherwise use estimated duration
      let duration = data.audioDuration || Math.max(3, data.replyText.length / 15); // ~15 chars per second

      if (data.audioBase64) {
        // Play actual TTS audio
        console.log('🔊 Preparing TTS audio...', data.audioBase64.substring(0, 50));
        console.log('📊 Audio data length:', data.audioBase64.length, 'characters');

        const audio = new Audio(`data:audio/mp3;base64,${data.audioBase64}`);
        audioElement = audio;
        setCurrentAudio(audio);

        // Set volume to max and use Web Audio API for gain boost
        audio.volume = 1.0;

        // Use Web Audio API to amplify volume beyond normal limits
        try {
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          const source = audioContext.createMediaElementSource(audio);
          const gainNode = audioContext.createGain();

          // Boost volume by 2x (adjust this value: 1.0 = normal, 2.0 = double, 3.0 = triple)
          gainNode.gain.value = 2.5;

          source.connect(gainNode);
          gainNode.connect(audioContext.destination);

          console.log('🔊 Audio gain boosted to 2.5x');
        } catch (error) {
          console.warn('Web Audio API not available, using standard volume:', error);
        }

        await new Promise<void>((resolve) => {
          audio.onended = () => {
            console.log('✅ Audio playback ended');
            resolve();
          };
          audio.onerror = (e) => {
            console.error('❌ Audio playback error:', e);
            console.error('❌ Error target:', (e.target as any)?.error);
            resolve();
          };
          audio.onloadeddata = () => {
            console.log('✅ Audio data loaded, duration:', audio.duration);
          };

          // IMPORTANT: Switch to talking mode when audio actually starts playing
          // Add a small delay to ensure smooth transition
          audio.onplay = () => {
            console.log('🎤 Audio started playing - switching to talking mode in 500ms');
            setTimeout(() => {
              setAIMode('talking');
            }, 500); // 500ms delay for smooth transition
          };

          audio.oncanplay = () => {
            console.log('✅ Audio can start playing');
          };

          console.log('▶️ Attempting to play audio...');
          audio.play()
            .then(() => {
              console.log('✅ Audio play() promise resolved');
            })
            .catch((err) => {
              console.error('❌ Audio play() failed:', err);
              console.error('❌ Error name:', err.name);
              console.error('❌ Error message:', err.message);
              // Even if play fails, switch to talking mode so we don't get stuck
              setAIMode('talking');
              resolve();
            });
        });
      } else {
        // Simulate duration if no audio
        console.log('⚠️ No audio data, using simulated duration:', duration);
        // Switch to talking mode immediately if no audio
        setAIMode('talking');
        await new Promise(resolve => setTimeout(resolve, duration * 1000));
      }

    } catch (error) {
      console.error('Failed to get response:', error);
      setCaptions(prev => [...prev, 'Sorry, I encountered an error processing your message.']);
      // Switch to talking mode on error too
      setAIMode('talking');
      await new Promise(resolve => setTimeout(resolve, 3000));
    } finally {
      // Cleanup audio
      if (audioElement) {
        audioElement.pause();
        audioElement = null;
      }
      setCurrentAudio(null);

      // Return to idle and resume podcast
      setAIMode('idle');
      setIsPodcastPaused(false);
      setIsProcessing(false);
      setCurrentTranscript('');
    }
  }, [currentTranscript, sessionId, personaName, videoId]);

  // Handle timestamp updates from podcast
  const handleTimeUpdate = useCallback((time: number) => {
    savedTimestampRef.current = time;
  }, []);

  // Handle video loaded from YouTube input
  const handleVideoLoaded = useCallback((url: string, id: string) => {
    setPodcastUrl(url);
    setVideoId(id);
    setShowUrlInput(false);
    console.log(`✅ Loaded podcast: ${id}`);
  }, []);

  // Handle processing state from YouTube input
  const handleProcessingState = useCallback((processing: boolean) => {
    setIsProcessing(processing);
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
          <div className="flex items-center justify-center gap-4 mb-4">
            <h1 className="text-5xl font-bold bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent">
              GrokCast
            </h1>
            {!showUrlInput && podcastUrl && (
              <button
                onClick={() => setShowUrlInput(true)}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm text-white/80
                         border border-white/20 transition-all duration-200"
              >
                Change Video
              </button>
            )}
          </div>
          <p className="text-white/40 text-sm">Voice-first podcast interaction with {personaName}</p>
          {videoId && !showUrlInput && (
            <p className="text-white/30 text-xs mt-2">Loaded: {videoId}</p>
          )}
        </div>

        {/* YouTube Input - shown when no video is loaded */}
        {showUrlInput && (
          <YouTubeInput
            onVideoLoaded={handleVideoLoaded}
            onProcessing={handleProcessingState}
          />
        )}

        {/* Single center stage - seamlessly switches between podcast and AI */}
        {!showUrlInput && podcastUrl && (
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
        )}

        {/* Voice Console (fixed at bottom) - only show when video is loaded */}
        {!showUrlInput && podcastUrl && (
          <VoiceConsole
            isListening={aiMode === 'listening'}
            isProcessing={isProcessing}
            transcript={currentTranscript}
            onSpacePress={handleSpacePress}
            onSpaceRelease={handleSpaceRelease}
            personaName={personaName}
          />
        )}

        {/* Show instruction text when no video */}
        {!podcastUrl && !showUrlInput && (
          <div className="text-center text-white/60 mt-12">
            <p>Enter a YouTube podcast URL to begin</p>
          </div>
        )}
      </div>

      {/* Ambient particle effects (optional future enhancement) */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Add floating particles here if desired */}
      </div>
    </div>
  );
}
