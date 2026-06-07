'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import type { ReportReason, ReportStatus } from '@abilar/shared';
import {
  REPORT_REASON_LABEL,
  REPORT_STATUS_LABEL,
  REPORT_STATUS_BADGE,
} from '@/lib/labels';
import { setReportStatus } from '@/lib/moderation/actions';

export type ReportItem = {
  id: string;
  reason: ReportReason;
  detail: string | null;
  status: ReportStatus;
  conversationId: string;
  projectTitle: string;
  reporterName: string;
  dateLabel: string;
};

export function ReportQueue({ items }: { items: ReportItem[] }) {
  const [rows, setRows] = useState(items);
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  function update(id: string, status: ReportStatus) {
    setBusyId(id);
    startTransition(async () => {
      const res = await setReportStatus(id, status);
      if (res.ok) setRows((rs) => rs.map((r) => (r.id === id ? { ...r, status } : r)));
      else alert(res.error);
      setBusyId(null);
    });
  }

  if (rows.length === 0) {
    return (
      <p className="rounded-2xl border border-subtle bg-surface p-6 text-muted">
        Nenhuma denúncia registrada. 👌
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.id} className="rounded-2xl border border-subtle bg-surface p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-semibold text-charcoal">{REPORT_REASON_LABEL[r.reason]}</span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${REPORT_STATUS_BADGE[r.status]}`}>
              {REPORT_STATUS_LABEL[r.status]}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted">
            Obra <span className="text-charcoal">{r.projectTitle}</span> · por {r.reporterName} · {r.dateLabel}
          </p>
          {r.detail ? (
            <p className="mt-2 whitespace-pre-wrap rounded-xl bg-deep/40 p-3 text-sm text-charcoal">{r.detail}</p>
          ) : null}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Link
              href={`/conversas/${r.conversationId}`}
              className="rounded-lg border border-subtle px-3 py-1.5 text-sm font-medium text-charcoal hover:bg-deep/40"
            >
              Abrir conversa
            </Link>
            {r.status === 'OPEN' ? (
              <>
                <button
                  type="button"
                  disabled={pending && busyId === r.id}
                  onClick={() => update(r.id, 'ACTIONED')}
                  className="rounded-lg bg-brand-primary px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
                >
                  Tomar ação
                </button>
                <button
                  type="button"
                  disabled={pending && busyId === r.id}
                  onClick={() => update(r.id, 'DISMISSED')}
                  className="rounded-lg border border-subtle px-3 py-1.5 text-sm font-medium text-muted hover:bg-deep/40 disabled:opacity-50"
                >
                  Dispensar
                </button>
              </>
            ) : (
              <button
                type="button"
                disabled={pending && busyId === r.id}
                onClick={() => update(r.id, 'OPEN')}
                className="rounded-lg border border-subtle px-3 py-1.5 text-sm font-medium text-muted hover:bg-deep/40 disabled:opacity-50"
              >
                Reabrir
              </button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
