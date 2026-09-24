AI Bell v3 — Local AI iPhone/Android web app

Fixed in v3:
- Fixed the chat input/button IDs.
- Prevented the composer form from reloading the page when Send is pressed.
- Fixed New Chat/Delete Chat button wiring.
- Keeps chat history in localStorage.
- Uses WebLLM for local on-device AI through WebGPU.

How to update GitHub Pages:
1. Replace index.html and app.js in the AI-Bell repository with the v3 files.
2. Commit changes.
3. Refresh the AI Bell site.
4. Press Load AI. The model should be reused from browser cache after its first download.
5. Send a message. The page should no longer refresh.

Note:
WebLLM requires a browser with WebGPU support. The model itself is cached locally by the browser after download.
