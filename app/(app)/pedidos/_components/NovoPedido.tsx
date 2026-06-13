'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createProject, registerProjectPhoto } from '@/lib/projects/actions';
import { searchArchitectsAction } from '@/lib/architects/actions';
import type { ArchitectOption } from '@/lib/architects/queries';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

type Path = 'AI' | 'ARCHITECT';
type Step = 'path' | 'name' | 'pdf';
type PickedArchitect = { id: string; name: string };

const big = 'w-full rounded-xl px-5 py-4 text-lg font-semibold transition hover:opacity-90 disabled:opacity-50';
const card =
  'flex items-center gap-4 rounded-xl border border-subtle bg-surface px-5 py-4 text-left transition hover:-translate-y-0.5 hover:border-brand-primary/50 hover:shadow-sm';
const fld =
  'w-full rounded-xl border border-subtle bg-surface px-4 py-4 text-lg text-charcoal outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20';

export function NovoPedido({ referred = null }: { referred?: PickedArchitect | null }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>('path');
  const [path, setPath] = useState<Path>('AI');
  const [title, setTitle] = useState('');
  const [architect, setArchitect] = useState<PickedArchitect | null>(referred);
  const [cep, setCep] = useState('');
  const [city, setCity] = useState('');
  const [loc, setLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [cepStatus, setCepStatus] = useState<'idle' | 'loading' | 'found' | 'error'>('idle');
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'creating' | 'uploading'>('idle');
  const [error, setError] = useState<string | null>(null);
  const busy = status !== 'idle';
  const nameOk = title.trim().length >= 2 && city.trim().length >= 2;

  const onCepChange = (raw: string) => {
    setCep(raw);
    const digits = raw.replace(/\D/g, '');
    if (digits.length !== 8) return setCepStatus('idle');
    setCepStatus('loading');
    fetch(`/api/cep?cep=${digits}`)
      .then((r) => r.json())
      .then((d) => {
        if (d?.ok) {
          if (d.city) setCity(d.city);
          if (typeof d.lat === 'number' && typeof d.lng === 'number') setLoc({ lat: d.lat, lng: d.lng });
          setCepStatus('found');
        } else setCepStatus('error');
      })
      .catch(() => setCepStatus('error'));
  };

  const submit = async () => {
    if (!nameOk) return;
    setError(null);
    setStatus('creating');
    try {
      const isArchitect = path === 'ARCHITECT';
      const res = await createProject({
        project: {
          title: title.trim(),
          sourceType: isArchitect ? 'ARCHITECT_PROJECT' : 'AI_GENERATED',
          city: city.trim() || undefined,
          cep: cep.trim() || undefined,
          lat: loc?.lat,
          lng: loc?.lng,
          architectId: architect?.id,
        },
      });
      if (!res.ok) {
        setError(res.error);
        setStatus('idle');
        return;
      }
      const projectId = res.data.projectId;
      if (isArchitect && file) {
        setStatus('uploading');
        const objectPath = `${projectId}/${Date.now()}-${file.name.replace(/[^\w.-]/g, '_')}`;
        const supabase = createSupabaseBrowserClient();
        const up = await supabase.storage.from('project-photos').upload(objectPath, file);
        if (!up.error) await registerProjectPhoto(projectId, { kind: 'ARCHITECT_PDF', path: objectPath });
      }
      // Projeto de arquiteto: o PDF já tem tudo, não pede móveis. Fluxo da ABI:
      // vai com o form de móvel aberto para o cliente adicionar os cômodos/fotos.
      router.push(isArchitect ? `/pedidos/${projectId}` : `/pedidos/${projectId}?novo=1`);
    } catch {
      setError('Algo deu errado. Tente de novo.');
      setStatus('idle');
    }
  };

  if (step === 'path') {
    return (
      <Frame title="Como você quer começar?">
        <button type="button" className={card} onClick={() => { setPath('AI'); setStep('name'); }}>
          <span className="text-3xl" aria-hidden>💬</span>
          <span>
            <span className="block text-lg font-semibold text-charcoal">Montar com a ABI</span>
            <span className="block text-sm text-muted">Adiciono os cômodos e móveis e mando fotos</span>
          </span>
        </button>
        <button type="button" className={card} onClick={() => { setPath('ARCHITECT'); setStep('name'); }}>
          <span className="text-3xl" aria-hidden>📐</span>
          <span>
            <span className="block text-lg font-semibold text-charcoal">Tenho projeto de arquiteto</span>
            <span className="block text-sm text-muted">Envio o PDF do projeto</span>
          </span>
        </button>
      </Frame>
    );
  }

  if (step === 'name') {
    return (
      <Frame title="Dê um nome ao seu pedido" onBack={() => setStep('path')}>
        <p className="text-sm text-muted">
          Um pedido pode ter vários cômodos e móveis. Dê um nome que te ajude a reconhecer.
        </p>
        <input
          className={fld}
          placeholder="Ex.: Reforma do apartamento, Casa nova"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
        />
        <label className="flex flex-col gap-1">
          <span className="text-base text-charcoal">CEP da obra</span>
          <input className={fld} inputMode="numeric" placeholder="00000-000" value={cep} onChange={(e) => onCepChange(e.target.value)} />
        </label>
        {cepStatus === 'loading' && <p className="text-sm text-muted">Buscando endereço…</p>}
        {cepStatus === 'error' && <p className="text-sm text-ochre">CEP não encontrado — confira o número.</p>}
        <label className="flex flex-col gap-1">
          <span className="text-base text-charcoal">Cidade da obra</span>
          <input className={fld} placeholder="Preenche pelo CEP" value={city} onChange={(e) => setCity(e.target.value)} />
        </label>
        <p className="text-sm text-muted">Usamos a cidade para mostrar seu pedido aos marceneiros da região.</p>

        <div className="flex flex-col gap-2 rounded-2xl border border-subtle bg-base p-4">
          <span className="flex items-center gap-2 text-base font-semibold text-charcoal">📐 Arquiteto parceiro <span className="text-sm font-normal text-muted">(opcional)</span></span>
          {referred ? (
            <div className="rounded-xl bg-sage/15 px-4 py-3 text-sm text-charcoal">
              Indicado por <strong>{referred.name}</strong> pelo link. A comissão sai da fatia da plataforma — você não paga a mais.
            </div>
          ) : (
            <ArchitectPicker value={architect} onChange={setArchitect} />
          )}
        </div>

        {path === 'AI' ? (
          <button type="button" className={`${big} bg-brand-primary text-white`} disabled={!nameOk || busy} onClick={submit}>
            {status === 'creating' ? 'Criando…' : 'Criar pedido'}
          </button>
        ) : (
          <button type="button" className={`${big} bg-brand-primary text-white`} disabled={!nameOk} onClick={() => setStep('pdf')}>
            Continuar
          </button>
        )}
        {error && <Err msg={error} />}
      </Frame>
    );
  }

  // step === 'pdf' (arquiteto)
  return (
    <Frame title="Envie o PDF do projeto" onBack={() => setStep('name')}>
      <input type="file" accept="application/pdf" className={fld} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      {file && <p className="text-sm text-brand-secondary">✓ {file.name}</p>}
      <button type="button" className={`${big} bg-brand-primary text-white`} disabled={!file || busy} onClick={submit}>
        {status === 'uploading' ? 'Enviando PDF…' : status === 'creating' ? 'Criando…' : 'Criar pedido'}
      </button>
      {error && <Err msg={error} />}
    </Frame>
  );
}

function ArchitectPicker({ value, onChange }: { value: PickedArchitect | null; onChange: (a: PickedArchitect | null) => void }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<ArchitectOption[]>([]);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (value) return; // já escolhido — não busca
    const term = q.trim();
    if (timer.current) clearTimeout(timer.current);
    if (term.length < 2) {
      setResults([]);
      return;
    }
    timer.current = setTimeout(() => {
      searchArchitectsAction(term).then((r) => {
        setResults(r);
        setOpen(true);
      });
    }, 250);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [q, value]);

  if (value) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-subtle bg-deep px-4 py-3 text-sm">
        <span className="text-charcoal">📐 Arquiteto: <strong>{value.name}</strong></span>
        <button type="button" onClick={() => { onChange(null); setQ(''); }} className="text-muted hover:underline">trocar</button>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col gap-1">
      <span className="text-sm text-muted">Se um arquiteto te indicou, busque pelo nome.</span>
      <input
        className={fld}
        placeholder="Digite o nome do arquiteto"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => results.length && setOpen(true)}
      />
      {open && results.length > 0 && (
        <ul className="absolute left-0 right-0 top-full z-10 mt-1 max-h-56 overflow-auto rounded-xl border border-subtle bg-surface shadow-lg">
          {results.map((a) => (
            <li key={a.userId}>
              <button
                type="button"
                onClick={() => { onChange({ id: a.userId, name: a.name }); setOpen(false); }}
                className="flex w-full items-center gap-2 px-4 py-3 text-left text-charcoal hover:bg-deep"
              >
                <span aria-hidden>📐</span>
                <span className="flex-1">{a.name}{a.cau && <span className="ml-2 text-xs text-muted">CAU {a.cau}</span>}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
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

function Err({ msg }: { msg: string }) {
  return (
    <p className="rounded-xl bg-ochre/20 px-4 py-3 text-base text-charcoal" role="alert">
      {msg}
    </p>
  );
}
