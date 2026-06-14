'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { REPORT_REASONS, type ConversationStatus, type ReportReason } from '@abilar/shared';
import { REPORT_REASON_LABEL } from '@/lib/labels';
import { reportConversation, setConversationStatus } from '@/lib/chat/actions';
import { Button } from '@/components/ui';
import { IconMais, IconDenuncias, IconOk, IconAtualizar, IconBloqueado, IconConversas } from '@/components/ui/icons';

const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? 'suporte@abilar.com.br';

/** Menu de moderação do chat (§7.8): denunciar, encerrar/reabrir, bloquear, suporte. */
export function ChatMenu({
  conversationId,
  status,
}: {
  conversationId: string;
  status: ConversationStatus;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState<ReportReason>('CONTACT_OUTSIDE');
  const [detail, setDetail] = useState('');
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const changeStatus = (next: ConversationStatus, confirmMsg?: string) => {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    start(async () => {
      setError(null);
      const r = await setConversationStatus(conversationId, next);
      if (!r.ok) return setError(r.error);
      setOpen(false);
      router.refresh();
    });
  };

  const submitReport = () =>
    start(async () => {
      setError(null);
      const r = await reportConversation(conversationId, { reason, detail: detail.trim() || undefined });
      if (!r.ok) return setError(r.error);
      setReporting(false);
      setDone('Denúncia enviada. Nossa equipe vai analisar. Obrigado por avisar.');
      setDetail('');
    });

  const item = 'flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-charcoal hover:bg-deep';

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          setOpen((v) => !v);
          setReporting(false);
        }}
        aria-label="Opções da conversa"
      >
        <IconMais size={20} />
      </Button>

      {open && (
        <div className="absolute right-0 z-30 mt-1 w-64 overflow-hidden rounded-xl border border-subtle bg-surface shadow-lg">
          {reporting ? (
            <div className="p-4">
              <p className="mb-2 text-sm font-semibold text-charcoal">Denunciar conversa</p>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value as ReportReason)}
                className="mb-2 w-full rounded-lg border border-subtle bg-surface px-3 py-2 text-sm"
              >
                {REPORT_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {REPORT_REASON_LABEL[r]}
                  </option>
                ))}
              </select>
              <textarea
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                placeholder="Conte o que aconteceu (opcional)"
                className="mb-2 min-h-16 w-full rounded-lg border border-subtle bg-surface px-3 py-2 text-sm"
              />
              {error && <p className="mb-2 text-xs text-danger">{error}</p>}
              <div className="flex gap-2">
                <Button variant="primary" size="sm" className="flex-1" onClick={submitReport} disabled={pending}>
                  {pending ? 'Enviando…' : 'Enviar denúncia'}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setReporting(false)}>
                  Voltar
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col py-1">
              <button type="button" className={item} onClick={() => setReporting(true)}>
                <IconDenuncias size={16} aria-hidden /> Denunciar conversa
              </button>
              {status === 'ACTIVE' && (
                <button type="button" className={item} onClick={() => changeStatus('CLOSED')}>
                  <IconOk size={16} aria-hidden /> Encerrar conversa
                </button>
              )}
              {status === 'CLOSED' && (
                <button type="button" className={item} onClick={() => changeStatus('ACTIVE')}>
                  <IconAtualizar size={16} aria-hidden /> Reabrir conversa
                </button>
              )}
              {status !== 'BLOCKED' && (
                <button
                  type="button"
                  className={`${item} text-danger`}
                  onClick={() =>
                    changeStatus('BLOCKED', 'Bloquear esta conversa? Você não troca mais mensagens e só o suporte reabre.')
                  }
                >
                  <IconBloqueado size={16} aria-hidden /> Bloquear
                </button>
              )}
              <a
                href={`mailto:${SUPPORT_EMAIL}?subject=Suporte%20-%20conversa%20${conversationId}`}
                className={item}
              >
                <IconConversas size={16} aria-hidden /> Falar com o suporte
              </a>
            </div>
          )}
        </div>
      )}

      {done && (
        <div className="absolute right-0 z-30 mt-1 w-64 rounded-xl border border-subtle bg-surface p-4 shadow-lg">
          <p className="text-sm text-charcoal">{done}</p>
          <button
            type="button"
            onClick={() => setDone(null)}
            className="mt-2 text-sm font-semibold text-brand-primary"
          >
            Fechar
          </button>
        </div>
      )}
    </div>
  );
}
