import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Send, User, Bot, Trash2, CircleAlert } from 'lucide-react';
import { api } from '../services/api';
import { localDateString } from '../utils/dates';
import ProposalCard from '../components/coach/ProposalCard';

const QUICK_CHIPS = [
  'I have a wedding tonight',
  'Travelling this weekend, no kitchen',
  "Swap tomorrow's lunch for something with paneer",
  'Aaj lunch mein 2 roti aur dal khaya',
  'Why is my calorie target what it is?',
  'How am I doing today?',
];

const WELCOME = {
  id: 'welcome',
  role: 'assistant',
  content: "Hi! I'm your NutriPlan coach. I can see your plan, food log and targets, and I can change your plan when life happens: a wedding tonight, a trip, a meal you'd rather swap, or food you ate that wasn't planned. I always show you the change first; nothing is saved until you tap **Apply**.\n\nAsk in English, Hindi or Hinglish.",
  proposals: [],
};

const surface = 'var(--color-surface)';
const surface2 = 'var(--color-surface-2)';
const border = 'var(--color-border)';
const textPrimary = 'var(--color-text-primary)';
const textMuted = 'var(--color-text-muted)';
const coachGradient = 'linear-gradient(135deg, oklch(52% 0.2 280), oklch(62% 0.18 200))';

/** **bold**, "- " bullets and line breaks. */
const renderText = (text) => text.split('\n').map((line, i) => {
  const bullet = /^\s*[-•*]\s+/.test(line);
  const parts = line.replace(/^\s*[-•*]\s+/, '').split(/\*\*(.*?)\*\*/g);
  const content = parts.map((part, j) => (j % 2 === 1 ? <strong key={j}>{part}</strong> : <span key={j}>{part}</span>));
  return bullet
    ? <span key={i} style={{ display: 'flex', gap: '0.4rem' }}><span>•</span><span>{content}</span></span>
    : <span key={i} style={{ display: 'block', minHeight: line.trim() ? undefined : '0.6em' }}>{content}</span>;
});

const AIDietAssistantPage = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    api.getCoachMessages().then(setMessages).catch(err => setError(err.message));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const sendMessage = async (text) => {
    const message = (text ?? input).trim();
    if (!message || sending) return;
    setInput('');
    setError('');
    const pending = { id: `pending-${Date.now()}`, role: 'user', content: message, proposals: [] };
    setMessages(prev => [...prev, pending]);
    setSending(true);
    try {
      const { messages: saved } = await api.sendCoachMessage(message, localDateString());
      setMessages(prev => [...prev.filter(m => m !== pending), ...saved]);
    } catch (err) {
      setMessages(prev => prev.filter(m => m !== pending));
      setInput(message);
      setError(err.message);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const updateProposal = (messageId, index, status) => setMessages(prev => prev.map(m => (m.id === messageId
    ? { ...m, proposals: m.proposals.map((p, i) => (i === index ? { ...p, status } : p)) }
    : m)));

  const clearChat = async () => {
    if (!window.confirm('Delete this conversation?')) return;
    try {
      await api.clearCoachMessages();
      setMessages([]);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const shown = messages.length ? messages : [WELCOME];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-canvas)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '1.5rem 1rem 1rem', borderBottom: `1px solid ${border}`, background: surface }}>
        <div style={{ maxWidth: '860px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '3rem', height: '3rem', borderRadius: '0.875rem', background: coachGradient, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px oklch(52% 0.2 280 / 0.3)', flexShrink: 0 }}>
            <Sparkles size={20} color="#fff" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.3rem', letterSpacing: '-0.03em', color: textPrimary, margin: 0 }}>AI Coach</h1>
            <p style={{ fontFamily: 'var(--font-ui)', fontSize: '0.8rem', color: textMuted, margin: 0 }}>Knows your plan, log and targets, and can adjust your plan with your OK</p>
          </div>
          {messages.length > 0 && (
            <button onClick={clearChat} className="btn btn--ghost btn--sm" title="Delete conversation" aria-label="Delete conversation">
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Chat thread */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 1rem' }}>
        <div style={{ maxWidth: '860px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {shown.map(msg => (
            <div key={msg.id} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
              <div style={{ width: '2rem', height: '2rem', borderRadius: '50%', flexShrink: 0, background: msg.role === 'user' ? 'var(--color-brand)' : coachGradient, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {msg.role === 'user' ? <User size={14} color="#fff" /> : <Bot size={14} color="#fff" />}
              </div>
              <div style={{ maxWidth: msg.proposals?.length ? '88%' : '78%', minWidth: 0, padding: '0.875rem 1.125rem', borderRadius: msg.role === 'user' ? '1.25rem 0.375rem 1.25rem 1.25rem' : '0.375rem 1.25rem 1.25rem 1.25rem', background: msg.role === 'user' ? 'var(--color-brand)' : surface2, border: msg.role === 'user' ? 'none' : `1px solid ${border}` }}>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', lineHeight: 1.65, color: msg.role === 'user' ? '#fff' : textPrimary, overflowWrap: 'anywhere' }}>
                  {renderText(msg.content)}
                </div>
                {msg.proposals?.map((proposal, index) => (
                  <ProposalCard
                    key={index}
                    messageId={msg.id}
                    index={index}
                    proposal={proposal}
                    onResolved={(i, status) => updateProposal(msg.id, i, status)}
                  />
                ))}
                {msg.createdAt && (
                  <span style={{ display: 'block', marginTop: '0.4rem', fontFamily: 'var(--font-ui)', fontSize: '0.68rem', color: msg.role === 'user' ? 'rgba(255,255,255,0.7)' : textMuted }}>
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
            </div>
          ))}

          {sending && (
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <div style={{ width: '2rem', height: '2rem', borderRadius: '50%', background: coachGradient, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Bot size={14} color="#fff" />
              </div>
              <div style={{ padding: '0.875rem 1.125rem', borderRadius: '0.375rem 1.25rem 1.25rem 1.25rem', background: surface2, border: `1px solid ${border}`, display: 'flex', alignItems: 'center', gap: '0.3rem' }} aria-label="Coach is thinking">
                {[0, 1, 2].map(i => (
                  <span key={i} style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--color-brand)', animation: `bounce 1.2s ${i * 0.2}s infinite` }} />
                ))}
              </div>
            </div>
          )}

          {error && (
            <div role="alert" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 0.875rem', borderRadius: 'var(--radius-md)', background: 'oklch(52% 0.19 22 / 0.1)', color: 'var(--color-error)', fontFamily: 'var(--font-ui)', fontSize: 'var(--text-sm)' }}>
              <CircleAlert size={16} style={{ flexShrink: 0 }} />{error}
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Quick chips */}
      <div style={{ background: surface, borderTop: `1px solid ${border}`, padding: '0.75rem 1rem 0' }}>
        <div style={{ maxWidth: '860px', margin: '0 auto', display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
          {QUICK_CHIPS.map(chip => (
            <button key={chip} onClick={() => sendMessage(chip)} disabled={sending} className="badge" style={{ flexShrink: 0, padding: '0.4rem 0.875rem', border: `1px solid ${border}`, background: 'transparent', color: 'var(--color-text-secondary)', fontSize: '0.78rem', fontWeight: 500, letterSpacing: 0, textTransform: 'none', cursor: sending ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}>
              {chip}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div style={{ background: surface, borderTop: `1px solid ${border}`, padding: '0.75rem 1rem 1rem' }}>
        <div style={{ maxWidth: '860px', margin: '0 auto', display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            maxLength={1000}
            placeholder="Ask anything, e.g. “shaadi hai aaj raat, plan adjust karo”"
            className="field"
            style={{ flex: 1, resize: 'none', lineHeight: 1.5, background: surface2 }}
            aria-label="Message the coach"
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || sending}
            className="btn btn--primary"
            aria-label="Send"
            style={{ width: '2.75rem', height: '2.75rem', padding: 0, flexShrink: 0, opacity: !input.trim() || sending ? 0.5 : 1, boxShadow: 'none' }}
          >
            <Send size={18} />
          </button>
        </div>
        <p style={{ maxWidth: '860px', margin: '0.5rem auto 0', fontFamily: 'var(--font-ui)', fontSize: '0.7rem', color: textMuted }}>
          Not medical advice. Changes are saved only when you tap Apply. Messages are sent to Google Gemini without your name or email.
        </p>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
};

export default AIDietAssistantPage;
