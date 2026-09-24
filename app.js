// AI Bell v4 — iPhone CPU/WASM local AI + working menu
import { pipeline, TextStreamer } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/+esm";

const MODEL_ID = "onnx-community/Qwen2.5-0.5B-Instruct";
const STORAGE_KEY = "ai-bell-chats-v4";

let generator = null;
let loading = false;
let generating = false;
let chats = loadChats();
let activeChatId = null;

const $ = (id) => document.getElementById(id);

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function loadChats() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveChats() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
  } catch (e) {
    console.warn("Could not save chat history:", e);
  }
}

function currentChat() {
  return chats.find((c) => c.id === activeChatId);
}

function ensureChat() {
  if (!activeChatId || !currentChat()) {
    const chat = { id: uid(), title: "New chat", messages: [], updatedAt: Date.now() };
    chats.unshift(chat);
    activeChatId = chat.id;
    saveChats();
  }
}

function setStatus(text, type = "") {
  const el = $("ai-status");
  if (!el) return;
  el.textContent = text;
  el.className = "ai-status " + type;
}

function renderChats() {
  const list = $("chat-list");
  if (!list) return;
  list.innerHTML = "";

  for (const chat of chats) {
    const row = document.createElement("button");
    row.className = "chat-item" + (chat.id === activeChatId ? " active" : "");
    row.type = "button";
    row.textContent = chat.title || "New chat";
    row.onclick = () => {
      activeChatId = chat.id;
      closeSidebar();
      renderAll();
    };
    list.appendChild(row);
  }
}

function cleanAnswer(text) {
  return String(text || "")
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/<think>[\s\S]*$/gi, "")
    .trim();
}

function renderMessages() {
  const box = $("messages");
  if (!box) return;
  box.innerHTML = "";
  const chat = currentChat();

  if (!chat || chat.messages.length === 0) {
    const welcome = document.createElement("div");
    welcome.className = "welcome";
    welcome.innerHTML = `
      <div class="welcome-logo">AI</div>
      <h1>How can I help?</h1>
      <p>AI Bell runs a small AI model locally on this device.</p>
      <div class="local-note">🔒 Your messages stay on this device.</div>
    `;
    box.appendChild(welcome);
    return;
  }

  for (const m of chat.messages) {
    const row = document.createElement("div");
    row.className = "message " + m.role;
    const bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.textContent = m.role === "assistant" ? cleanAnswer(m.content) : m.content;
    row.appendChild(bubble);
    box.appendChild(row);
  }

  box.scrollTop = box.scrollHeight;
}

function updateModelUI() {
  const btn = $("load-ai");
  if (!btn) return;

  if (generator) {
    btn.textContent = "AI Ready";
    btn.disabled = false;
    setStatus("Local AI ready", "ready");
  } else if (loading) {
    btn.textContent = "Loading AI…";
    btn.disabled = true;
  } else {
    btn.textContent = "Load AI";
    btn.disabled = false;
    if (!$("ai-status").classList.contains("error")) setStatus("AI not loaded", "");
  }
}

async function loadAI() {
  if (generator || loading) return;

  loading = true;
  updateModelUI();
  setStatus("Downloading local AI for the first time…", "");

  try {
    // Transformers.js uses WebAssembly/CPU by default. This path does NOT require WebGPU.
    generator = await pipeline("text-generation", MODEL_ID, {
      device: "wasm",
      dtype: "q8",
      progress_callback: (p) => {
        if (p && typeof p.progress === "number") {
          const pct = Math.round(p.progress * 100);
          setStatus(`Loading local AI… ${pct}%`, "");
        } else if (p?.status === "progress" && typeof p.progress === "number") {
          setStatus(`Loading local AI… ${Math.round(p.progress)}%`, "");
        } else if (p?.status === "initiate") {
          setStatus("Preparing local AI…", "");
        }
      }
    });

    setStatus("Local AI ready", "ready");
  } catch (err) {
    console.error("WASM AI load error:", err);
    generator = null;
    setStatus("AI could not load. Try Load AI again.", "error");
  } finally {
    loading = false;
    updateModelUI();
  }
}

function makeSystemPrompt() {
  return `You are AI Bell, a helpful private AI assistant.
Answer clearly and naturally.
The user may write Sorani Kurdish, Kurmanji Kurdish, Arabic, or English.
If the user writes Sorani Kurdish, answer in Sorani Kurdish when possible.
Do not reveal hidden reasoning or write <think> blocks.
Keep answers useful and concise unless the user asks for detail.`;
}

async function sendMessage() {
  if (generating) return;

  const input = $("message-input");
  const text = (input?.value || "").trim();
  if (!text) return;

  ensureChat();

  if (!generator) {
    await loadAI();
    if (!generator) return;
  }

  const chat = currentChat();
  input.value = "";
  input.style.height = "auto";

  chat.messages.push({ role: "user", content: text });
  if (chat.title === "New chat") {
    chat.title = text.slice(0, 32) + (text.length > 32 ? "…" : "");
  }
  chat.updatedAt = Date.now();
  saveChats();

  chat.messages.push({ role: "assistant", content: "" });
  renderAll();

  const history = [
    { role: "system", content: makeSystemPrompt() },
    ...chat.messages.slice(0, -1)
  ];

  generating = true;
  setStatus("AI is thinking…", "ready");
  $("send-btn").disabled = true;

  try {
    let answer = "";
    const streamer = new TextStreamer(generator.tokenizer, {
      skip_prompt: true,
      skip_special_tokens: true,
      callback_function: (text) => {
        answer += text;
        chat.messages[chat.messages.length - 1].content = cleanAnswer(answer);
        renderMessages();
        saveChats();
      }
    });

    const output = await generator(history, {
      max_new_tokens: 256,
      do_sample: true,
      temperature: 0.7,
      top_p: 0.9,
      repetition_penalty: 1.05,
      streamer
    });

    // Some runtimes may not emit through the callback; use final output as fallback.
    const finalText = output?.[0]?.generated_text;
    if (Array.isArray(finalText)) {
      const last = finalText[finalText.length - 1]?.content;
      if (last) chat.messages[chat.messages.length - 1].content = cleanAnswer(last);
    } else if (typeof finalText === "string" && finalText.trim()) {
      chat.messages[chat.messages.length - 1].content = cleanAnswer(finalText);
    }

    if (!chat.messages[chat.messages.length - 1].content.trim()) {
      chat.messages[chat.messages.length - 1].content = "I’m sorry, I couldn’t generate a response. Please try again.";
    }
  } catch (err) {
    console.error("Generation error:", err);
    chat.messages[chat.messages.length - 1].content = "Sorry — the local AI stopped. Please try again.";
  } finally {
    generating = false;
    $("send-btn").disabled = false;
    saveChats();
    renderMessages();
    setStatus("Local AI ready", "ready");
  }
}

function newChat() {
  const chat = { id: uid(), title: "New chat", messages: [], updatedAt: Date.now() };
  chats.unshift(chat);
  activeChatId = chat.id;
  saveChats();
  closeSidebar();
  renderAll();
  $("message-input")?.focus();
}

function deleteCurrentChat() {
  if (!activeChatId) return;
  chats = chats.filter((c) => c.id !== activeChatId);
  activeChatId = chats[0]?.id || null;
  saveChats();
  ensureChat();
  renderAll();
}

function openSidebar() {
  $("sidebar")?.classList.add("open");
  $("scrim")?.classList.add("show");
  $("scrim")?.setAttribute("aria-hidden", "false");
}

function closeSidebar() {
  $("sidebar")?.classList.remove("open");
  $("scrim")?.classList.remove("show");
  $("scrim")?.setAttribute("aria-hidden", "true");
}

function autoResize() {
  const input = $("message-input");
  if (!input) return;
  input.style.height = "auto";
  input.style.height = Math.min(input.scrollHeight, 130) + "px";
}

document.addEventListener("DOMContentLoaded", () => {
  activeChatId = chats[0]?.id || null;
  ensureChat();

  $("openSidebar")?.addEventListener("click", openSidebar);
  $("closeSidebar")?.addEventListener("click", closeSidebar);
  $("scrim")?.addEventListener("click", closeSidebar);
  $("new-chat")?.addEventListener("click", newChat);
  $("new-chat-top")?.addEventListener("click", newChat);
  $("delete-chat")?.addEventListener("click", deleteCurrentChat);
  $("load-ai")?.addEventListener("click", loadAI);

  $("composer")?.addEventListener("submit", (e) => {
    e.preventDefault();
    e.stopPropagation();
    sendMessage();
  });

  $("message-input")?.addEventListener("input", autoResize);
  $("message-input")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      sendMessage();
    }
  });

  renderAll();
});
