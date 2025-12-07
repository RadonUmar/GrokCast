'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Mic } from 'lucide-react';

interface VoiceConsoleProps {
  isListening: boolean;
  isProcessing: boolean;
  transcript: string;
  onSpacePress: () => void;
  onSpaceRelease: () => void;
}

export default function VoiceConsole({
  isListening,
  isProcessing,
  transcript,
  onSpacePress,
  onSpaceRelease
}: VoiceConsoleProps) {
  const [transcriptWords, setTranscriptWords] = useState<string[]>([]);

  // Handle spacebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isListening && !isProcessing) {
        e.preventDefault();
        onSpacePress();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' && isListening) {
        e.preventDefault();
        onSpaceRelease();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isListening, isProcessing, onSpacePress, onSpaceRelease]);

  // Update transcript words
  useEffect(() => {
    if (transcript) {
      setTranscriptWords(transcript.split(' '));
    } else {
      setTranscriptWords([]);
    }
  }, [transcript]);

  return (
    <motion.div
      className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Floating transcript vapor trails */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-8 w-96 h-64 pointer-events-none">
        <AnimatePresence mode="popLayout">
          {transcriptWords.map((word, index) => (
            <motion.div
              key={`${word}-${index}`}
              initial={{ y: 0, opacity: 1, scale: 1 }}
              animate={{ y: -60, opacity: 0, scale: 0.8 }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 2,
                delay: index * 0.1,
                ease: 'easeOut'
              }}
              className="absolute left-1/2 -translate-x-1/2"
              style={{ bottom: `${index * 8}px` }}
            >
              <div className="vision-glass px-3 py-1.5 rounded-full">
                <span className="text-white/90 text-sm font-medium">{word}</span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Main circular console */}
      <motion.div
        className="relative"
        animate={{
          scale: isListening ? 1.05 : 1
        }}
        transition={{ duration: 0.3 }}
      >
        {/* Radiating ripples when active */}
        {isListening && (
          <>
            <div className="absolute inset-0 rounded-full border-2 border-white/40 animate-ripple" />
            <div className="absolute inset-0 rounded-full border-2 border-white/30 animate-ripple" style={{ animationDelay: '0.5s' }} />
            <div className="absolute inset-0 rounded-full border-2 border-white/20 animate-ripple" style={{ animationDelay: '1s' }} />
          </>
        )}

        {/* Main console circle */}
        <div className={`relative w-40 h-40 rounded-full vision-glass transition-all duration-500 ${
          isListening ? 'vision-glow' :
          isProcessing ? 'vision-glow-warm' :
          ''
        }`}>
          {/* Pulsing glow */}
          <div className={`absolute inset-0 rounded-full transition-all duration-500 ${
            isListening ? 'bg-blue-500/20 animate-pulse' :
            isProcessing ? 'bg-orange-500/20 animate-pulse' :
            'bg-white/5'
          }`} />

          {/* Icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              animate={{
                scale: isListening ? [1, 1.2, 1] : 1
              }}
              transition={{
                duration: 1,
                repeat: isListening ? Infinity : 0,
                ease: 'easeInOut'
              }}
            >
              <Mic className={`w-12 h-12 transition-colors duration-500 ${
                isListening ? 'text-blue-400' :
                isProcessing ? 'text-orange-400' :
                'text-white/40'
              }`} />
            </motion.div>
          </div>

          {/* Instruction text */}
          <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 whitespace-nowrap">
            <motion.p
              className="text-white/60 text-sm font-medium"
              animate={{
                opacity: isListening ? 0 : 1
              }}
            >
              {isProcessing ? 'Processing...' : 'Press and hold SPACE to speak'}
            </motion.p>
          </div>

          {/* Status text when active */}
          {isListening && (
            <motion.div
              className="absolute -bottom-16 left-1/2 -translate-x-1/2 whitespace-nowrap"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <p className="text-blue-400 text-sm font-semibold">Listening...</p>
            </motion.div>
          )}
        </div>

        {/* Outer glow ring */}
        <div className={`absolute -inset-4 rounded-full blur-2xl transition-all duration-500 ${
          isListening ? 'bg-blue-500/30' :
          isProcessing ? 'bg-orange-500/30' :
          'bg-white/10'
        }`} />
      </motion.div>
    </motion.div>
  );
}
