'use client';

import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

interface PodcastSurfaceProps {
  youtubeUrl: string;
  isPaused: boolean;
  onTimeUpdate?: (time: number) => void;
  onPause?: () => void;
  onPlay?: () => void;
}

export default function PodcastSurface({
  youtubeUrl,
  isPaused,
  onTimeUpdate,
  onPause,
  onPlay
}: PodcastSurfaceProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [showRipple, setShowRipple] = useState(false);

  // Extract YouTube video ID and timestamp
  const getYouTubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  const getStartTime = (url: string) => {
    const timeMatch = url.match(/[?&]t=(\d+)/);
    return timeMatch ? parseInt(timeMatch[1]) : 0;
  };

  const videoId = getYouTubeId(youtubeUrl);
  const startTime = getStartTime(youtubeUrl);

  // Handle iframe messages for time tracking
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== 'https://www.youtube.com') return;

      try {
        const data = JSON.parse(event.data);
        if (data.event === 'infoDelivery' && data.info?.currentTime) {
          onTimeUpdate?.(data.info.currentTime);
        }
      } catch (e) {
        // Ignore parsing errors
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onTimeUpdate]);

  // Control YouTube playback
  useEffect(() => {
    if (!iframeRef.current) return;

    const command = isPaused ? 'pauseVideo' : 'playVideo';
    iframeRef.current.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func: command, args: [] }),
      'https://www.youtube.com'
    );

    if (isPaused) {
      setShowRipple(true);
      onPause?.();
      setTimeout(() => setShowRipple(false), 1500);
    } else {
      onPlay?.();
    }
  }, [isPaused, onPause, onPlay]);

  if (!videoId) {
    return (
      <div className="vision-glass rounded-3xl p-8 text-center">
        <p className="text-white/60">Invalid YouTube URL</p>
      </div>
    );
  }

  return (
    <motion.div
      className="relative"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Floating metadata pill */}
      <motion.div
        className="absolute -top-12 left-1/2 -translate-x-1/2 z-20"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.6 }}
      >
        <div className="vision-glass px-6 py-2 rounded-full flex items-center gap-3">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          <span className="text-white/80 text-sm font-medium">Joe Rogan Experience</span>
        </div>
      </motion.div>

      {/* Main surface */}
      <motion.div
        className="relative vision-glass rounded-3xl overflow-hidden vision-glow"
        whileHover={{ y: -4, scale: 1.01 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        animate={{ opacity: isPaused ? 0.6 : 1 }}
      >
        {/* Ripple effect overlay */}
        {showRipple && (
          <div className="absolute inset-0 z-10 pointer-events-none">
            <div className="absolute inset-0 rounded-3xl border-2 border-white/30 animate-ripple" />
            <div className="absolute inset-0 rounded-3xl border-2 border-white/20 animate-ripple" style={{ animationDelay: '0.3s' }} />
          </div>
        )}

        {/* YouTube iframe */}
        <div className="aspect-video relative">
          <iframe
            ref={iframeRef}
            src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1&autoplay=1&controls=1&modestbranding=1${startTime > 0 ? `&start=${startTime}` : ''}`}
            className="w-full h-full rounded-3xl"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>

        {/* Gradient overlay on edges */}
        <div className="absolute inset-0 rounded-3xl pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-transparent" />
        </div>
      </motion.div>

      {/* Soft glow beneath */}
      <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-3/4 h-16 bg-blue-500/20 blur-3xl rounded-full" />
    </motion.div>
  );
}
