'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CATEGORIES, dimensionCmError, type Category, type WorkType } from '@abilar/shared';
import { createProject, registerProjectPhoto } from '@/lib/projects/actions';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { CATEGORY_LABELS, CATEGORY_EMOJI } from '@/lib/labels';

type Path = 'AI' | 'ARCHITECT';
type Step = 'path' | 'work' | 'category' | 'measures' | 'photo' | 'pdf' | 'review';

const STEPS: Record<Path, Step[]> = {
  AI: ['path', 'work', 'category', 'measures', 'photo', 'review'],
  ARCHITECT: ['path', 'work', 'category', 'pdf', 'review'],
};

const big = 'w-full rounded-xl px-5 py-4 text-lg font-semibold transition hover:opacity-90 disabled:opacity-50';
const card =
  'flex items-center gap-4 rounded-xl border border-subtle bg-surface px-5 py-4 text-left transition hover:-translate-y-0.5 hover:border-brand-primary/50 hover:shadow-sm';
const fld =
  'w-full rounded-xl border border-subtle bg-surface px-4 py-4 text-lg text-charcoal outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20';

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

  const order = STEPS[path];
  const goBack = () => {
    const i = order.indexOf(step);
    if (i > 0) setStep(order[i - 1]!);
    setError(null);
  };

  // Validação por medida (mensagem clara).
  const eW = w === '' ? null : dimensionCmError(Number(w));
  const eH = h === '' ? null : dimensionCmError(Number(h));
  const eD = d === '' ? null : dimensionCmError(Number(d));
  const measuresValid = w !== '' && h !== '' && d !== '' && !eW && !eH && !eD;

  const submit = async () => {
    if (!category) return;
    setError(null);
    setLoading(true);
    try {
      const isArchitect = path === 'ARCHITECT';
      const res = await createProject({
        project: { category, workType, sourceType: isArchitect ? 'ARCHITECT_PROJECT' : 'AI_GENERATED' },
        firstModule: isArchitect
          ? undefined
          : { type: category, ambiente: ambiente.trim() || undefined, widthMm: Number(w), heightMm: Number(h), depthMm: Number(d) },
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      const projectId = res.data.projectId;
      if (file) {
        const supabase = createSupabaseBrowserClient();
        const safe = file.name.replace(/[^\w.-]/g, '_');
        const objectPath = `${projectId}/${Date.now()}-${safe}`;
        const up = await supabase.storage.from('project-photos').upload(objectPath, file);
        if (!up.error) {
          await registerProjectPhoto(projectId, { kind: isArchitect ? 'ARCHITECT_PDF' : 'ORIGINAL_ROOM', path: objectPath });
        }
      }
      router.push(`/pedidos/${projectId}`);
    } finally {
      setLoading(false);
    }
  };

  // ── Passos ────────────────────────────────────────────────────────────────
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
      <Frame title="O que você precisa?" onBack={goBack}>
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
      <Frame title="O que você quer fazer?" onBack={goBack}>
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
    return (
      <Frame title="Seu primeiro móvel" onBack={goBack}>
        <label className="flex flex-col gap-1">
          <span className="text-base text-charcoal">Cômodo (opcional)</span>
          <input className={fld} placeholder="Ex.: Cozinha, Quarto do casal" value={ambiente} onChange={(e) => setAmbiente(e.target.value)} />
        </label>
        <p className="text-sm text-muted">Medidas do vão onde o móvel vai ficar (em cm, de 5 a 600).</p>
        <Measure label="Largura (cm)" value={w} onChange={setW} error={eW} />
        <Measure label="Altura (cm)" value={h} onChange={setH} error={eH} />
        <Measure label="Profundidade (cm)" value={d} onChange={setD} error={eD} />
        <p className="rounded-xl bg-deep px-4 py-3 text-sm text-muted">
          💡 Depois você pode adicionar <strong>mais móveis</strong> e <strong>outros cômodos</strong>.
        </p>
        <button type="button" className={`${big} bg-brand-primary text-white`} disabled={!measuresValid} onClick={() => setStep('photo')}>
          Continuar
        </button>
      </Frame>
    );
  }

  if (step === 'photo') {
    const hint = workType === 'NEW_INSTALL' ? 'Fotografe a parede/espaço vazio onde quer o móvel.' : 'Fotografe o móvel atual que será trocado.';
    return (
      <Frame title="Foto do cômodo (opcional)" onBack={goBack}>
        <p className="text-sm text-muted">{hint}</p>
        <input type="file" accept="image/*" className={fld} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        {file && <p className="text-sm text-brand-secondary">✓ {file.name}</p>}
        <button type="button" className={`${big} bg-brand-primary text-white`} onClick={() => setStep('review')}>
          Continuar
        </button>
      </Frame>
    );
  }

  if (step === 'pdf') {
    return (
      <Frame title="Envie o PDF do projeto" onBack={goBack}>
        <input type="file" accept="application/pdf" className={fld} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        {file && <p className="text-sm text-brand-secondary">✓ {file.name}</p>}
        <button type="button" className={`${big} bg-brand-primary text-white`} disabled={!file} onClick={() => setStep('review')}>
          Continuar
        </button>
      </Frame>
    );
  }

  // step === 'review'
  return (
    <Frame title="Confira seu pedido" onBack={goBack}>
      <dl className="divide-y divide-subtle rounded-xl border border-subtle">
        <Row label="Tipo de obra" value={workType === 'NEW_INSTALL' ? 'Móvel novo' : 'Substituição'} />
        <Row label="Categoria" value={category ? `${CATEGORY_EMOJI[category]} ${CATEGORY_LABELS[category]}` : '—'} onEdit={() => setStep('category')} />
        {path === 'AI' ? (
          <>
            <Row label="Cômodo" value={ambiente.trim() || '—'} onEdit={() => setStep('measures')} />
            <Row label="Medidas (L×A×P)" value={`${w} × ${h} × ${d} cm`} onEdit={() => setStep('measures')} />
            <Row label="Foto" value={file ? file.name : 'Sem foto'} onEdit={() => setStep('photo')} />
          </>
        ) : (
          <Row label="PDF do projeto" value={file ? file.name : '—'} onEdit={() => setStep('pdf')} />
        )}
      </dl>

      <button type="button" className={`${big} bg-brand-primary text-white`} disabled={loading} onClick={submit}>
        {loading ? 'Criando…' : 'Criar pedido'}
      </button>
      {error && (
        <p className="rounded-xl bg-ochre/20 px-4 py-3 text-base text-charcoal" role="alert">
          {error}
        </p>
      )}
    </Frame>
  );
}

function Frame({ title, onBack, children }: { title: string; onBack?: () => void; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        {onBack && (
          <button type="button" onClick={onBack} className="rounded-md px-2 py-1 text-sm text-muted hover:bg-deep hover:text-charcoal">
            ← Voltar
          </button>
        )}
        <h2 className="flex-1 text-center text-lg font-semibold text-charcoal">{title}</h2>
        {onBack && <span className="w-16" aria-hidden />}
      </div>
      {children}
    </div>
  );
}

function Measure({ label, value, onChange, error }: { label: string; value: string; onChange: (v: string) => void; error: string | null }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-base text-charcoal">{label}</span>
      <input
        type="number"
        inputMode="numeric"
        min={1}
        className={`${fld} ${error ? 'border-ochre ring-2 ring-ochre/30' : ''}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {error && <span className="text-sm text-ochre">{error}</span>}
    </label>
  );
}

function Row({ label, value, onEdit }: { label: string; value: string; onEdit?: () => void }) {
  return (
    <div className="flex items-center justify-between gap-2 px-4 py-3">
      <div className="min-w-0">
        <dt className="text-xs uppercase tracking-wide text-subtle">{label}</dt>
        <dd className="truncate text-base text-charcoal">{value}</dd>
      </div>
      {onEdit && (
        <button type="button" onClick={onEdit} className="shrink-0 text-sm font-medium text-brand-primary hover:underline">
          Editar
        </button>
      )}
    </div>
  );
}
