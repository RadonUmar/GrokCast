'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

type AIMode = 'idle' | 'listening' | 'talking';

interface AIVideoSurfaceProps {
  mode: AIMode;
  listeningVideoUrl: string;
  talkingVideoUrl: string;
  captions: string[];
  onCaptionComplete?: () => void;
}

export default function AIVideoSurface({
  mode,
  listeningVideoUrl,
  talkingVideoUrl,
  captions,
  onCaptionComplete
}: AIVideoSurfaceProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentCaption, setCurrentCaption] = useState<string | null>(null);

  // Switch video based on mode
  useEffect(() => {
    if (!videoRef.current) return;

    if (mode === 'listening') {
      videoRef.current.src = listeningVideoUrl;
      videoRef.current.play();
    } else if (mode === 'talking') {
      videoRef.current.src = talkingVideoUrl;
      videoRef.current.play();
    } else {
      videoRef.current.pause();
    }
  }, [mode, listeningVideoUrl, talkingVideoUrl]);

  // Update captions
  useEffect(() => {
    if (captions.length > 0) {
      setCurrentCaption(captions[captions.length - 1]);
    }
  }, [captions]);

  const isActive = mode !== 'idle';

  return (
    <motion.div
      className="relative"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Title pill */}
      <motion.div
        className="absolute -top-12 left-1/2 -translate-x-1/2 z-20"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.6 }}
      >
        <div className="vision-glass px-6 py-2 rounded-full flex items-center gap-3">
          <div
            className={`w-2 h-2 rounded-full transition-colors duration-500 ${
              mode === 'listening' ? 'bg-yellow-500 animate-pulse' :
              mode === 'talking' ? 'bg-green-500 animate-pulse' :
              'bg-white/30'
            }`}
          />
          <span className="text-white/80 text-sm font-medium">
            {mode === 'listening' ? 'Joe is Listening' :
             mode === 'talking' ? 'Joe is Responding' :
             'Standby'}
          </span>
        </div>
      </motion.div>

      {/* Main surface */}
      <motion.div
        className={`relative vision-glass rounded-3xl overflow-hidden transition-all duration-500 ${
          mode === 'talking' ? 'vision-glow-warm' : ''
        }`}
        animate={{
          opacity: isActive ? 1 : 0.2,
          y: isActive ? -4 : 0,
          scale: isActive ? 1 : 0.98
        }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      >
        {/* Video container - landscape aspect ratio to match podcast */}
        <div className="aspect-video relative w-full">
          <video
            ref={videoRef}
            className="w-full h-full object-cover rounded-3xl"
            loop
            playsInline
            muted
          />

          {/* Gradient overlays */}
          <div className="absolute inset-0 pointer-events-none rounded-3xl">
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20" />
          </div>

          {/* Caption stream inside the video */}
          <div className="absolute bottom-0 left-0 right-0 h-1/3 pointer-events-none">
            <AnimatePresence mode="popLayout">
              {currentCaption && (
                <motion.div
                  key={currentCaption}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -60, opacity: 0 }}
                  transition={{ duration: 2, ease: 'easeOut' }}
                  className="absolute bottom-8 left-4 right-4"
                >
                  <div className="vision-glass px-4 py-3 rounded-2xl">
                    <p className="text-white text-sm leading-relaxed">
                      {currentCaption}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Active border glow */}
        {isActive && (
          <div className="absolute inset-0 rounded-3xl border border-white/20 pointer-events-none" />
        )}
      </motion.div>

      {/* Soft glow beneath */}
      <div
        className={`absolute -bottom-8 left-1/2 -translate-x-1/2 w-3/4 h-16 blur-3xl rounded-full transition-all duration-500 ${
          mode === 'talking' ? 'bg-orange-500/30' :
          mode === 'listening' ? 'bg-yellow-500/20' :
          'bg-white/5'
        }`}
      />
    </motion.div>
  );
}
