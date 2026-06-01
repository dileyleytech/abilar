'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CATEGORIES, type Category, type WorkType } from '@abilar/shared';
import { createProject, registerProjectPhoto } from '@/lib/projects/actions';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { CATEGORY_LABELS, CATEGORY_EMOJI } from '@/lib/labels';

type Path = 'AI' | 'ARCHITECT';
type Step = 'path' | 'work' | 'category' | 'measures' | 'photo' | 'pdf';

const big = 'w-full rounded-xl px-5 py-4 text-lg font-semibold transition hover:opacity-90';
const card =
  'flex items-center gap-4 rounded-xl border border-subtle bg-surface px-5 py-4 text-left transition hover:-translate-y-0.5 hover:border-brand-primary/50 hover:shadow-sm';

export function NovoPedido() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('path');
  const [path, setPath] = useState<Path>('AI');
  const [workType, setWorkType] = useState<WorkType>('NEW_INSTALL');
  const [category, setCategory] = useState<Category | null>(null);
  const [ambiente, setAmbiente] = useState('');
  const [w, setW] = useState('');
  const [h, setH] = useState('');
  const [d, setD] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (opts: { withMeasures: boolean; photoKind?: 'ORIGINAL_ROOM' | 'ARCHITECT_PDF' }) => {
    if (!category) return;
    setError(null);
    setLoading(true);
    try {
      const res = await createProject({
        project: {
          category,
          workType,
          sourceType: path === 'ARCHITECT' ? 'ARCHITECT_PROJECT' : 'AI_GENERATED',
        },
        firstModule: opts.withMeasures
          ? {
              type: category,
              ambiente: ambiente.trim() || undefined,
              widthMm: Number(w),
              heightMm: Number(h),
              depthMm: Number(d),
            }
          : undefined,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      const projectId = res.data.projectId;

      if (file && opts.photoKind) {
        const supabase = createSupabaseBrowserClient();
        const safe = file.name.replace(/[^\w.-]/g, '_');
        const objectPath = `${projectId}/${Date.now()}-${safe}`;
        const up = await supabase.storage.from('project-photos').upload(objectPath, file);
        if (!up.error) {
          await registerProjectPhoto(projectId, { kind: opts.photoKind, path: objectPath });
        }
        // Falha de upload não bloqueia o pedido (o cliente pode enviar depois).
      }
      router.push(`/pedidos/${projectId}`);
    } finally {
      setLoading(false);
    }
  };

  if (step === 'path') {
    return (
      <Frame title="Como você quer começar?">
        <button type="button" className={card} onClick={() => { setPath('AI'); setStep('work'); }}>
          <span className="text-3xl" aria-hidden>💬</span>
          <span>
            <span className="block text-lg font-semibold text-charcoal">Criar com a ABI</span>
            <span className="block text-sm text-muted">Mando uma foto e converso pra ver o móvel</span>
          </span>
        </button>
        <button type="button" className={card} onClick={() => { setPath('ARCHITECT'); setStep('work'); }}>
          <span className="text-3xl" aria-hidden>📐</span>
          <span>
            <span className="block text-lg font-semibold text-charcoal">Tenho projeto de arquiteto</span>
            <span className="block text-sm text-muted">Envio o PDF do projeto</span>
          </span>
        </button>
      </Frame>
    );
  }

  if (step === 'work') {
    return (
      <Frame title="O que você precisa?">
        {([
          { v: 'NEW_INSTALL', emoji: '🆕', t: 'Quero um móvel novo', s: 'Não existe nada no lugar' },
          { v: 'REPLACE_EXISTING', emoji: '🔁', t: 'Quero trocar um que já tenho', s: 'Substituir o móvel atual' },
        ] as const).map((o) => (
          <button key={o.v} type="button" className={card} onClick={() => { setWorkType(o.v); setStep('category'); }}>
            <span className="text-3xl" aria-hidden>{o.emoji}</span>
            <span>
              <span className="block text-lg font-semibold text-charcoal">{o.t}</span>
              <span className="block text-sm text-muted">{o.s}</span>
            </span>
          </button>
        ))}
      </Frame>
    );
  }

  if (step === 'category') {
    return (
      <Frame title="O que você quer fazer?">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              className="flex flex-col items-center gap-2 rounded-xl border border-subtle bg-surface px-3 py-5 text-center text-base font-medium text-charcoal transition hover:-translate-y-0.5 hover:border-brand-primary/50 hover:shadow-sm"
              onClick={() => { setCategory(c); setStep(path === 'AI' ? 'measures' : 'pdf'); }}
            >
              <span className="text-2xl" aria-hidden>{CATEGORY_EMOJI[c]}</span>
              {CATEGORY_LABELS[c]}
            </button>
          ))}
        </div>
      </Frame>
    );
  }

  if (step === 'measures') {
    const ready = Number(w) > 0 && Number(h) > 0 && Number(d) > 0;
    return (
      <Frame title="Seu primeiro móvel">
        <label className="flex flex-col gap-1">
          <span className="text-base text-charcoal">Cômodo (opcional)</span>
          <input
            type="text"
            placeholder="Ex.: Cozinha, Quarto do casal"
            className="w-full rounded-xl border border-subtle bg-surface px-4 py-4 text-lg text-charcoal outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
            value={ambiente}
            onChange={(e) => setAmbiente(e.target.value)}
          />
        </label>
        <p className="text-sm text-muted">Medidas do vão onde o móvel vai ficar (em cm).</p>
        <Measure label="Largura (cm)" value={w} onChange={setW} />
        <Measure label="Altura (cm)" value={h} onChange={setH} />
        <Measure label="Profundidade (cm)" value={d} onChange={setD} />
        <p className="rounded-md bg-deep px-4 py-3 text-sm text-muted">
          💡 Depois você pode adicionar <strong>mais móveis</strong> e <strong>outros cômodos</strong> a este pedido.
        </p>
        <button type="button" className={`${big} bg-brand text-white disabled:opacity-50`} disabled={!ready} onClick={() => setStep('photo')}>
          Continuar
        </button>
      </Frame>
    );
  }

  if (step === 'photo') {
    const hint =
      workType === 'NEW_INSTALL'
        ? 'Fotografe a parede/espaço vazio onde quer o móvel.'
        : 'Fotografe o móvel atual que será trocado.';
    return (
      <Frame title="Foto do cômodo (opcional)">
        <p className="text-sm text-muted">{hint}</p>
        <input
          type="file"
          accept="image/*"
          className="w-full rounded-md border border-subtle bg-surface px-4 py-4 text-base"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <button type="button" className={`${big} bg-brand text-white`} disabled={loading} onClick={() => submit({ withMeasures: true, photoKind: 'ORIGINAL_ROOM' })}>
          {loading ? 'Criando…' : 'Criar pedido'}
        </button>
        <Err error={error} />
      </Frame>
    );
  }

  // step === 'pdf' (caminho arquiteto)
  return (
    <Frame title="Envie o PDF do projeto">
      <input
        type="file"
        accept="application/pdf"
        className="w-full rounded-md border border-subtle bg-surface px-4 py-4 text-base"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />
      <button type="button" className={`${big} bg-brand text-white`} disabled={loading} onClick={() => submit({ withMeasures: false, photoKind: 'ARCHITECT_PDF' })}>
        {loading ? 'Criando…' : 'Criar pedido'}
      </button>
      <Err error={error} />
    </Frame>
  );
}

function Frame({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-center text-lg font-semibold text-charcoal">{title}</h2>
      {children}
    </div>
  );
}

function Measure({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-base text-charcoal">{label}</span>
      <input
        type="number"
        inputMode="numeric"
        min={1}
        className="w-full rounded-xl border border-subtle bg-surface px-4 py-4 text-lg text-charcoal outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function Err({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p className="rounded-md bg-ochre/20 px-4 py-3 text-base text-charcoal" role="alert">
      {error}
    </p>
  );
}
