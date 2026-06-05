'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { maskContact } from '@abilar/shared';
import { sendMessage } from '@/lib/chat/actions';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

type Msg = { id: string; senderId: string; text: string };

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
  const [, start] = useTransition();
  const endRef = useRef<HTMLDivElement | null>(null);

  // Rola para o fim quando chega mensagem.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Realtime: novas mensagens da conversa (a RLS garante só participantes).
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(`conv:${conversationId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const m = payload.new as { id: string; sender_id: string; body: string; redacted_body: string | null };
          const real: Msg = { id: m.id, senderId: m.sender_id, text: m.redacted_body ?? m.body };
          setMessages((prev) => {
            if (prev.some((x) => x.id === real.id)) return prev;
            // remove o otimista do próprio remetente, se houver
            const cleaned = prev.filter((x) => !(x.id.startsWith('temp-') && x.senderId === real.senderId));
            return [...cleaned, real];
          });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  const send = () => {
    const body = text.trim();
    if (!body) return;
    setText('');
    // Otimista (mascarado no client) — a versão real chega pelo Realtime.
    const temp: Msg = { id: `temp-${Date.now()}`, senderId: meId, text: maskContact(body) };
    setMessages((prev) => [...prev, temp]);
    start(async () => {
      await sendMessage(conversationId, body);
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
              <span
                className={`max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-4 py-2 text-base ${
                  mine ? 'rounded-br-sm bg-brand-primary text-white' : 'rounded-bl-sm bg-deep text-charcoal'
                }`}
              >
                {m.text}
              </span>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <div className="border-t border-subtle p-3">
        {active ? (
          <div className="flex items-end gap-2">
            <textarea
              rows={1}
              className="max-h-40 min-h-[3rem] flex-1 resize-none rounded-xl border border-subtle bg-surface px-4 py-3 text-base text-charcoal outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
              placeholder="Escreva uma mensagem…  (Enter envia · Shift+Enter quebra linha)"
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
