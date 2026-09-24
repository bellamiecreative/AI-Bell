AI Bell v2 — Local AI iPhone app

What changed:
- Real AI is now included using WebLLM.
- The model is Qwen3 0.6B, quantized for browser inference.
- AI runs locally in the browser with WebGPU.
- No OpenAI/Claude/Gemini API key is needed.
- Chat history stays in localStorage on this device.
- Responses stream into the chat.

Important:
1. The first time you press "Load AI", the model must download. This can be a large download and can take several minutes.
2. After the model is cached, later launches should be much faster.
3. This version needs a browser with WebGPU. Safari 26+ on iOS 26 supports WebGPU.
4. The web app should be opened from HTTPS (for example a free static host). Opening the files directly from the Files app may not provide all browser capabilities needed for the local AI.
5. This is a small model intended to make the $0/on-device approach practical. It will not be as capable as ChatGPT's cloud models.

How to use on iPhone:
- Put this folder on a HTTPS static website.
- Open the site in Safari.
- Tap "Load AI" and wait for the first model download.
- Then use the chat normally.
- Safari can add the site to the Home Screen as a web app.

Next improvements:
- better model selection
- export/import chat history
- rename chats
- regenerate response
- stop generation
- better Sorani performance
