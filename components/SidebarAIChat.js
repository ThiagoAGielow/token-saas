'use client';

import { useState, useEffect, useRef } from 'react';

const PLATFORM_DOMAIN = process.env.NEXT_PUBLIC_PLATFORM_DOMAIN || 'velocitysites.com.au';

function displayContent(content) {
  return content.replace(/<HTML_UPDATE>[\s\S]*?<\/HTML_UPDATE>/gi, '').trim() || '✓ Website updated.';
}

const SUGGESTIONS = [
  'Add a phone icon to the header',
  'Change the hero background colour',
  'Add a pricing section',
  'Make the footer darker',
];

// ─── Chat message bubble ───────────────────────────────────────────────────────

function ChatMessage({ msg }) {
  const isUser = msg.role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] px-3 py-2 rounded-2xl rounded-tr-sm bg-purple-500 text-white text-sm leading-relaxed">
          {msg.content}
        </div>
      </div>
    );
  }

  const text      = displayContent(msg.content);
  const hadUpdate = /<HTML_UPDATE>/i.test(msg.content);

  return (
    <div className="flex gap-2.5">
      <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0 mt-0.5">
        <svg className="w-3 h-3 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <div className={`text-sm leading-relaxed whitespace-pre-wrap ${msg.isError ? 'text-red-400' : 'text-gray-200'}`}>
          {text}
        </div>
        {hadUpdate && (
          <div className="mt-1.5 flex items-center gap-1 text-xs text-green-400">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Site updated — refresh preview to see changes
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function SidebarAIChat() {
  const [isOpen,          setIsOpen]          = useState(false);
  const [websites,        setWebsites]        = useState([]);
  const [selectedId,      setSelectedId]      = useState('');
  const [messages,        setMessages]        = useState([]);
  const [input,           setInput]           = useState('');
  const [sending,         setSending]         = useState(false);
  const [streamingText,   setStreamingText]   = useState('');
  const [loadingWebsites, setLoadingWebsites] = useState(false);
  const [loadingChat,     setLoadingChat]     = useState(false);

  const bottomRef   = useRef(null);
  const textareaRef = useRef(null);

  // Load websites when drawer opens
  useEffect(() => {
    if (!isOpen) return;
    setLoadingWebsites(true);
    fetch('/api/websites')
      .then(r => r.json())
      .then(d => {
        const sites = d.websites || [];
        setWebsites(sites);
        if (sites.length > 0 && !selectedId) {
          setSelectedId(sites[0].id);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingWebsites(false));
  }, [isOpen]);

  // Load chat history when selected website changes
  useEffect(() => {
    if (!selectedId) return;
    setLoadingChat(true);
    setMessages([]);
    fetch(`/api/websites/${selectedId}/chat`)
      .then(r => r.json())
      .then(d => setMessages(d.messages || []))
      .catch(() => {})
      .finally(() => setLoadingChat(false));
  }, [selectedId]);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  // ── Send message ─────────────────────────────────────────────────────────────
  async function handleSend(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending || !selectedId) return;

    setInput('');
    setSending(true);
    setStreamingText('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    const userMsg = {
      id:        `tmp-${Date.now()}`,
      role:      'user',
      content:   text,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      const res = await fetch(`/api/websites/${selectedId}/chat`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ message: text, provider: 'claude' }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Request failed');
      }

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let   full    = '';

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
            } else if (event.type === 'error') {
              throw new Error(event.message);
            }
          } catch { /* skip malformed lines */ }
        }
      }

      setMessages(prev => [...prev, {
        id:        `tmp-assistant-${Date.now()}`,
        role:      'assistant',
        content:   full,
        createdAt: new Date().toISOString(),
      }]);
      setStreamingText('');
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
    }
  }

  function handleKeyDown(e) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleSend(e);
  }

  function handleInputChange(e) {
    setInput(e.target.value);
    const ta = textareaRef.current;
    if (ta) { ta.style.height = 'auto'; ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`; }
  }

  const selectedSite = websites.find(w => w.id === selectedId);

  return (
    <>
      {/* ── Sidebar trigger button ───────────────────────────────────────────── */}
      <button
        onClick={() => setIsOpen(true)}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 border ${
          isOpen
            ? 'bg-purple-500/15 text-purple-300 border-purple-500/20'
            : 'text-purple-400 hover:bg-purple-500/10 border-purple-500/20 hover:border-purple-500/30'
        }`}
      >
        <span className="text-purple-400 flex-shrink-0">
          <svg width="20" height="20" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </span>
        <span className="flex-1 text-left">AI Assistant</span>
        <span className="text-xs px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-semibold">
          AI
        </span>
      </button>

      {/* ── Backdrop ─────────────────────────────────────────────────────────── */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* ── Drawer ───────────────────────────────────────────────────────────── */}
      <div
        className={`fixed top-0 bottom-0 z-50 flex flex-col bg-[#0f0f0f] shadow-2xl transition-all duration-300 ease-in-out ${
          isOpen
            ? 'opacity-100 pointer-events-auto translate-x-0'
            : 'opacity-0 pointer-events-none -translate-x-4'
        }`}
        style={{
          left:       '240px',
          width:      '380px',
          borderLeft: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-16 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <span className="font-semibold text-white text-sm">AI Assistant</span>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Website selector */}
        <div className="px-4 py-3 border-b border-white/10 flex-shrink-0">
          <label className="block text-xs text-gray-500 mb-1.5 font-medium uppercase tracking-wider">
            Editing website
          </label>
          {loadingWebsites ? (
            <div className="h-9 rounded-lg bg-white/5 animate-pulse" />
          ) : websites.length === 0 ? (
            <p className="text-sm text-gray-500">No websites yet. Create one first.</p>
          ) : (
            <select
              value={selectedId}
              onChange={e => setSelectedId(e.target.value)}
              disabled={sending}
              className="w-full px-3 py-2 rounded-lg bg-[#1a1a1a] border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500 disabled:opacity-50 transition-colors"
            >
              {websites.map(w => (
                <option key={w.id} value={w.id}>
                  {w.name} — {w.subdomain}
                </option>
              ))}
            </select>
          )}
          {selectedSite && (
            <a
              href={`https://${selectedSite.subdomain}.${PLATFORM_DOMAIN}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-purple-400/60 hover:text-purple-400 mt-1.5 inline-block transition-colors"
            >
              {selectedSite.subdomain}.{PLATFORM_DOMAIN} ↗
            </a>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {loadingChat ? (
            <div className="space-y-3">
              {[1, 2].map(i => (
                <div key={i} className="h-10 bg-white/5 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : messages.length === 0 && !streamingText ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-8 gap-3">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div>
                <p className="text-white text-sm font-semibold mb-1">What would you like to change?</p>
                <p className="text-gray-500 text-xs max-w-[240px]">
                  {selectedSite
                    ? `Tell me what to update on ${selectedSite.name}.`
                    : 'Select a website above to get started.'}
                </p>
              </div>
              {selectedSite && (
                <div className="flex flex-wrap gap-1.5 justify-center mt-1">
                  {SUGGESTIONS.map(s => (
                    <button
                      key={s}
                      onClick={() => setInput(s)}
                      className="text-xs px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              {messages.map(msg => (
                <ChatMessage key={msg.id} msg={msg} />
              ))}

              {/* Streaming response */}
              {streamingText && (
                <div className="flex gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <svg className="w-3 h-3 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <div className="flex-1 text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">
                    {displayContent(streamingText)}
                    <span className="inline-block w-0.5 h-4 bg-purple-400 ml-0.5 animate-pulse align-text-bottom" />
                  </div>
                </div>
              )}
            </>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="px-4 pb-4 pt-3 flex-shrink-0 border-t border-white/10">
          <div className="flex items-end gap-2 p-2.5 rounded-xl bg-[#111] border border-white/10 focus-within:border-purple-500/50 transition-colors">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={
                !selectedId
                  ? 'Select a website first…'
                  : selectedSite
                  ? `Ask me to change ${selectedSite.name}…`
                  : 'What would you like to change?'
              }
              disabled={sending || !selectedId}
              rows={1}
              className="flex-1 bg-transparent text-white text-sm placeholder-gray-600 resize-none focus:outline-none disabled:opacity-50 max-h-32"
            />
            <button
              type="submit"
              disabled={!input.trim() || sending || !selectedId}
              className="w-7 h-7 rounded-lg bg-purple-500 hover:bg-purple-400 disabled:bg-white/10 disabled:text-gray-600 flex items-center justify-center transition-colors shrink-0"
            >
              {sending ? (
                <svg className="w-3 h-3 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
              ) : (
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          </div>
          <p className="text-xs text-gray-600 mt-1.5 text-center">Ctrl+Enter to send</p>
        </form>
      </div>
    </>
  );
}
