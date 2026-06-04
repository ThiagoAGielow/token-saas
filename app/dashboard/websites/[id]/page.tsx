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

interface FileAttachment {
  name:     string;
  mimeType: string;
  dataUrl:  string;
}

type Provider = 'claude' | 'openai' | 'gemini' | 'openrouter';
type Viewport = 'desktop' | 'tablet' | 'mobile';



/** Free models available on OpenRouter (verified live endpoints as of 2026-04-24) */
const OPENROUTER_MODELS: { value: string; label: string; vision: boolean }[] = [
  { value: 'qwen/qwen3-coder:free',                        label: 'Qwen3 Coder 480B (free)',    vision: false },
  { value: 'meta-llama/llama-3.3-70b-instruct:free',       label: 'Llama 3.3 70B (free)',       vision: false },
  { value: 'google/gemma-4-31b-it:free',                   label: 'Gemma 4 31B (free)',         vision: true  },
  { value: 'google/gemma-4-26b-a4b-it:free',               label: 'Gemma 4 26B MoE (free)',     vision: true  },
  { value: 'openai/gpt-oss-120b:free',                     label: 'OpenAI OSS 120B (free)',     vision: false },
  { value: 'nvidia/nemotron-3-super-120b-a12b:free',        label: 'Nemotron Super 120B (free)', vision: false },
  { value: 'nousresearch/hermes-3-llama-3.1-405b:free',    label: 'Hermes 3 405B (free)',       vision: false },
  { value: 'google/gemma-3-27b-it:free',                   label: 'Gemma 3 27B (free)',         vision: true  },
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
  const [publishing,    setPublishing]    = useState(false);
  const [showRegenModal, setShowRegenModal] = useState(false);
  const [regenerating,  setRegenerating]  = useState(false);
  const [inviting,      setInviting]      = useState(false);
  const [inviteMsg,     setInviteMsg]     = useState<{ ok: boolean; text: string } | null>(null);

  const [input,       setInput]       = useState('');
  const [provider]    = useState<Provider>('openrouter');
  const [orModel,     setOrModel]     = useState(OPENROUTER_MODELS[0]!.value);
  const supportsVision = OPENROUTER_MODELS.find(m => m.value === orModel)?.vision ?? false;
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [sending,     setSending]     = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [regenStreamText, setRegenStreamText] = useState('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  // ── File upload ────────────────────────────────────────────────────────────
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        setAttachments(prev => [
          ...prev,
          { name: file.name, mimeType: file.type, dataUrl: reader.result as string },
        ]);
      };
      reader.readAsDataURL(file);
    });
    // reset so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function removeAttachment(idx: number) {
    setAttachments(prev => prev.filter((_, i) => i !== idx));
  }

  // ── Send message ───────────────────────────────────────────────────────────
  async function handleSend(e: React.FormEvent | React.KeyboardEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    setInput('');
    setSending(true);
    setStreamingText('');

    const pendingAttachments = [...attachments];
    setAttachments([]);

    // Optimistically add user message
    const userMsg: ChatMessage = { id: `tmp-${Date.now()}`, role: 'user', content: text, createdAt: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);

    try {
      const body: Record<string, unknown> = { message: text, provider };
      if (provider === 'openrouter') body.model = orModel;
      if (pendingAttachments.length > 0)  body.attachments = pendingAttachments;

      const res = await fetch(`/api/websites/${id}/chat`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
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
          <button
            onClick={() => setShowRegenModal(true)}
            disabled={sending || regenerating}
            title="Regenerate site from original prompt"
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-gray-300 font-medium transition-colors disabled:opacity-50"
          >
            <svg className={`w-3 h-3 ${regenerating ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {regenerating ? 'Regenerating…' : 'Regenerate'}
          </button>
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
          <button
            onClick={handleInvite}
            disabled={inviting || sending || regenerating}
            title="Invite your GitHub account as a collaborator on this site's repo"
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-gray-300 font-medium transition-colors disabled:opacity-50"
          >
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            {inviting ? 'Inviting…' : 'Invite to GitHub'}
          </button>
          <a href={siteUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-gray-300 transition-colors">
            <svg className="w-3 h-3 mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Open site
          </a>
        </div>
      </header>

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
            {/* Attachment chips */}
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {attachments.map((f, i) => (
                  <div key={i} className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/5 border border-white/10 text-xs text-gray-300">
                    <svg className="w-3 h-3 text-gray-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                    <span className="truncate max-w-[100px]">{f.name}</span>
                    <button type="button" onClick={() => removeAttachment(i)} className="text-gray-600 hover:text-red-400 ml-0.5">×</button>
                  </div>
                ))}
              </div>
            )}
            {/* Unified input box */}
            <div className="rounded-xl bg-[#111] border border-white/10 focus-within:border-blue-500/50 transition-colors flex flex-col">
              {/* Top row: textarea */}
              <textarea ref={el => { textareaRef.current = el; inputRef.current = el; }}
                value={input} onChange={handleInputChange} onKeyDown={handleKeyDown}
                placeholder="Ask me to change something…" disabled={sending} rows={1}
                className="w-full bg-transparent text-white text-sm placeholder-gray-600 resize-none focus:outline-none disabled:opacity-50 max-h-40 px-3 pt-3 pb-1" />

              {/* Bottom row: model selector + attach + send */}
              <div className="flex items-center gap-1.5 px-2 pb-2 pt-1">
                {/* Hidden file input */}
                <input ref={fileInputRef} type="file" accept="image/*,.pdf,.txt,.md,.csv"
                  multiple className="hidden" onChange={handleFileChange} />

                {/* Model pill selector */}
                <div className="relative flex items-center">
                  <select value={orModel} onChange={e => {
                    const next = e.target.value;
                    setOrModel(next);
                    const nextSupportsVision = OPENROUTER_MODELS.find(m => m.value === next)?.vision ?? false;
                    if (!nextSupportsVision) setAttachments([]);
                  }} disabled={sending}
                    className="appearance-none text-[11px] font-medium bg-white/5 hover:bg-white/10 text-gray-300 rounded-full pl-2.5 pr-5 py-1 focus:outline-none transition-colors disabled:opacity-40 cursor-pointer">
                    {OPENROUTER_MODELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                  {/* Chevron icon */}
                  <svg className="pointer-events-none absolute right-1.5 w-3 h-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>

                <div className="flex-1" />

                {/* Attach button — only enabled for vision-capable models */}
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  disabled={sending || !supportsVision}
                  title={supportsVision ? 'Attach image' : 'Switch to Gemma 4 or Gemma 3 to attach images'}
                  className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-500 hover:text-gray-300 transition-colors shrink-0 disabled:opacity-30 disabled:cursor-not-allowed">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                </button>

                {/* Send button */}
                <button type="submit" disabled={!input.trim() || sending}
                  className="w-7 h-7 rounded-full bg-blue-500 hover:bg-blue-400 disabled:bg-white/10 disabled:text-gray-600 flex items-center justify-center transition-colors shrink-0">
                  {sending ? (
                    <svg className="w-3 h-3 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                  ) : (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
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
              <button onClick={() => setShowRegenModal(false)}
                className="flex-1 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 font-medium text-sm transition-colors">
                Cancel
              </button>
              <button onClick={handleRegenerate}
                className="flex-1 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-white font-semibold text-sm transition-colors">
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
