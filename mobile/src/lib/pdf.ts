import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import type { ContractView } from './data';
import { CONTRACT_CLAUSES, CONTRACT_LEGAL_NOTE } from './contract';

const brl = (c?: number | null) => ((c ?? 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// Gera um PDF do orçamento/contrato no próprio aparelho e abre o compartilhamento
// (não depende de Browser Rendering no servidor).
export async function shareContractPdf(c: ContractView): Promise<void> {
  const t = c.terms ?? {};
  const items = (t.items ?? [])
    .map((i) => `<tr><td>${escapeHtml(i.name)}</td><td>${i.qty} ${escapeHtml(i.unit)}</td></tr>`)
    .join('');
  const milestones = (t.milestones ?? [])
    .map((m, i) => `<tr><td>${i + 1}. ${escapeHtml(m.label)} (${m.pct}%)</td><td>${escapeHtml(m.event)}</td></tr>`)
    .join('');
  const clauses = CONTRACT_CLAUSES.map((cl) => `<h3>${escapeHtml(cl.title)}</h3><p>${escapeHtml(cl.body)}</p>`).join('');

  const html = `<!doctype html><html><head><meta charset="utf-8" />
  <style>
    body{font-family:-apple-system,Helvetica,Arial,sans-serif;color:#1F2421;padding:28px;font-size:13px;line-height:1.5}
    h1{color:#C56A33;font-size:22px;margin:0 0 4px} h2{font-size:15px;margin:18px 0 6px;color:#2F6B5E}
    h3{font-size:13px;margin:10px 0 2px} p{margin:2px 0;color:#444}
    table{width:100%;border-collapse:collapse;margin-top:6px} td{border-bottom:1px solid #eee;padding:6px 4px;vertical-align:top}
    .muted{color:#777} .big{font-size:18px;font-weight:700}
  </style></head><body>
    <h1>abilar</h1>
    <p class="muted">Orçamento / Contrato — ${escapeHtml(c.projectTitle)}</p>
    <p class="muted">Entre o cliente e ${escapeHtml(c.otherName)}</p>
    <h2>Valores</h2>
    <p class="big">À vista: ${brl(t.avistaCents ?? c.value_cents)}</p>
    ${t.parceladoCents != null && t.installmentValueCents != null ? `<p>Parcelado: ${t.clientInstallments}x de ${brl(t.installmentValueCents)}</p>` : ''}
    ${items ? `<h2>Itens</h2><table>${items}</table>` : ''}
    ${milestones ? `<h2>Cronograma e liberação (escrow)</h2><table>${milestones}</table>` : ''}
    <h2>Cláusulas</h2>${clauses}
    <p class="muted" style="margin-top:16px;font-style:italic">${escapeHtml(CONTRACT_LEGAL_NOTE)}</p>
  </body></html>`;

  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch] ?? ch));
}

// PDF de um orçamento avulso (para o marceneiro mandar ao cliente dele).
export async function shareExternalQuotePdf(q: {
  clientName: string;
  title: string;
  items: { name: string; qty: number; unit: string }[];
  valueCents: number;
  note: string | null;
  carpenterName?: string;
}): Promise<void> {
  const items = q.items.map((i) => `<tr><td>${escapeHtml(i.name)}</td><td style="text-align:right">${i.qty} ${escapeHtml(i.unit)}</td></tr>`).join('');
  const html = `<!doctype html><html><head><meta charset="utf-8" />
  <style>
    body{font-family:-apple-system,Helvetica,Arial,sans-serif;color:#1F2421;padding:28px;font-size:13px;line-height:1.5}
    h1{color:#C56A33;font-size:22px;margin:0 0 4px} h2{font-size:14px;margin:16px 0 6px;color:#2F6B5E}
    p{margin:2px 0} .muted{color:#777}
    table{width:100%;border-collapse:collapse;margin-top:6px} td{border-bottom:1px solid #eee;padding:6px 4px}
    .total{display:flex;justify-content:space-between;border-top:1px solid #ccc;margin-top:14px;padding-top:10px}
    .big{font-size:20px;font-weight:700}
  </style></head><body>
    <h1>abilar</h1>
    <p class="muted">Orçamento${q.carpenterName ? ` · ${escapeHtml(q.carpenterName)}` : ''}</p>
    <h2>Cliente</h2><p>${escapeHtml(q.clientName)}</p>
    <h2>Serviço</h2><p>${escapeHtml(q.title)}</p>
    ${items ? `<h2>Itens inclusos</h2><table>${items}</table>` : ''}
    <div class="total"><span class="muted">TOTAL</span><span class="big">${brl(q.valueCents)}</span></div>
    ${q.note ? `<h2>Observação</h2><p>${escapeHtml(q.note)}</p>` : ''}
    <p class="muted" style="margin-top:18px;font-size:11px">Orçamento gerado pela Abilar.</p>
  </body></html>`;

  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
  }
}
