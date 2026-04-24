'use client';

import { useState, useEffect, useRef, useCallback, use } from 'react';
import Link from 'next/link';
import type { Website } from '@/types/dashboard';

const PLATFORM_DOMAIN = process.env.NEXT_PUBLIC_PLATFORM_DOMAIN || 'velocitysites.com.au';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
  isError?: boolean;
}

type Provider = 'claude' | 'openai' | 'gemini';
type Viewport = 'desktop' | 'tablet' | 'mobile';

const PROVIDERS: { value: Provider; label: string }[] = [
  { value: 'claude', label: 'Claude' },
  { value: 'openai', label: 'GPT-4o' },
  { value: 'gemini', label: 'Gemini' },
];

const VIEWPORT_WIDTHS: Record<Viewport, string> = {
  desktop: '100%',
  tablet:  '768px',
  mobile:  '390px',
};

const HTML_UPDATE_RE = /<HTML_UPDATE>([\s\S]*?)<\/HTML_UPDATE>/i;

// Strip <HTML_UPDATE>...</HTML_UPDATE> from displayed text (used during streaming)
function displayContent(content: string) {
  const stripped = content.replace(/<HTML_UPDATE>[\s\S]*?<\/HTML_UPDATE>/gi, '').trim();
  if (stripped) return stripped;
  if (/<HTML_UPDATE>/i.test(content)) return '✓ Site updated.';
  return content || 'No response';
}

export default function WebsiteChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [website,    setWebsite]    = useState<Website | null>(null);
  const [messages,   setMessages]   = useState<ChatMessage[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);

  const [input,    setInput]    = useState('');
  const [provider, setProvider] = useState<Provider>('claude');
  const [sending,  setSending]  = useState(false);
  const [streamingText, setStreamingText] = useState('');

  // Split-pane preview state
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [viewport,    setViewport]    = useState<Viewport>('desktop');
  const [previewKey,  setPreviewKey]  = useState(0);

  const bottomRef   = useRef<HTMLDivElement | null>(null);
  const inputRef    = useRef<HTMLTextAreaElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // ── Publish ────────────────────────────────────────────────────────────────
  async function handlePublish() {
    setPublishing(true);
    try {
      const res = await fetch(`/api/websites/${id}`, { method: 'PATCH' });
      if (res.ok) setWebsite(prev => prev ? { ...prev, status: 'ACTIVE' } : prev);
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
      const data = (await res.json()) as { website?: Website; messages?: ChatMessage[]; error?: string };
      if (!res.ok) throw new Error(data.error || 'Failed to load chat');
      setWebsite(data.website ?? null);
      setMessages(data.messages ?? []);
      // Seed the live preview with the site's stored HTML
      if (data.website?.generatedHtml) {
        setPreviewHtml(data.website.generatedHtml);
      }
    } catch (err) {
      setError((err as Error).message);
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
  async function handleSend(e: React.FormEvent | React.KeyboardEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    setInput('');
    setSending(true);
    setStreamingText('');

    // Optimistically add user message
    const userMsg: ChatMessage = { id: `tmp-${Date.now()}`, role: 'user', content: text, createdAt: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);

    try {
      const res = await fetch(`/api/websites/${id}/chat`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ message: text, provider }),
      });

      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        throw new Error(err.error || 'Request failed');
      }

      if (!res.body) throw new Error('No response body');
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
              // Live-update the iframe preview whenever a complete HTML_UPDATE block arrives
              const match = HTML_UPDATE_RE.exec(full);
              if (match && match[1]) setPreviewHtml(match[1].trim());
            } else if (event.type === 'error') {
              throw new Error(event.message);
            }
          } catch { /* skip malformed lines */ }
        }
      }

      // Finalise — replace streaming placeholder with persisted message
      const assistantMsg: ChatMessage = {
        id:        `tmp-assistant-${Date.now()}`,
        role:      'assistant',
        content:   full,
        createdAt: new Date().toISOString(),
      };
      setMessages(prev => [...prev, assistantMsg]);
      setStreamingText('');

      // Bump the preview key to force a clean iframe reload after the stream completes
      if (HTML_UPDATE_RE.test(full)) {
        setPreviewKey(k => k + 1);
      }

    } catch (err) {
      setMessages(prev => [...prev, {
        id:        `err-${Date.now()}`,
        role:      'assistant',
        content:   `Error: ${(err as Error).message}`,
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
  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    const ta = textareaRef.current;
    if (ta) { ta.style.height = 'auto'; ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`; }
  }

  // Send on Ctrl+Enter / Cmd+Enter
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleSend(e);
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-[#0a0a0a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <svg className="w-8 h-8 text-blue-400 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          <p className="text-gray-500 text-sm">Loading builder…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 z-50 bg-[#0a0a0a] flex items-center justify-center">
        <div className="max-w-sm p-6 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-center">
          <p className="font-semibold mb-1">Failed to load builder</p>
          <p className="text-sm opacity-80 mb-3">{error}</p>
          <button onClick={loadChat} className="text-sm underline opacity-70 hover:opacity-100">Try again</button>
        </div>
      </div>
    );
  }

  const siteUrl = `https://${website?.subdomain}.${PLATFORM_DOMAIN}`;

  return (
    <div className="fixed inset-0 z-50 bg-[#0a0a0a] flex flex-col">

      {/* ── Header bar ──────────────────────────────────────────────────────── */}
      <header className="h-12 shrink-0 flex items-center justify-between px-4 border-b border-white/10 bg-[#111]">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/dashboard/websites" className="w-7 h-7 rounded-md bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 transition-colors shrink-0">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate leading-tight">{website?.name}</p>
            <p className="text-[10px] text-gray-500 truncate leading-tight">{website?.subdomain}.{PLATFORM_DOMAIN}</p>
          </div>
        </div>

        {/* Viewport toggles */}
        <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
          {(['desktop', 'tablet', 'mobile'] as Viewport[]).map(vp => (
            <button key={vp} onClick={() => setViewport(vp)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${viewport === vp ? 'bg-white/15 text-white' : 'text-gray-500 hover:text-gray-300'}`}>
              {vp.charAt(0).toUpperCase() + vp.slice(1)}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <select value={provider} onChange={e => setProvider(e.target.value as Provider)} disabled={sending}
            className="text-xs bg-[#1a1a1a] border border-white/10 text-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:border-blue-500 disabled:opacity-50">
            {PROVIDERS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          {website?.status === 'DRAFT' && (
            <button onClick={handlePublish} disabled={publishing}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 text-xs text-green-400 font-semibold transition-colors disabled:opacity-50">
              {publishing ? 'Publishing…' : 'Publish site'}
            </button>
          )}
          {website?.status === 'ACTIVE' && (
            <span className="flex items-center gap-1.5 text-xs text-green-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400" /> Live
            </span>
          )}
          <a href={siteUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-gray-300 transition-colors">
            <svg className="w-3 h-3 mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Open site
          </a>
        </div>
      </header>

      {/* ── Body: chat + preview ────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0">

        {/* Left: chat panel */}
        <div className="w-[380px] shrink-0 flex flex-col border-r border-white/10 bg-[#0d0d0d]">
          <div className="flex-1 overflow-y-auto space-y-4 p-4">

            {/* Welcome */}
            {messages.length === 0 && !streamingText && (
              <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-12">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <div>
                  <p className="text-white font-semibold mb-1 text-sm">AI Website Builder</p>
                  <p className="text-gray-500 text-xs max-w-[220px]">Ask me to change colours, add sections, update copy, or anything else.</p>
                </div>
                <div className="flex flex-col gap-1.5 w-full mt-1">
                  {['Make the hero section darker', 'Add a pricing section', 'Change the font to something modern', 'Add a contact form'].map(s => (
                    <button key={s} onClick={() => setInput(s)}
                      className="text-xs px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white transition-colors text-left">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map(msg => <Message key={msg.id} msg={msg} />)}

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

          {/* Input */}
          <form onSubmit={handleSend} className="shrink-0 p-3 border-t border-white/10">
            <div className="flex items-end gap-2 p-3 rounded-xl bg-[#111] border border-white/10 focus-within:border-blue-500/50 transition-colors">
              <textarea ref={el => { textareaRef.current = el; inputRef.current = el; }}
                value={input} onChange={handleInputChange} onKeyDown={handleKeyDown}
                placeholder="Ask me to change something…" disabled={sending} rows={1}
                className="flex-1 bg-transparent text-white text-sm placeholder-gray-600 resize-none focus:outline-none disabled:opacity-50 max-h-40" />
              <button type="submit" disabled={!input.trim() || sending}
                className="w-8 h-8 rounded-lg bg-blue-500 hover:bg-blue-400 disabled:bg-white/10 disabled:text-gray-600 flex items-center justify-center transition-colors shrink-0">
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
            <p className="text-[10px] text-gray-600 mt-1.5 text-center">⌘↵ to send</p>
          </form>
        </div>

        {/* Right: live preview */}
        <div className="flex-1 min-w-0 flex flex-col bg-[#141414]">
          <div className="flex-1 flex items-start justify-center overflow-auto p-4">
            {previewHtml ? (
              <iframe key={previewKey} srcDoc={previewHtml} title="Site preview"
                sandbox="allow-scripts allow-same-origin"
                style={{ width: VIEWPORT_WIDTHS[viewport], maxWidth: '100%', height: '100%', minHeight: '600px' }}
                className="rounded-lg border border-white/10 bg-white transition-all duration-300" />
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-gray-500 font-medium text-sm">No preview yet</p>
                  <p className="text-gray-600 text-xs mt-1">Ask the AI to create or update your site to see a live preview here.</p>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── Message component ────────────────────────────────────────────────────────

function Message({ msg }: { msg: ChatMessage }) {
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

  const hadHtmlUpdate = /<HTML_UPDATE>/i.test(msg.content);
  const text = msg.content.replace(/<HTML_UPDATE>[\s\S]*?<\/HTML_UPDATE>/gi, '').trim();

  return (
    <div className="flex gap-3">
      <div className="w-7 h-7 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0 mt-0.5">
        <svg className="w-3.5 h-3.5 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2a10 10 0 110 20A10 10 0 0112 2zm0 2a8 8 0 100 16A8 8 0 0012 4z" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 mb-1">AI Assistant</p>
        
        {/* Show AI's explanation if it exists */}
        {text && (
          <div className={`text-sm leading-relaxed whitespace-pre-wrap mb-2 ${msg.isError ? 'text-red-400' : 'text-gray-200'}`}>
            {text}
          </div>
        )}
        
        {/* Show update badge */}
        {hadHtmlUpdate && (
          <div className="flex items-center gap-1.5 text-xs text-green-400 bg-green-500/10 px-2.5 py-1.5 rounded-lg border border-green-500/20 w-fit">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Preview updated
          </div>
        )}
        
        {/* Fallback if no text and no HTML update */}
        {!text && !hadHtmlUpdate && (
          <div className="text-sm text-gray-500 italic">
            No response
          </div>
        )}
      </div>
    </div>
  );
}
