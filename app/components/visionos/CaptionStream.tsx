'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

interface Caption {
  id: string;
  text: string;
  timestamp: number;
}

interface CaptionStreamProps {
  captions: string[];
  className?: string;
}

export default function CaptionStream({
  captions,
  className = ''
}: CaptionStreamProps) {
  const [displayCaptions, setDisplayCaptions] = useState<Caption[]>([]);

  useEffect(() => {
    if (captions.length > 0) {
      const newCaption: Caption = {
        id: `${Date.now()}-${Math.random()}`,
        text: captions[captions.length - 1],
        timestamp: Date.now()
      };

      setDisplayCaptions(prev => [...prev, newCaption]);

      // Remove caption after animation completes
      setTimeout(() => {
        setDisplayCaptions(prev => prev.filter(c => c.id !== newCaption.id));
      }, 3000);
    }
  }, [captions]);

  return (
    <div className={`relative ${className}`}>
      <AnimatePresence mode="popLayout">
        {displayCaptions.map((caption, index) => (
          <motion.div
            key={caption.id}
            initial={{ y: 0, opacity: 0, scale: 0.9 }}
            animate={{ y: -80 * index, opacity: 1, scale: 1 }}
            exit={{ y: -120, opacity: 0, scale: 0.8 }}
            transition={{
              duration: 2,
              ease: [0.16, 1, 0.3, 1]
            }}
            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg"
          >
            <div className="vision-glass px-6 py-4 rounded-2xl backdrop-blur-2xl">
              <p className="text-white text-base leading-relaxed text-center">
                {caption.text}
              </p>
            </div>

            {/* Soft glow beneath each caption */}
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-2/3 h-8 bg-white/10 blur-2xl rounded-full" />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
