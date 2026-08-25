# CaptionX Pro

A free, client-side auto-caption editor based on the provided reference screenshot.

## What this version actually does
- Uploads a local video.
- Extracts/decode its audio in the browser.
- Runs Whisper Tiny speech recognition in the browser through Transformers.js.
- Generates caption blocks with timestamps.
- Supports English/Hindi/Urdu selection plus auto detect.
- Has 36+ reference-inspired caption styles.
- Live preview of captions over the video.
- Timeline blocks.
- 9:16, 16:9, 1:1 and 4:5 canvas.
- Exports a caption-burned `.webm` video using browser MediaRecorder.
- No OpenAI key, Render server, or paid API is required.

## Run
Upload these files to a GitHub Pages repository:
- index.html
- style.css
- app.js

Then enable GitHub Pages from Settings -> Pages -> Deploy from branch -> main -> root.

HTTPS is recommended because browser audio APIs and model loading are more reliable on a secure origin.

## First auto-caption run
The first run downloads the Whisper Tiny model from Hugging Face and caches it in the browser. This can take time and uses device RAM/CPU. Later runs are faster.

## Limitations
- Final export is WebM in the browser, not MP4. MP4 export requires a heavier encoding layer or a server-side renderer.
- Very long/large videos may be slow or exceed mobile browser memory.
- Whisper Tiny is intentionally used to keep the free browser workflow practical; a larger model can improve transcription quality but requires more bandwidth/RAM.
