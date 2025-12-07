# 🎙️ Joe Rogan Interactive Video Player Guide

## Overview
The app now features a special interactive video player mode for **Joe Rogan** that lets you interrupt a podcast video and have a conversation with Joe!

## How It Works

### 1. Select Joe Rogan
When you open the app, select "Joe Rogan" from the persona list.

### 2. Upload Joe's Videos
You'll see two upload buttons:
- **Upload Joe Looking** - Upload `JoeCameraLooking.mp4` (Joe looking at camera naturally)
- **Upload Joe Talking** - Upload `JoeCameraTalking.mp4` (Joe speaking at camera)

### 3. Interactive Playback Flow

#### Default State: Podcast Playing
- The podcast video plays normally from the YouTube URL
- Audio is active, video is visible

#### Press SPACE to Activate Mic
1. **Press and HOLD spacebar**
2. Podcast pauses and saves timestamp
3. Video switches to "Joe Looking" mode
4. Joe appears to look at you while you speak
5. Status shows "Joe is Listening"

#### Release SPACE When Done Speaking
1. **Release spacebar** when you finish talking
2. Video switches to "Joe Talking" mode
3. App waits for AI response (simulated 3 seconds currently)
4. Status shows "Joe is Responding"

#### Auto-Resume
1. After AI response completes
2. Video switches back to podcast
3. Playback resumes from saved timestamp
4. Everything continues seamlessly

## Technical Details

### Video Transitions
- **Podcast → Looking**: Triggered by spacebar press
- **Looking → Talking**: Triggered by spacebar release
- **Talking → Podcast**: Triggered after AI response completes
- All transitions use smooth 500ms opacity fades

### Timestamp Management
- Current playback position is saved when pausing
- Resumed from exact same position
- No audio/video sync issues

### Status Indicators
- **Blue dot** = Podcast Playing
- **Yellow dot** = Joe is Listening (you're speaking)
- **Green dot** = Joe is Responding (AI processing)

## File Requirements

### JoeCameraLooking.mp4
- Joe looking at camera naturally
- No speaking
- Should loop seamlessly
- Recommended: 5-10 seconds

### JoeCameraTalking.mp4
- Joe speaking at camera
- Can be him nodding, gesturing
- Should loop seamlessly
- Recommended: 5-10 seconds

### Podcast URL
Currently set to a placeholder YouTube URL. Update in `app/page.tsx`:
```typescript
<InteractiveVideoPlayer
  podcastUrl="YOUR_YOUTUBE_URL_HERE"
  personaName={personaName}
  ...
/>
```

## Future Enhancements

### Already Built:
- ✅ Spacebar activation
- ✅ Seamless video transitions
- ✅ Timestamp preservation
- ✅ Video upload interface
- ✅ Status indicators

### To Add:
- [ ] Real speech-to-text integration
- [ ] AI response integration (currently simulated)
- [ ] YouTube iframe support for better podcast playback
- [ ] Voice activity detection (auto-detect when you stop speaking)
- [ ] Multiple podcast URL selection
- [ ] Save uploaded videos to localStorage

## Usage Example

1. Open app → Select "Joe Rogan"
2. Upload both Joe videos
3. Podcast starts playing
4. **Press and hold SPACE** → Joe looks at you
5. Speak your question
6. **Release SPACE** → Joe responds (simulated)
7. Podcast auto-resumes
8. Repeat!

## Notes

- Works only when "Joe Rogan" persona is selected
- Other personas use the image-based system
- You must upload both videos before spacebar interaction works
- The app prevents spacebar from triggering when videos aren't uploaded

---

Built with Next.js, TypeScript, and seamless video transitions! 🚀
