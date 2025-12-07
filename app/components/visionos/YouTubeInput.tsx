'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

interface YouTubeInputProps {
  onVideoLoaded: (url: string, videoId: string) => void;
  onProcessing: (isProcessing: boolean) => void;
}

export default function YouTubeInput({ onVideoLoaded, onProcessing }: YouTubeInputProps) {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!url.trim()) {
      setError('Please enter a YouTube URL');
      return;
    }

    setIsLoading(true);
    setError('');
    onProcessing(true);

    try {
      setProgress('Downloading podcast audio...');

      const response = await fetch('/api/youtube/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          youtubeUrl: url,
          speakerName: 'Joe Rogan',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process video');
      }

      setProgress('Transcribing audio...');

      const data = await response.json();

      if (data.success) {
        setProgress('Complete!');
        onVideoLoaded(url, data.videoId);

        // Clear after a brief delay
        setTimeout(() => {
          setProgress('');
        }, 2000);
      } else {
        throw new Error(data.error || 'Processing failed');
      }

    } catch (err: any) {
      console.error('Error processing YouTube video:', err);
      setError(err.message || 'Failed to process video. Make sure yt-dlp is installed.');
    } finally {
      setIsLoading(false);
      onProcessing(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-3xl mx-auto mb-8"
    >
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative group">
          {/* Glass background */}
          <div className="absolute inset-0 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10
                          group-hover:bg-white/10 transition-all duration-300" />

          {/* Input container */}
          <div className="relative p-6">
            <label className="block text-white/60 text-sm font-medium mb-3">
              YouTube Podcast URL
            </label>

            <div className="flex gap-3">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                disabled={isLoading}
                className="flex-1 bg-black/30 border border-white/20 rounded-xl px-4 py-3
                         text-white placeholder-white/30
                         focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent
                         disabled:opacity-50 disabled:cursor-not-allowed
                         transition-all duration-200"
              />

              <button
                type="submit"
                disabled={isLoading}
                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600
                         rounded-xl font-semibold text-white
                         hover:from-blue-500 hover:to-purple-500
                         disabled:opacity-50 disabled:cursor-not-allowed
                         transition-all duration-200 transform hover:scale-105
                         shadow-lg shadow-blue-500/25"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Processing...</span>
                  </div>
                ) : (
                  'Load Podcast'
                )}
              </button>
            </div>

            {/* Progress/Error messages */}
            {progress && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 text-sm text-blue-400 flex items-center gap-2"
              >
                <div className="w-4 h-4 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
                {progress}
              </motion.div>
            )}

            {error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2"
              >
                {error}
              </motion.div>
            )}

            {/* Quick load examples */}
            {!isLoading && !progress && (
              <div className="mt-4 flex items-center gap-2 text-xs text-white/40">
                <span>Examples:</span>
                <button
                  type="button"
                  onClick={() => setUrl('https://www.youtube.com/watch?v=sJ4Ho4ccuFg')}
                  className="text-blue-400 hover:text-blue-300 underline"
                >
                  Joe Rogan #2054
                </button>
              </div>
            )}
          </div>
        </div>
      </form>
    </motion.div>
  );
}
