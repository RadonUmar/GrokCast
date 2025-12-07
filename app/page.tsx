'use client';

import { useState } from 'react';
import JoeRoganVisionOS from '@/app/components/visionos/JoeRoganVisionOS';

interface Persona {
  name: string;
  listeningVideo: string;
  talkingVideo: string;
  exampleUrl: string;
  description: string;
  color: string;
}

const PERSONAS: Persona[] = [
  {
    name: 'Joe Rogan',
    listeningVideo: '/clips/JoeListening.mov',
    talkingVideo: '/clips/JoeTalking.mov',
    exampleUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    description: 'Podcast host & comedian',
    color: 'from-red-500 to-orange-500',
  },
  {
    name: 'Elon Musk',
    listeningVideo: '/clips/ElonListening.mov',
    talkingVideo: '/clips/ElonSpeaking.mov',
    exampleUrl: 'https://www.youtube.com/watch?v=sSOxPJD-VNo&t=480s',
    description: 'CEO of Tesla & SpaceX',
    color: 'from-blue-500 to-purple-500',
  },
];

export default function HomePage() {
  const [sessionId] = useState(() => {
    if (typeof window !== 'undefined') {
      return crypto.randomUUID();
    }
    return 'temp-session';
  });

  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);

  if (!selectedPersona) {
    return (
      <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-900 via-black to-black relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl animate-pulse-glow" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: '1s' }} />
        </div>

        <div className="relative container mx-auto px-8 py-12 max-w-7xl">
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="text-6xl font-bold bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent mb-4">
              GrokCast
            </h1>
            <p className="text-white/60 text-lg">Choose a persona to interact with your podcast</p>
          </div>

          {/* Persona Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {PERSONAS.map((persona) => (
              <button
                key={persona.name}
                onClick={() => setSelectedPersona(persona)}
                className="group relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8
                           hover:bg-white/10 hover:border-white/20 transition-all duration-300
                           hover:scale-105 hover:shadow-2xl"
              >
                {/* Gradient overlay */}
                <div className={`absolute inset-0 bg-gradient-to-br ${persona.color} opacity-0 group-hover:opacity-10 rounded-2xl transition-opacity`} />

                <div className="relative">
                  <h2 className="text-3xl font-bold text-white mb-2">{persona.name}</h2>
                  <p className="text-white/60 mb-4">{persona.description}</p>

                  <div className="flex items-center gap-2 text-sm text-white/40 mb-4">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                      <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
                    </svg>
                    <span>Example video included</span>
                  </div>

                  <div className={`inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r ${persona.color} rounded-lg text-white font-medium`}>
                    Start Session
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Info section */}
          <div className="mt-16 text-center">
            <p className="text-white/40 text-sm">
              Press <kbd className="px-2 py-1 bg-white/10 rounded border border-white/20">Space</kbd> to ask questions during the podcast
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Back button */}
      <button
        onClick={() => setSelectedPersona(null)}
        className="fixed top-4 left-4 z-50 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white/80
                   border border-white/20 transition-all duration-200 flex items-center gap-2"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Change Persona
      </button>

      <JoeRoganVisionOS
        podcastUrl={selectedPersona.exampleUrl}
        sessionId={sessionId}
        personaName={selectedPersona.name}
        listeningVideoUrl={selectedPersona.listeningVideo}
        talkingVideoUrl={selectedPersona.talkingVideo}
      />
    </>
  );
}
