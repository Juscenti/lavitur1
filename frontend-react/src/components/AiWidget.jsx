import { useState, useRef, useEffect } from 'react';
import '../styles/ai-widget.css';

function getAiApiUrl() {
  if (import.meta.env.VITE_AI_API_BASE) return import.meta.env.VITE_AI_API_BASE.replace(/\/$/, '') + '/api/ai';
  if (typeof window !== 'undefined' && window.AI_API_BASE) return window.AI_API_BASE.replace(/\/$/, '') + '/api/ai';
  return 'http://localhost:5001/api/ai';
}

export default function AiWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const chatBodyRef = useRef(null);

  useEffect(() => {
    if (chatBodyRef.current) chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
  }, [messages]);

  const appendMessage = (sender, text) => {
    setMessages((m) => [...m, { sender, text }]);
  };

  const send = async () => {
    const prompt = input.trim();
    if (!prompt || sending) return;
    appendMessage('user', prompt);
    setInput('');
    setSending(true);
    try {
      const res = await fetch(getAiApiUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: prompt }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      appendMessage('ai', data.reply || '⚠️ No reply received from AI.');
    } catch (err) {
      appendMessage('ai', '⚠️ AI is currently unavailable.');
      console.error('AI Error:', err.message || err);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <button type="button" id="ai-chat-launcher" className="ai-chat-launcher" onClick={() => setOpen(true)} aria-label="Open AI chat">
        <img src="/images/icons/Ai-pic1.png" alt="" />
      </button>
      <div id="ai-chat-drawer" className={open ? 'open' : ''} role="dialog" aria-modal="true" aria-label="AI chat">
        <div className="drawer-header">
          <span>Lavitúr AI</span>
          <button type="button" id="ai-close" onClick={() => setOpen(false)} aria-label="Close">×</button>
        </div>
        <div ref={chatBodyRef} className="chat-body">
          {messages.length === 0 && <p className="chat-placeholder">Ask me anything about Lavitúr.</p>}
          {messages.map((msg, i) => (
            <div key={i} className={`chat-message ${msg.sender}`}>
              {msg.text}
            </div>
          ))}
        </div>
        <div className="chat-input-area">
          <input
            type="text"
            id="ai-user-input"
            placeholder="Type a message…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            disabled={sending}
          />
          <button type="button" id="ai-send-btn" onClick={send} disabled={sending || !input.trim()}>
            Send
          </button>
        </div>
      </div>
    </>
  );
}
