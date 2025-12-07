import { NextRequest, NextResponse } from 'next/server';
import { clipManager } from '@/app/lib/clip-manager';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string; clipId: string }> }
) {
  try {
    const { sessionId, clipId } = await params;

    console.log(`📹 Serving clip: ${sessionId}/${clipId}`);

    // Get clip from session storage
    const clipBuffer = await clipManager.getSessionClip(sessionId, clipId);

    if (!clipBuffer) {
      return NextResponse.json(
        { error: 'Clip not found' },
        { status: 404 }
      );
    }

    // Return video file
    return new NextResponse(new Uint8Array(clipBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'video/mp4',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });

  } catch (error) {
    console.error('❌ Error serving clip:', error);
    return NextResponse.json(
      { error: 'Failed to serve clip' },
      { status: 500 }
    );
  }
}
