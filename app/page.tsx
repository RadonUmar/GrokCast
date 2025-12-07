'use client';

import { useState } from 'react';
import JoeRoganVisionOS from '@/app/components/visionos/JoeRoganVisionOS';

export default function HomePage() {
  const [sessionId] = useState(() => {
    if (typeof window !== 'undefined') {
      return crypto.randomUUID();
    }
    return 'temp-session';
  });

  return (
    <JoeRoganVisionOS
      podcastUrl="https://www.youtube.com/watch?v=sJ4Ho4ccuFg"
      sessionId={sessionId}
      personaName="Joe Rogan"
    />
  );
}
