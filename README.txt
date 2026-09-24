AI Bell v5

This version is designed for iPhone browsers without WebGPU. It uses Transformers.js with WASM/CPU and the smaller SmolLM2-135M-Instruct ONNX model in q4f16 format.

The model is downloaded and cached in the browser on first load. It is about 117 MB for the q4f16 model file. Loading can take time on older iPhones.

Changes from v4:
- Much smaller local model to reduce iPhone memory pressure and avoid Safari reloads.
- q4f16 quantization for lower memory use.
- Progress percentage is clamped to 0–100, so it cannot show values like 10000%.
- Working three-line menu/sidebar.
- Chat history remains local.
- No WebGPU required.

Files: index.html, app.js, style.css, manifest.json.
