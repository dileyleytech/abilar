'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { mmToCm, type Category } from '@abilar/shared';
import type { DesignState, DesignModule } from '@abilar/ai-vision';
import { proposalTurn, proposeDesign } from '@/lib/design/actions';
import { Card, Button, Badge, inputClass } from '@/components/ui';
import { IconEnviar, IconAbi } from '@/components/ui/icons';

type Msg = { role: 'USER' | 'ABI'; text: string };

const TYPE_LABEL: Record<Category, string> = {
  GUARDA_ROUPA: 'Guarda-roupa', COZINHA: 'Cozinha', PAINEL_TV: 'Painel de TV', ESTANTE: 'Estante',
  HOME_OFFICE: 'Home office', BANHEIRO: 'Banheiro', LAVANDERIA: 'Lavanderia', OUTRO: 'Móvel',
};
const EXAMPLES = ['Troca pra MDF 25mm', 'Gaveteiro de 4 no lugar das portas', 'Acabamento amadeirado', 'Adiciona LED'];

export function ProposalEditor({ projectId, initialState }: { projectId: string; initialState: DesignState }) {
  const router = useRouter();
  const [state, setState] = useState<DesignState>(initialState);
  const [messages, setMessages] = useState<Msg[]>([
    { role: 'ABI', text: 'Edite uma cópia do projeto do cliente. Quando terminar, envie como sugestão (o cliente aprova) ou aplique como edição do seu orçamento.' },
  ]);
  const [text, setText] = useState('');
  const [note, setNote] = useState('');
  const [pending, start] = useTransition();
  const say = (m: Msg) => setMessages((p) => [...p, m]);

  const send = (raw: string) => {
    const u = raw.trim();
    if (!u || pending) return;
    setText('');
    say({ role: 'USER', text: u });
    start(async () => {
      const r = await proposalTurn(projectId, state, u);
      if (!r.ok) return say({ role: 'ABI', text: r.error });
      if (r.data.command.intent !== 'ASK_HELP') setState(r.data.state);
      say({ role: 'ABI', text: r.data.message });
    });
  };

  const submit = (type: 'SUGGESTION' | 'EDIT') => {
    start(async () => {
      const r = await proposeDesign(projectId, { type, note: note.trim() || undefined, state });
      if (!r.ok) return say({ role: 'ABI', text: r.error });
      say({ role: 'ABI', text: type === 'SUGGESTION' ? 'Sugestão enviada ao cliente para aprovação. 👍' : 'Edição registrada na sua proposta.' });
      setTimeout(() => router.push(`/marceneiro/pedidos/${projectId}`), 900);
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <Card pad="sm">
        <p className="mb-2 text-small font-semibold text-muted">Projeto proposto</p>
        <ul className="flex flex-col gap-2">
          {state.modules.map((m: DesignModule) => (
            <li key={m.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-small text-charcoal">
              <strong>{m.label?.trim() || TYPE_LABEL[m.type] || 'Móvel'}</strong>
              <span className="text-muted">{mmToCm(m.widthMm)}×{mmToCm(m.heightMm)}×{mmToCm(m.depthMm)} cm</span>
              {m.finish && <Badge tone="primary">{m.finish}</Badge>}
              {m.material && <Badge tone="neutral">{m.material}</Badge>}
              {m.hardware && <Badge tone="neutral">{m.hardware}</Badge>}
              {m.lighting && <Badge tone="success">LED</Badge>}
            </li>
          ))}
        </ul>
      </Card>

      <div className="flex min-h-[160px] flex-col gap-3">
        {messages.map((m, i) => (
          <div key={i} className={m.role === 'USER' ? 'flex justify-end' : 'flex items-start gap-2'}>
            {m.role === 'ABI' && <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-secondary/15 text-brand-secondary" aria-hidden><IconAbi size={16} /></span>}
            <div className={m.role === 'USER' ? 'max-w-[80%] rounded-lg rounded-tr-sm bg-brand-primary px-3 py-2 text-small text-white' : 'max-w-[80%] rounded-lg rounded-tl-sm bg-surface px-3 py-2 text-small text-charcoal shadow-card'}>{m.text}</div>
          </div>
        ))}
        {pending && <p className="pl-9 text-small text-subtle">processando…</p>}
      </div>

      <div className="flex flex-wrap gap-2">
        {EXAMPLES.map((ex) => (
          <button key={ex} type="button" disabled={pending} onClick={() => send(ex)} className="rounded-pill border border-subtle bg-surface px-3 py-1 text-caption text-muted transition hover:border-brand-primary/40 hover:text-charcoal disabled:opacity-50">{ex}</button>
        ))}
      </div>

      <form onSubmit={(e) => { e.preventDefault(); send(text); }} className="flex items-center gap-2">
        <input className={`${inputClass} flex-1`} placeholder="Ex.: troca as 2 portas por um gaveteiro de 4…" value={text} onChange={(e) => setText(e.target.value)} disabled={pending} />
        <Button type="submit" variant="primary" size="md" disabled={pending || !text.trim()} aria-label="Enviar"><IconEnviar size={18} aria-hidden /></Button>
      </form>

      <Card pad="sm" className="flex flex-col gap-3">
        <textarea className={inputClass} rows={2} placeholder="Mensagem ao cliente (opcional): por que essa mudança é melhor…" value={note} onChange={(e) => setNote(e.target.value)} />
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => submit('SUGGESTION')} disabled={pending}>Enviar sugestão ao cliente</Button>
          <Button variant="outline" onClick={() => submit('EDIT')} disabled={pending}>Aplicar como edição da minha proposta</Button>
        </div>
      </Card>
    </div>
  );
}
