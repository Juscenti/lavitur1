// js/ai-widget.js — only runs when widget elements exist on the page

const launcher  = document.getElementById('ai-chat-launcher');
const drawer    = document.getElementById('ai-chat-drawer');
const closeBtn  = document.getElementById('ai-close');
const sendBtn   = document.getElementById('ai-send-btn');
const userInput = document.getElementById('ai-user-input');
const chatBody  = document.getElementById('chat-body');

if (!launcher) return;

function getAiApiUrl() {
  const base = (typeof window !== 'undefined' && window.AI_API_BASE) ? window.AI_API_BASE : 'http://localhost:5001';
  return base.replace(/\/$/, '') + '/api/ai';
}

if (launcher) launcher.onclick = () => drawer && drawer.classList.add('open');
if (closeBtn) closeBtn.onclick = () => drawer && drawer.classList.remove('open');

if (sendBtn && userInput && chatBody) {
  sendBtn.onclick = async () => {
    const prompt = userInput.value.trim();
    if (!prompt) return;

    appendMessage('user', prompt);
    userInput.value = '';
    toggleInput(false);

    try {
      const res = await fetch(getAiApiUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: prompt })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      if (data.reply) {
        appendMessage('ai', data.reply);
      } else {
        appendMessage('ai', '⚠️ No reply received from AI.');
        console.error('AI response had no reply field:', data);
      }

    } catch (err) {
      appendMessage('ai', '⚠️ AI is currently unavailable.');
      console.error('AI Error:', err.message || err);
    } finally {
      toggleInput(true);
    }
  };
}

function toggleInput(enabled) {
  if (userInput) userInput.disabled = !enabled;
  if (sendBtn) sendBtn.disabled = !enabled;
}

function appendMessage(sender, text) {
  if (!chatBody) return;
  const msg = document.createElement('div');
  msg.className = `chat-message ${sender}`;
  msg.innerText = text;
  chatBody.appendChild(msg);
  chatBody.scrollTop = chatBody.scrollHeight;
}
