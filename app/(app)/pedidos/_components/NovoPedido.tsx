'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createProject, registerProjectPhoto } from '@/lib/projects/actions';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

type Path = 'AI' | 'ARCHITECT';
type Step = 'path' | 'name' | 'pdf';

const big = 'w-full rounded-xl px-5 py-4 text-lg font-semibold transition hover:opacity-90 disabled:opacity-50';
const card =
  'flex items-center gap-4 rounded-xl border border-subtle bg-surface px-5 py-4 text-left transition hover:-translate-y-0.5 hover:border-brand-primary/50 hover:shadow-sm';
const fld =
  'w-full rounded-xl border border-subtle bg-surface px-4 py-4 text-lg text-charcoal outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20';

export function NovoPedido() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('path');
  const [path, setPath] = useState<Path>('AI');
  const [title, setTitle] = useState('');
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
      router.push('/pedidos'); // volta à listagem após criar o pedido
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
