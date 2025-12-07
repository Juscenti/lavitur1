// js/ai-widget.js

// Get elements
const launcher  = document.getElementById('ai-chat-launcher');
const drawer    = document.getElementById('ai-chat-drawer');
const closeBtn  = document.getElementById('ai-close');
const sendBtn   = document.getElementById('ai-send-btn');
const userInput = document.getElementById('ai-user-input');
const chatBody  = document.getElementById('chat-body');

// Open/close drawer
launcher.onclick = () => drawer.classList.add('open');
closeBtn.onclick = () => drawer.classList.remove('open');

// Send message handler
sendBtn.onclick = async () => {
  const prompt = userInput.value.trim();
  if (!prompt) return;

  appendMessage('user', prompt);
  userInput.value = '';
  toggleInput(false);

  try {
    const res = await fetch('http://localhost:5000/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: prompt })
    });

    const data = await res.json();
    if (data.reply) {
      appendMessage('ai', data.reply);
    } else {
      appendMessage('ai', '⚠️ No reply received from AI.');
      console.error('AI response had no reply field:', data);
    }

  } catch (err) {
    appendMessage('ai', '⚠️ AI is currently unavailable.');
    console.error('Fetch error:', err);
  } finally {
    toggleInput(true);
  }
};

// Helper to toggle input/button
function toggleInput(enabled) {
  userInput.disabled = !enabled;
  sendBtn.disabled  = !enabled;
}

// Append a chat message
function appendMessage(sender, text) {
  const msg = document.createElement('div');
  msg.className = `chat-message ${sender}`;
  msg.innerText = text;
  chatBody.appendChild(msg);
  chatBody.scrollTop = chatBody.scrollHeight;
}
