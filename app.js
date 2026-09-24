// AI Bell v2 — real local AI with WebLLM
// The model runs in the browser on the iPhone; no API key is used.

import { CreateMLCEngine } from "https://esm.run/@mlc-ai/web-llm";

const MODEL_ID = "Qwen3-0.6B-q4f16_1-MLC";
const STORAGE_KEY = "ai-bell-chats-v2";
const MODEL_STATE_KEY = "ai-bell-model-state-v2";

let engine = null;
let loading = false;
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
  localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
}

function currentChat() {
  return chats.find(c => c.id === activeChatId);
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
    row.textContent = chat.title || "New chat";
    row.onclick = () => {
      activeChatId = chat.id;
      renderAll();
    };
    list.appendChild(row);
  }
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
      <p>AI Bell runs a small AI model locally in your browser.</p>
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
    bubble.textContent = m.content;
    row.appendChild(bubble);
    box.appendChild(row);
  }
  box.scrollTop = box.scrollHeight;
}

function renderAll() {
  ensureChat();
  renderChats();
  renderMessages();
  updateModelUI();
}

function updateModelUI() {
  const btn = $("load-ai");
  if (!btn) return;
  if (engine) {
    btn.textContent = "AI Ready";
    btn.disabled = false;
    setStatus("Local AI ready", "ready");
  } else if (loading) {
    btn.textContent = "Loading AI…";
    btn.disabled = true;
  } else {
    btn.textContent = "Load AI";
    btn.disabled = false;
    setStatus("AI not loaded", "");
  }
}

async function loadAI() {
  if (engine || loading) return;
  if (!("gpu" in navigator)) {
    setStatus("WebGPU is not available. Update iPhone/iOS or try Safari 26+.", "error");
    return;
  }

  loading = true;
  updateModelUI();
  setStatus("Downloading the AI model for the first time…", "");

  try {
    engine = await CreateMLCEngine(MODEL_ID, {
      initProgressCallback: (p) => {
        if (p && typeof p.progress === "number") {
          const pct = Math.round(p.progress * 100);
          setStatus(`Loading local AI… ${pct}%`, "");
        } else if (p?.text) {
          setStatus(p.text, "");
        }
      }
    });

    localStorage.setItem(MODEL_STATE_KEY, "ready");
    setStatus("Local AI ready", "ready");
  } catch (err) {
    console.error(err);
    engine = null;
    setStatus("AI could not load on this device/browser. Try Safari 26+ and reload.", "error");
  } finally {
    loading = false;
    updateModelUI();
  }
}

function makeSystemPrompt() {
  return `You are AI Bell, a helpful private AI assistant.
Answer clearly and naturally. The user may write Kurdish Sorani, Kurdish Kurmanji, Arabic, or English.
If the user writes in Sorani Kurdish, answer in Sorani Kurdish when possible.
Do not mention that you are running in a browser unless asked.`;
}

async function sendMessage() {
  const input = $("message-input");
  const text = (input?.value || "").trim();
  if (!text || loading) return;

  ensureChat();
  const chat = currentChat();

  if (!engine) {
    await loadAI();
    if (!engine) return;
  }

  input.value = "";
  chat.messages.push({ role: "user", content: text });
  if (chat.title === "New chat") {
    chat.title = text.slice(0, 32) + (text.length > 32 ? "…" : "");
  }
  chat.updatedAt = Date.now();
  saveChats();
  renderAll();

  // Temporary assistant bubble for streaming.
  chat.messages.push({ role: "assistant", content: "" });
  renderMessages();

  const history = [
    { role: "system", content: makeSystemPrompt() },
    ...chat.messages.slice(0, -1)
  ];

  try {
    const chunks = await engine.chat.completions.create({
      messages: history,
      stream: true,
      temperature: 0.7,
      top_p: 0.9,
      max_tokens: 512,
      enable_thinking: false
    });

    let answer = "";
    for await (const chunk of chunks) {
      answer += chunk.choices?.[0]?.delta?.content || "";
      chat.messages[chat.messages.length - 1].content = answer;
      renderMessages();
      saveChats();
    }
  } catch (err) {
    console.error(err);
    chat.messages[chat.messages.length - 1].content =
      "Sorry — the local AI stopped. Please try again.";
    saveChats();
    renderMessages();
  }
}

function newChat() {
  const chat = { id: uid(), title: "New chat", messages: [], updatedAt: Date.now() };
  chats.unshift(chat);
  activeChatId = chat.id;
  saveChats();
  renderAll();
}

function deleteCurrentChat() {
  if (!activeChatId) return;
  chats = chats.filter(c => c.id !== activeChatId);
  activeChatId = chats[0]?.id || null;
  saveChats();
  renderAll();
}

document.addEventListener("DOMContentLoaded", () => {
  activeChatId = chats[0]?.id || null;
  ensureChat();

  $("new-chat")?.addEventListener("click", newChat);
  $("delete-chat")?.addEventListener("click", deleteCurrentChat);
  $("load-ai")?.addEventListener("click", loadAI);
  $("send-btn")?.addEventListener("click", sendMessage);
  $("message-input")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  renderAll();
});
