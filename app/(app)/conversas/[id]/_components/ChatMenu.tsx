'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { REPORT_REASONS, type ConversationStatus, type ReportReason } from '@abilar/shared';
import { REPORT_REASON_LABEL } from '@/lib/labels';
import { reportConversation, setConversationStatus } from '@/lib/chat/actions';

const SUPPORT_EMAIL = 'suporte@abilar.com.br'; // TODO: confirmar e-mail oficial de suporte

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

  const item = 'w-full px-4 py-2.5 text-left text-sm text-charcoal hover:bg-deep';

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          setReporting(false);
        }}
        aria-label="Opções da conversa"
        className="rounded-lg px-2 py-1 text-xl text-muted hover:bg-deep hover:text-charcoal"
      >
        ⋮
      </button>

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
              {error && <p className="mb-2 text-xs text-ochre">{error}</p>}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={submitReport}
                  disabled={pending}
                  className="flex-1 rounded-lg bg-brand-primary px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {pending ? 'Enviando…' : 'Enviar denúncia'}
                </button>
                <button
                  type="button"
                  onClick={() => setReporting(false)}
                  className="rounded-lg border border-subtle px-3 py-2 text-sm text-charcoal"
                >
                  Voltar
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col py-1">
              <button type="button" className={item} onClick={() => setReporting(true)}>
                🚩 Denunciar conversa
              </button>
              {status === 'ACTIVE' && (
                <button type="button" className={item} onClick={() => changeStatus('CLOSED')}>
                  ✓ Encerrar conversa
                </button>
              )}
              {status === 'CLOSED' && (
                <button type="button" className={item} onClick={() => changeStatus('ACTIVE')}>
                  ↩︎ Reabrir conversa
                </button>
              )}
              {status !== 'BLOCKED' && (
                <button
                  type="button"
                  className={`${item} text-ochre`}
                  onClick={() =>
                    changeStatus('BLOCKED', 'Bloquear esta conversa? Você não troca mais mensagens e só o suporte reabre.')
                  }
                >
                  ⛔ Bloquear
                </button>
              )}
              <a
                href={`mailto:${SUPPORT_EMAIL}?subject=Suporte%20-%20conversa%20${conversationId}`}
                className={item}
              >
                💬 Falar com o suporte
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
