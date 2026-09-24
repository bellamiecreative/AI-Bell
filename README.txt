AI Bell v7

This version targets older iPhones without WebGPU. It uses Transformers.js with the SmolLM2-135M-Instruct ONNX model on WASM/CPU, using q8 (the recommended default dtype for WASM).

Main fixes:
- No WebGPU required.
- Uses q8 for WASM instead of q4f16.
- Sends chat messages through the Transformers.js chat API directly.
- Non-streaming generation for stability on iPhone Safari.
- Sidebar/menu, chat history, new chat and delete chat.
- Hides <think> blocks.

First load downloads the local model and may take time.
