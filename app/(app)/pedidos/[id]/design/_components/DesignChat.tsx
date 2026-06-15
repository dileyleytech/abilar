'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { mmToCm, type Category } from '@abilar/shared';
import type { DesignState, DesignModule, Hardware } from '@abilar/ai-vision';
import { designTurn, restoreDesign, requestDesignPreview } from '@/lib/design/actions';
import { Card, Button, Badge, inputClass } from '@/components/ui';
import { IconEnviar, IconVoltar, IconAbi, IconObra, IconFoto } from '@/components/ui/icons';

type Msg = { role: 'USER' | 'ABI'; text: string };

const TYPE_LABEL: Record<Category, string> = {
  GUARDA_ROUPA: 'Guarda-roupa', COZINHA: 'Cozinha', PAINEL_TV: 'Painel de TV', ESTANTE: 'Estante',
  HOME_OFFICE: 'Home office', BANHEIRO: 'Banheiro', LAVANDERIA: 'Lavanderia', OUTRO: 'Móvel',
};
const HARDWARE_LABEL: Record<Hardware, string> = {
  PUSH: 'Abertura por toque', PUXADOR_CAVA: 'Puxador cava', SOFT_CLOSE: 'Soft-close',
};
const EXAMPLES = [
  'Muda a cor para verde',
  'Aumenta a altura em 10 cm',
  'Adiciona uma gaveta embaixo',
  'Troca o material para MDF 25mm',
  'Coloca soft-close',
  'Fita de LED nas prateleiras',
];

export function DesignChat({ projectId, initialState, initialPreviewUrl }: { projectId: string; initialState: DesignState; initialPreviewUrl?: string | null }) {
  const [state, setState] = useState<DesignState>(initialState);
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialPreviewUrl ?? null);
  const [generating, setGenerating] = useState(false);
  const [history, setHistory] = useState<DesignState[]>([]);
  const [messages, setMessages] = useState<Msg[]>([
    { role: 'ABI', text: 'Oi, eu sou a ABI 👋 Me diga o que quer mudar no seu móvel — a cor, o tamanho, ou adicionar gavetas, por exemplo.' },
  ]);
  const [text, setText] = useState('');
  const [pending, start] = useTransition();
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const say = (m: Msg) => setMessages((prev) => [...prev, m]);

  // Gera/atualiza a prévia. `announce`=false quando é automático (após uma mudança).
  const regen = (announce: boolean) => {
    if (generating) return;
    setGenerating(true);
    if (announce) say({ role: 'ABI', text: 'Beleza! Vou gerar uma prévia do seu móvel — leva alguns segundos.' });
    start(async () => {
      const r = await requestDesignPreview(projectId);
      setGenerating(false);
      if (!r.ok) { say({ role: 'ABI', text: r.error }); return; }
      if (r.data.queued) { say({ role: 'ABI', text: 'Estou gerando sua prévia — ela aparece aqui em instantes.' }); return; }
      if (r.data.url) setPreviewUrl(r.data.url);
      say({ role: 'ABI', text: announce ? 'Prontinho! Sua prévia está aí em cima. 🎨' : 'Atualizei a prévia com a mudança. 🎨' });
    });
  };
  const generate = () => regen(true);

  const doUndo = () => {
    if (history.length === 0) { say({ role: 'ABI', text: 'Não há nada para desfazer.' }); return; }
    const prev = history[history.length - 1]!;
    start(async () => {
      const r = await restoreDesign(projectId, prev);
      if (!r.ok) { say({ role: 'ABI', text: r.error }); return; }
      setState(prev);
      setHistory((h) => h.slice(0, -1));
      say({ role: 'ABI', text: 'Pronto, desfiz a última alteração.' });
      if (previewUrl) regen(false); // reflete o desfazer na prévia
    });
  };

  const send = (raw: string) => {
    const utterance = raw.trim();
    if (!utterance || pending) return;
    setText('');
    say({ role: 'USER', text: utterance });
    const before = state;
    start(async () => {
      const r = await designTurn(projectId, utterance);
      if (!r.ok) { say({ role: 'ABI', text: r.error }); return; }
      const { command, state: next, message } = r.data;
      if (command.intent === 'UNDO') { doUndo(); return; }
      say({ role: 'ABI', text: message });
      if (command.intent !== 'ASK_HELP') {
        setHistory((h) => [...h, before]);
        setState(next);
        if (previewUrl) regen(false); // atualiza a prévia automaticamente após a mudança
      }
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Prévia gerada pela ABI */}
      <Card pad="sm">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-small font-semibold text-muted">Prévia da ABI</p>
          <Button variant="outline" size="sm" onClick={generate} disabled={generating}>
            <IconFoto size={16} aria-hidden /> {previewUrl ? 'Atualizar prévia' : 'Gerar prévia'}
          </Button>
        </div>
        {generating ? (
          <div className="flex aspect-[4/3] items-center justify-center rounded-md bg-deep text-small text-muted">Gerando sua prévia…</div>
        ) : previewUrl ? (
          <div className="relative overflow-hidden rounded-md">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt="Prévia gerada pela ABI" className="w-full" />
            {/* Overlay de cotas (§8.3) — a verdade são as medidas, não a imagem. */}
            <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-center gap-1.5 bg-charcoal/65 px-2 py-1.5">
              <span className="text-caption font-medium text-white/70">Medidas reais (L×A×P):</span>
              {state.modules.map((m) => (
                <span key={m.id} className="rounded bg-white/15 px-1.5 py-0.5 text-caption font-medium text-white">
                  {(m.label?.trim() || TYPE_LABEL[m.type] || 'Móvel')}: {mmToCm(m.widthMm)}×{mmToCm(m.heightMm)}×{mmToCm(m.depthMm)} cm
                </span>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-small text-muted">Gere uma imagem ilustrativa do seu móvel a partir do que você descreveu. A imagem é só ilustrativa — as medidas reais ficam no pedido.</p>
        )}
      </Card>

      {/* Estado atual do projeto (módulos = fonte de verdade) */}
      <Card pad="sm">
        <p className="mb-2 text-small font-semibold text-muted">Como está o projeto</p>
        <ul className="flex flex-col gap-2">
          {state.modules.map((m) => (
            <li key={m.id} className="flex items-start gap-2 text-small">
              <IconObra size={16} className="mt-0.5 shrink-0 text-brand-primary" aria-hidden />
              <span className="text-charcoal"><ModuleSummary m={m} /></span>
            </li>
          ))}
        </ul>
      </Card>

      {/* Transcrição */}
      <div className="flex min-h-[260px] flex-col gap-3">
        {messages.map((m, i) => (
          <div key={i} className={m.role === 'USER' ? 'flex justify-end' : 'flex items-start gap-2'}>
            {m.role === 'ABI' && (
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-secondary/15 text-brand-secondary" aria-hidden>
                <IconAbi size={16} />
              </span>
            )}
            <div className={m.role === 'USER'
              ? 'max-w-[80%] rounded-lg rounded-tr-sm bg-brand-primary px-3 py-2 text-small text-white'
              : 'max-w-[80%] rounded-lg rounded-tl-sm bg-surface px-3 py-2 text-small text-charcoal shadow-card'}>
              {m.text}
            </div>
          </div>
        ))}
        {pending && <p className="pl-9 text-small text-subtle">a ABI está pensando…</p>}
        <div ref={endRef} />
      </div>

      {/* Sugestões */}
      <div className="flex flex-wrap gap-2">
        {EXAMPLES.map((ex) => (
          <button key={ex} type="button" disabled={pending} onClick={() => send(ex)}
            className="rounded-pill border border-subtle bg-surface px-3 py-1 text-caption text-muted transition hover:border-brand-primary/40 hover:text-charcoal disabled:opacity-50">
            {ex}
          </button>
        ))}
      </div>

      {/* Entrada */}
      <form onSubmit={(e) => { e.preventDefault(); send(text); }} className="flex items-center gap-2">
        {history.length > 0 && (
          <Button type="button" variant="ghost" size="md" onClick={doUndo} disabled={pending} aria-label="Desfazer">
            <IconVoltar size={18} aria-hidden /> Desfazer
          </Button>
        )}
        <input
          className={`${inputClass} flex-1`}
          placeholder="Ex.: deixa as portas em carvalho…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={pending}
        />
        <Button type="submit" variant="primary" size="md" disabled={pending || !text.trim()} aria-label="Enviar">
          <IconEnviar size={18} aria-hidden />
        </Button>
      </form>
    </div>
  );
}

function ModuleSummary({ m }: { m: DesignModule }) {
  const dims = `${mmToCm(m.widthMm)}×${mmToCm(m.heightMm)}×${mmToCm(m.depthMm)} cm`;
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
      <strong className="font-semibold">{m.label?.trim() || TYPE_LABEL[m.type] || m.type}</strong>
      <span className="text-muted">{dims}</span>
      {m.finish && <Badge tone="primary">{m.finish}</Badge>}
      {m.material && <Badge tone="neutral">{m.material}</Badge>}
      {m.hardware && <Badge tone="neutral">{HARDWARE_LABEL[m.hardware]}</Badge>}
      {m.lighting && <Badge tone="success">LED</Badge>}
      {m.items?.map((it, k) => (
        <Badge key={k} tone="neutral">{it.qty}× {it.type.toLowerCase()}</Badge>
      ))}
    </span>
  );
}
