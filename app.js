// AI Bell v6 — stable iPhone CPU/WASM chat
import { pipeline } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/+esm";

const MODEL_ID = "onnx-community/SmolLM2-135M-Instruct-ONNX";
const STORAGE_KEY = "ai-bell-chats-v6";

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
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}
function saveChats() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(chats)); } catch {}
}
function currentChat() { return chats.find(c => c.id === activeChatId); }
function ensureChat() {
  if (!activeChatId || !currentChat()) {
    const chat = { id: uid(), title: "New chat", messages: [], updatedAt: Date.now() };
    chats.unshift(chat); activeChatId = chat.id; saveChats();
  }
}
function setStatus(text, type="") {
  const el=$("ai-status"); if (!el) return;
  el.textContent=text; el.className="ai-status "+type;
}
function cleanAnswer(text) {
  return String(text || "")
    .replace(/<think>[\s\S]*?<\/think>/gi,"")
    .replace(/<think>[\s\S]*$/gi,"")
    .trim();
}
function renderChats() {
  const list=$("chat-list"); if(!list)return;
  list.innerHTML="";
  for(const chat of chats){
    const row=document.createElement("button");
    row.className="chat-item"+(chat.id===activeChatId?" active":"");
    row.type="button"; row.textContent=chat.title||"New chat";
    row.onclick=()=>{activeChatId=chat.id;closeSidebar();renderAll();};
    list.appendChild(row);
  }
}
function renderMessages() {
  const box=$("messages"); if(!box)return;
  box.innerHTML="";
  const chat=currentChat();
  if(!chat || !chat.messages.length){
    const w=document.createElement("div"); w.className="welcome";
    w.innerHTML=`<div class="welcome-logo">AI</div><h1>How can I help?</h1><p>AI Bell runs a small AI model locally on this device.</p><div class="local-note">🔒 Your messages stay on this device.</div>`;
    box.appendChild(w); return;
  }
  for(const m of chat.messages){
    const row=document.createElement("div"); row.className="message "+m.role;
    const bubble=document.createElement("div"); bubble.className="bubble";
    bubble.textContent=m.role==="assistant"?cleanAnswer(m.content):m.content;
    row.appendChild(bubble); box.appendChild(row);
  }
  box.scrollTop=box.scrollHeight;
}
function updateModelUI(){
  const btn=$("load-ai"); if(!btn)return;
  if(generator){btn.textContent="AI Ready";btn.disabled=false;setStatus("Local AI ready","ready");}
  else if(loading){btn.textContent="Loading AI…";btn.disabled=true;}
  else {btn.textContent="Load AI";btn.disabled=false;if(!$("ai-status")?.classList.contains("error"))setStatus("AI not loaded","");}
}
async function loadAI(){
  if(generator||loading)return;
  loading=true; updateModelUI(); setStatus("Preparing local AI…","");
  try{
    generator=await pipeline("text-generation",MODEL_ID,{
      device:"wasm", dtype:"q4f16",
      progress_callback:(p)=>{
        if(typeof p?.progress==="number"){
          const pct=Math.max(0,Math.min(100,Math.round((p.progress<=1?p.progress*100:p.progress))));
          setStatus(`Loading local AI… ${pct}%`,"");
        } else if(p?.status==="initiate") setStatus("Preparing local AI…","");
      }
    });
    setStatus("Local AI ready","ready");
  }catch(err){
    console.error(err); generator=null; setStatus("AI could not load. Try Load AI again.","error");
  }finally{loading=false;updateModelUI();}
}
function systemPrompt(){
 return `You are AI Bell, a helpful private AI assistant. Answer naturally and clearly.
The user may write Sorani Kurdish, Kurmanji Kurdish, Arabic, or English.
If the user writes Sorani Kurdish, answer in Sorani Kurdish when possible.
Never reveal hidden reasoning or <think> tags. Keep answers useful and concise.`;
}
async function sendMessage(){
  if(generating)return;
  const input=$("message-input"), text=(input?.value||"").trim();
  if(!text)return;
  ensureChat();
  if(!generator){await loadAI();if(!generator)return;}
  const chat=currentChat();
  input.value=""; input.style.height="auto";
  chat.messages.push({role:"user",content:text});
  if(chat.title==="New chat")chat.title=text.slice(0,32)+(text.length>32?"…":"");
  chat.updatedAt=Date.now();
  chat.messages.push({role:"assistant",content:""});
  saveChats(); renderAll();
  generating=true; $("send-btn").disabled=true; setStatus("AI is thinking…","ready");
  try{
    const history=[{role:"system",content:systemPrompt()},...chat.messages.slice(0,-1)];
    // Use Transformers.js chat-message input directly. This is more reliable on iPhone WASM.
    const output=await generator(history,{
      max_new_tokens:96,
      do_sample:false,
      repetition_penalty:1.05
    });
    let answer="";
    if(Array.isArray(output) && output[0]){
      const generated=output[0].generated_text;
      if(Array.isArray(generated)){
        const last=generated[generated.length-1];
        answer=typeof last?.content==="string"?last.content:"";
      }else if(typeof generated==="string"){
        answer=generated;
      }
    }
    answer=cleanAnswer(answer);
    if(!answer) answer="I couldn't generate a response. Please try again.";
    chat.messages[chat.messages.length-1].content=answer;
    chat.updatedAt=Date.now(); saveChats(); renderMessages();
  }catch(err){
    console.error("Generation error:",err);
    chat.messages[chat.messages.length-1].content="Sorry — the local AI stopped. Please try again.";
    saveChats(); renderMessages();
  }finally{
    generating=false; $("send-btn").disabled=false; setStatus("Local AI ready","ready");
  }
}
function newChat(){
 const chat={id:uid(),title:"New chat",messages:[],updatedAt:Date.now()};
 chats.unshift(chat);activeChatId=chat.id;saveChats();closeSidebar();renderAll();$("message-input")?.focus();
}
function deleteCurrentChat(){
 if(!activeChatId)return;
 chats=chats.filter(c=>c.id!==activeChatId);activeChatId=chats[0]?.id||null;saveChats();ensureChat();renderAll();
}
function openSidebar(){$("sidebar")?.classList.add("open");$("scrim")?.classList.add("show");}
function closeSidebar(){$("sidebar")?.classList.remove("open");$("scrim")?.classList.remove("show");}
function autoResize(){const i=$("message-input");if(i){i.style.height="auto";i.style.height=Math.min(i.scrollHeight,130)+"px";}}
function renderAll(){renderChats();renderMessages();updateModelUI();}
document.addEventListener("DOMContentLoaded",()=>{
 activeChatId=chats[0]?.id||null;ensureChat();
 $("openSidebar")?.addEventListener("click",openSidebar);
 $("closeSidebar")?.addEventListener("click",closeSidebar);
 $("scrim")?.addEventListener("click",closeSidebar);
 $("new-chat")?.addEventListener("click",newChat);
 $("new-chat-top")?.addEventListener("click",newChat);
 $("delete-chat")?.addEventListener("click",deleteCurrentChat);
 $("load-ai")?.addEventListener("click",loadAI);
 $("composer")?.addEventListener("submit",e=>{e.preventDefault();e.stopPropagation();sendMessage();return false;});
 $("message-input")?.addEventListener("input",autoResize);
 $("message-input")?.addEventListener("keydown",e=>{
   if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();e.stopPropagation();sendMessage();}
 });
 renderAll();
});
