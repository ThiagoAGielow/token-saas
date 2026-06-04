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

const PROVIDERS: { value: Provider; label: string }[] = [
  { value: 'claude', label: 'Claude' },
  { value: 'openai', label: 'GPT-4o' },
  { value: 'gemini', label: 'Gemini' },
];

// Strip <HTML_UPDATE>...</HTML_UPDATE> from displayed assistant messages
function displayContent(content: string) {
  return content.replace(/<HTML_UPDATE>[\s\S]*?<\/HTML_UPDATE>/gi, '').trim()
    || '✓ Website updated.';
}

export default function WebsiteChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [website,    setWebsite]    = useState<Website | null>(null);
  const [messages,   setMessages]   = useState<ChatMessage[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [publishing,    setPublishing]    = useState(false);
  const [showRegenModal, setShowRegenModal] = useState(false);
  const [regenerating,  setRegenerating]  = useState(false);
  const [inviting,      setInviting]      = useState(false);
  const [inviteMsg,     setInviteMsg]     = useState<{ ok: boolean; text: string } | null>(null);

  const [input,    setInput]    = useState('');
  const [provider, setProvider] = useState<Provider>('claude');
  const [sending,  setSending]  = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [regenStreamText, setRegenStreamText] = useState('');

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

  // ── Regenerate ─────────────────────────────────────────────────────────────
  async function handleRegenerate() {
    setShowRegenModal(false);
    setRegenerating(true);
    setRegenStreamText('');
    setMessages([]);

    try {
      const res = await fetch(`/api/websites/${id}/regenerate`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ provider }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(data.error || 'Regeneration failed');
      }
      if (!res.body) throw new Error('Regeneration failed');

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
            if (event.type === 'chunk') { full += event.text; setRegenStreamText(full); }
            else if (event.type === 'error') throw new Error(event.message);
          } catch { /* skip malformed */ }
        }
      }

      setRegenStreamText('');
      await loadChat();
    } catch (err) {
      setRegenStreamText('');
      setMessages([{
        id:        `err-${Date.now()}`,
        role:      'assistant',
        content:   `Regeneration failed: ${(err as Error).message}`,
        createdAt: new Date().toISOString(),
        isError:   true,
      }]);
    } finally {
      setRegenerating(false);
    }
  }

  // ── Invite to GitHub ───────────────────────────────────────────────────────
  async function handleInvite() {
    setInviting(true);
    setInviteMsg(null);
    try {
      const res  = await fetch(`/api/websites/${id}/invite`, { method: 'POST' });
      const data = (await res.json()) as { success?: boolean; username?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Invite failed');
      setInviteMsg({ ok: true, text: `@${data.username} invited — they'll get an email from GitHub.` });
    } catch (err) {
      setInviteMsg({ ok: false, text: (err as Error).message });
    } finally {
      setInviting(false);
      setTimeout(() => setInviteMsg(null), 6000);
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
      const assistantMsg: ChatMessage = {
        id:        `tmp-assistant-${Date.now()}`,
        role:      'assistant',
        content:   full,
        createdAt: new Date().toISOString(),
      };
      setMessages(prev => [...prev, assistantMsg]);
      setStreamingText('');

      // If site HTML changed, refresh website meta so preview link is current
      if (htmlUpdated) {
        setWebsite(prev => prev ? { ...prev } : prev);
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
            onChange={e => setProvider(e.target.value as Provider)}
            disabled={sending || regenerating}
            className="text-xs bg-[#1a1a1a] border border-white/10 text-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-500 disabled:opacity-50"
          >
            {PROVIDERS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>

          <button
            onClick={() => setShowRegenModal(true)}
            disabled={sending || regenerating}
            title="Regenerate site from original prompt"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-gray-300 font-medium transition-colors disabled:opacity-50"
          >
            <svg className={`w-3.5 h-3.5 ${regenerating ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {regenerating ? 'Regenerating…' : 'Regenerate'}
          </button>

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

          <button
            onClick={handleInvite}
            disabled={inviting || sending || regenerating}
            title="Invite your GitHub account as a collaborator on this site's repo"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-gray-300 font-medium transition-colors disabled:opacity-50"
          >
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            {inviting ? 'Inviting…' : 'Invite to GitHub'}
          </button>

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

      {/* Invite result toast */}
      {inviteMsg && (
        <div className={`shrink-0 mb-2 px-4 py-2.5 rounded-lg text-xs font-medium border ${
          inviteMsg.ok
            ? 'bg-green-500/10 border-green-500/20 text-green-400'
            : 'bg-red-500/10 border-red-500/20 text-red-400'
        }`}>
          {inviteMsg.text}
        </div>
      )}

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

        {/* Regenerating overlay */}
        {regenStreamText && (
          <div className="flex flex-col items-center justify-center h-full gap-4 py-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center">
              <svg className="w-6 h-6 text-amber-400 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <div>
              <p className="text-white font-semibold mb-1">Regenerating your site…</p>
              <p className="text-gray-500 text-sm">AI is building a fresh version from your original prompt</p>
            </div>
            <div className="w-48 h-1 rounded-full bg-white/5 overflow-hidden">
              <div className="h-full bg-amber-400 rounded-full animate-pulse w-3/4" />
            </div>
          </div>
        )}

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

      {showRegenModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#111] border border-white/10 p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Regenerate this website?</h3>
                <p className="text-xs text-gray-500 mt-0.5">Costs 5 tokens</p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/15 mb-4 space-y-1.5">
              <p className="text-xs text-gray-300 leading-relaxed">
                AI will build a brand-new version of <span className="text-white font-semibold">{website?.name}</span> from your original prompt using a different creative approach.
              </p>
              <p className="text-xs text-gray-500 leading-relaxed">
                The current HTML will be replaced and your chat history will be cleared. Costs <span className="text-amber-400 font-semibold">5 tokens</span>.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowRegenModal(false)}
                className="flex-1 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 font-medium text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRegenerate}
                className="flex-1 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-white font-semibold text-sm transition-colors"
              >
                Regenerate
              </button>
            </div>
          </div>
        </div>
      )}
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
