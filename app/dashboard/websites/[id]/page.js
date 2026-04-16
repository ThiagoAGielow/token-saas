'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';

const PLATFORM_DOMAIN = process.env.NEXT_PUBLIC_PLATFORM_DOMAIN || 'velocitysites.com.au';

const PROVIDERS = [
  { value: 'claude', label: 'Claude' },
  { value: 'openai', label: 'GPT-4o' },
  { value: 'gemini', label: 'Gemini' },
];

// Strip <HTML_UPDATE>...</HTML_UPDATE> from displayed assistant messages
function displayContent(content) {
  return content.replace(/<HTML_UPDATE>[\s\S]*?<\/HTML_UPDATE>/gi, '').trim()
    || '✓ Website updated.';
}

export default function WebsiteChatPage({ params }) {
  const { id } = params;

  const [website,    setWebsite]    = useState(null);
  const [messages,   setMessages]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [publishing, setPublishing] = useState(false);

  const [input,    setInput]    = useState('');
  const [provider, setProvider] = useState('claude');
  const [sending,  setSending]  = useState(false);
  const [streamingText, setStreamingText] = useState('');

  const bottomRef   = useRef(null);
  const inputRef    = useRef(null);
  const textareaRef = useRef(null);

  // ── Publish ────────────────────────────────────────────────────────────────
  async function handlePublish() {
    setPublishing(true);
    try {
      const res = await fetch(`/api/websites/${id}`, { method: 'PATCH' });
      if (res.ok) setWebsite(prev => ({ ...prev, status: 'ACTIVE' }));
    } finally {
      setPublishing(false);
    }
  }

  // ── Load history ───────────────────────────────────────────────────────────
  const loadChat = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch(`/api/websites/${id}/chat`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load chat');
      setWebsite(data.website);
      setMessages(data.messages);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadChat(); }, [loadChat]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  // ── Send message ───────────────────────────────────────────────────────────
  async function handleSend(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    setInput('');
    setSending(true);
    setStreamingText('');

    // Optimistically add user message
    const userMsg = { id: `tmp-${Date.now()}`, role: 'user', content: text, createdAt: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);

    try {
      const res = await fetch(`/api/websites/${id}/chat`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ message: text, provider }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Request failed');
      }

      // Read SSE stream
      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let   full    = '';
      let   htmlUpdated = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const lines = decoder.decode(value).split('\n');
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === 'chunk') {
              full += event.text;
              setStreamingText(full);
            } else if (event.type === 'done') {
              htmlUpdated = event.htmlUpdated;
            } else if (event.type === 'error') {
              throw new Error(event.message);
            }
          } catch { /* skip malformed lines */ }
        }
      }

      // Finalise — replace streaming placeholder with persisted message
      const assistantMsg = {
        id:        `tmp-assistant-${Date.now()}`,
        role:      'assistant',
        content:   full,
        createdAt: new Date().toISOString(),
      };
      setMessages(prev => [...prev, assistantMsg]);
      setStreamingText('');

      // If site HTML changed, refresh website meta so preview link is current
      if (htmlUpdated) {
        setWebsite(prev => prev ? { ...prev, _updated: Date.now() } : prev);
      }

    } catch (err) {
      setMessages(prev => [...prev, {
        id:        `err-${Date.now()}`,
        role:      'assistant',
        content:   `Error: ${err.message}`,
        createdAt: new Date().toISOString(),
        isError:   true,
      }]);
      setStreamingText('');
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  // Auto-resize textarea
  function handleInputChange(e) {
    setInput(e.target.value);
    const ta = textareaRef.current;
    if (ta) { ta.style.height = 'auto'; ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`; }
  }

  // Send on Ctrl+Enter / Cmd+Enter
  function handleKeyDown(e) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleSend(e);
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col h-full max-w-3xl mx-auto">
        <div className="h-10 w-48 bg-white/5 rounded-lg animate-pulse mb-6" />
        <div className="flex-1 space-y-4">
          {[1,2,3].map(i => <div key={i} className="h-12 bg-white/5 rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto p-6 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
        <p className="font-semibold mb-1">Failed to load chat</p>
        <p className="text-sm opacity-80">{error}</p>
        <button onClick={loadChat} className="mt-3 text-sm underline opacity-70 hover:opacity-100">Try again</button>
      </div>
    );
  }

  const siteUrl = `https://${website?.subdomain}.${PLATFORM_DOMAIN}`;

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-3xl">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/websites"
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h2 className="text-base font-bold text-white">{website?.name}</h2>
            <p className="text-xs text-gray-500">{website?.subdomain}.{PLATFORM_DOMAIN}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Provider selector */}
          <select
            value={provider}
            onChange={e => setProvider(e.target.value)}
            disabled={sending}
            className="text-xs bg-[#1a1a1a] border border-white/10 text-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-500 disabled:opacity-50"
          >
            {PROVIDERS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>

          {website?.status === 'DRAFT' && (
            <button
              onClick={handlePublish}
              disabled={publishing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 text-xs text-green-400 font-semibold transition-colors disabled:opacity-50"
            >
              {publishing ? (
                <>
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  Publishing…
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Publish site
                </>
              )}
            </button>
          )}

          {website?.status === 'ACTIVE' && (
            <span className="flex items-center gap-1.5 text-xs text-green-400 font-medium px-3 py-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
              Live
            </span>
          )}

          <a
            href={siteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-gray-300 font-medium transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Preview site
          </a>
        </div>
      </div>

      {/* ── Message list ───────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 pb-2">

        {/* Welcome message */}
        {messages.length === 0 && !streamingText && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-4 py-12">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center">
              <svg className="w-7 h-7 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div>
              <p className="text-white font-semibold mb-1">Chat with your AI assistant</p>
              <p className="text-gray-500 text-sm max-w-xs">
                Ask me to change colours, add sections, update copy, or anything else about your site.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center mt-2">
              {[
                'Make the hero section darker',
                'Add a pricing section',
                'Change the font to something modern',
                'Add a contact form',
              ].map(s => (
                <button
                  key={s}
                  onClick={() => setInput(s)}
                  className="text-xs px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.map(msg => (
          <Message key={msg.id} msg={msg} />
        ))}

        {/* Streaming assistant response */}
        {streamingText && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0 mt-0.5">
              <svg className="w-3.5 h-3.5 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2a10 10 0 110 20A10 10 0 0112 2zm0 2a8 8 0 100 16A8 8 0 0012 4z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 mb-1">AI Assistant</p>
              <div className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">
                {displayContent(streamingText)}
                <span className="inline-block w-0.5 h-4 bg-blue-400 ml-0.5 animate-pulse align-text-bottom" />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Input ──────────────────────────────────────────────────────────── */}
      <form onSubmit={handleSend} className="shrink-0 mt-3">
        <div className="flex items-end gap-2 p-3 rounded-xl bg-[#111] border border-white/10 focus-within:border-blue-500/50 transition-colors">
          <textarea
            ref={el => { textareaRef.current = el; inputRef.current = el; }}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask me to change something…"
            disabled={sending}
            rows={1}
            className="flex-1 bg-transparent text-white text-sm placeholder-gray-600 resize-none focus:outline-none disabled:opacity-50 max-h-40"
          />
          <button
            type="submit"
            disabled={!input.trim() || sending}
            className="w-8 h-8 rounded-lg bg-blue-500 hover:bg-blue-400 disabled:bg-white/10 disabled:text-gray-600 flex items-center justify-center transition-colors shrink-0"
          >
            {sending ? (
              <svg className="w-3.5 h-3.5 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>
        </div>
        <p className="text-xs text-gray-600 mt-1.5 text-center">
          Ctrl+Enter to send · Changes to your site are applied automatically
        </p>
      </form>
    </div>
  );
}

// ─── Message component ────────────────────────────────────────────────────────

function Message({ msg }) {
  const isUser = msg.role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] px-4 py-2.5 rounded-2xl rounded-tr-sm bg-blue-500 text-white text-sm leading-relaxed">
          {msg.content}
        </div>
      </div>
    );
  }

  const text = displayContent(msg.content);
  const hadHtmlUpdate = /<HTML_UPDATE>/i.test(msg.content);

  return (
    <div className="flex gap-3">
      <div className="w-7 h-7 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0 mt-0.5">
        <svg className="w-3.5 h-3.5 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2a10 10 0 110 20A10 10 0 0112 2zm0 2a8 8 0 100 16A8 8 0 0012 4z" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 mb-1">AI Assistant</p>
        <div className={`text-sm leading-relaxed whitespace-pre-wrap ${msg.isError ? 'text-red-400' : 'text-gray-200'}`}>
          {text}
        </div>
        {hadHtmlUpdate && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-green-400">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Site updated — refresh the preview to see changes
          </div>
        )}
      </div>
    </div>
  );
}
