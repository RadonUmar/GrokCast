# Voice Cloning Setup

This directory is for voice cloning audio files used by Grok Voice TTS API.

## How to Add a Voice File

1. **Get an MP3 file** of the person's voice (3-10 seconds is ideal)
   - For Joe Rogan: find a short clip of him speaking
   - The audio should be clear and have minimal background noise
   - Supported formats: `.mp3`, `.m4a`, `.wav`

2. **Name the file** using the persona name:
   - For "Joe Rogan": name it `joe-rogan.mp3`
   - For "Elon Musk": name it `elon-musk.mp3`
   - Use lowercase and hyphens for spaces

3. **Place it in this directory**:
   ```
   public/voices/joe-rogan.mp3
   ```

## Example

If you want Joe Rogan's voice:
1. Find a 5-second clip of Joe Rogan speaking
2. Save it as `joe-rogan.mp3`
3. Put it in `public/voices/joe-rogan.mp3`
4. Restart the dev server
5. The API will automatically use it for voice cloning!

## Supported Filename Formats

The system will try to find files named:
- `joe-rogan.mp3` (preferred)
- `joe-rogan.m4a`
- `joe-rogan.wav`
- `joerogan.mp3`
- `joe_rogan.mp3`

## How It Works

When the chat API receives a request with `personaName: "Joe Rogan"`:
1. It looks for `public/voices/joe-rogan.mp3` (and variations)
2. Converts the audio file to base64
3. Sends it to Grok Voice API in the `voice` parameter
4. Grok clones the voice and generates speech in that voice!

## Tips

- **Audio quality matters**: Clear, high-quality audio = better voice cloning
- **Length**: 3-10 seconds is ideal (the API can handle longer, but it's not needed)
- **Content**: Speech content doesn't matter, just the voice characteristics
- **Format**: MP3 works best, but M4A and WAV are also supported

## Current Status

Currently, if no voice file is found, the system uses Grok's default voice.

To enable Joe Rogan voice cloning:
```bash
# Add joe-rogan.mp3 to this directory, then:
npm run dev
```

You'll see in the server logs:
```
✅ Found voice file: joe-rogan.mp3 (X bytes)
🎤 Using voice cloning for: Joe Rogan
```
