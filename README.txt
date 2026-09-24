AI Bell v4

This version is made for iPhones/browsers that do NOT have WebGPU.
It uses Hugging Face Transformers.js with ONNX Runtime WebAssembly (CPU), so WebGPU is not required.

Model:
onxx-community/Qwen2.5-0.5B-Instruct (q8 / WASM)

First AI load downloads the local model. This can be several hundred MB and may take time on a phone.
After loading, the model is cached by the browser when supported.

Important fixes from v3:
- No WebGPU requirement.
- Working three-line menu button (☰) at top-left.
- Working sidebar open/close and scrim.
- Working New Chat, chat history, and Delete current chat.
- Fixed form submit/reload issue.
- Hidden <think> blocks from the visible chat.
- Sorani Kurdish / English / Arabic support prompt.

To update GitHub Pages, replace these files at the repository root:
- index.html
- app.js
- style.css

Keep manifest.json as it is.
