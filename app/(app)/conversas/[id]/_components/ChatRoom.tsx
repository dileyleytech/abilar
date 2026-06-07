'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { maskContact } from '@abilar/shared';
import { sendMessage, markConversationRead, signMyChatAttachments } from '@/lib/chat/actions';
import { createAuthedChannel } from '@/lib/supabase/client';

type Msg = { id: string; senderId: string; text: string; attachments: string[] };

const MAX_PHOTOS = 4;

export function ChatRoom({
  conversationId,
  meId,
  active,
  initialMessages,
}: {
  conversationId: string;
  meId: string;
  active: boolean;
  initialMessages: Msg[];
}) {
  const [messages, setMessages] = useState<Msg[]>(initialMessages);
  const [text, setText] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();
  const endRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  // Rola para o fim quando chega mensagem.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Estou vendo a conversa → marca como lida (ao abrir e a cada nova mensagem)
  // e avisa o header pra re-sincronizar a bolinha de não lidas.
  useEffect(() => {
    void markConversationRead(conversationId).then(() => {
      window.dispatchEvent(new CustomEvent('abilar:unread-changed'));
    });
  }, [conversationId, messages.length]);

  // Libera os object URLs das prévias quando trocam/desmontam.
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);

  // Realtime: novas mensagens da conversa (a RLS garante só participantes).
  useEffect(() => {
    let cleanup = () => {};
    let cancelled = false;
    createAuthedChannel(`conv:${conversationId}`).then((res) => {
      if (cancelled || !res) return;
      const { supabase, channel } = res;
      channel
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
          (payload) => {
            const m = payload.new as {
              id: string;
              sender_id: string;
              body: string;
              redacted_body: string | null;
              attachments: string[] | null;
            };
            const paths = m.attachments ?? [];
            const apply = (urls: string[]) => {
              const real: Msg = { id: m.id, senderId: m.sender_id, text: m.redacted_body ?? m.body, attachments: urls };
              setMessages((prev) => {
                if (prev.some((x) => x.id === real.id)) return prev;
                const cleaned = prev.filter((x) => !(x.id.startsWith('temp-') && x.senderId === real.senderId));
                return [...cleaned, real];
              });
            };
            if (paths.length > 0) {
              void signMyChatAttachments(conversationId, paths).then(apply);
            } else {
              apply([]);
            }
          },
        )
        .subscribe();
      cleanup = () => {
        supabase.removeChannel(channel);
      };
    });
    return () => {
      cancelled = true;
      cleanup();
    };
  }, [conversationId]);

  function pickFiles(list: FileList | null) {
    if (!list) return;
    const incoming = Array.from(list).filter((f) => f.type.startsWith('image/'));
    const next = [...files, ...incoming].slice(0, MAX_PHOTOS);
    setFiles(next);
    setPreviews(next.map((f) => URL.createObjectURL(f)));
    setError(next.length < files.length + incoming.length ? `Máximo de ${MAX_PHOTOS} fotos.` : null);
    if (fileRef.current) fileRef.current.value = '';
  }

  function removeFile(i: number) {
    const next = files.filter((_, idx) => idx !== i);
    setFiles(next);
    setPreviews(next.map((f) => URL.createObjectURL(f)));
  }

  const send = () => {
    const body = text.trim();
    if (!body && files.length === 0) return;
    setError(null);
    const sentFiles = files;
    const sentPreviews = previews;
    setText('');
    setFiles([]);
    setPreviews([]);
    // Otimista (texto mascarado + prévias locais) — a versão real chega pelo Realtime.
    const temp: Msg = {
      id: `temp-${Date.now()}`,
      senderId: meId,
      text: body ? maskContact(body) : '',
      attachments: sentPreviews,
    };
    setMessages((prev) => [...prev, temp]);
    start(async () => {
      const fd = new FormData();
      fd.set('conversationId', conversationId);
      fd.set('body', body);
      sentFiles.forEach((f) => fd.append('photos', f));
      const res = await sendMessage(fd);
      if (!res.ok) {
        setError(res.error);
        setMessages((prev) => prev.filter((x) => x.id !== temp.id));
        setText(body);
      }
    });
  };

  return (
    <div className="flex h-[60vh] flex-col rounded-2xl border border-subtle bg-surface">
      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="py-8 text-center text-sm text-muted">Comece a conversa. Combine detalhes e prazos por aqui.</p>
        )}
        {messages.map((m) => {
          const mine = m.senderId === meId;
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] space-y-2 rounded-2xl px-3 py-2 text-base ${
                  mine ? 'rounded-br-sm bg-brand-primary text-white' : 'rounded-bl-sm bg-deep text-charcoal'
                }`}
              >
                {m.attachments.length > 0 && (
                  <div className={`grid gap-1.5 ${m.attachments.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    {m.attachments.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt="anexo" className="h-32 w-full rounded-lg object-cover" />
                      </a>
                    ))}
                  </div>
                )}
                {m.text && <p className="whitespace-pre-wrap break-words px-1">{m.text}</p>}
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <div className="border-t border-subtle p-3">
        {active ? (
          <>
            {previews.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {previews.map((url, i) => (
                  <div key={i} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="prévia" className="h-16 w-16 rounded-lg object-cover" />
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-charcoal text-xs text-white"
                      aria-label="Remover foto"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
            {error && <p className="mb-2 text-center text-xs text-red-600">{error}</p>}
            <div className="flex items-end gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => pickFiles(e.target.files)}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="shrink-0 rounded-xl border border-subtle px-3 py-3 text-xl leading-none text-charcoal transition hover:bg-deep/40"
                aria-label="Anexar foto"
                title="Anexar foto"
              >
                📎
              </button>
              <textarea
                rows={1}
                className="max-h-40 min-h-[3rem] flex-1 resize-none rounded-xl border border-subtle bg-surface px-4 py-3 text-base text-charcoal outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                placeholder="Mensagem…"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
              />
              <button type="button" onClick={send} className="shrink-0 rounded-xl bg-brand-primary px-5 py-3 font-semibold text-white transition hover:opacity-90">
                Enviar
              </button>
            </div>
          </>
        ) : (
          <p className="text-center text-sm text-muted">Esta conversa está fechada.</p>
        )}
        <p className="mt-2 text-center text-xs text-subtle">
          🔒 Para sua segurança, telefone, e-mail e links são ocultados. Feche o negócio pela plataforma (garantia do escrow).
        </p>
      </div>
    </div>
  );
}
