'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CATEGORIES, PERSON_TYPES, type Category, type PersonType } from '@abilar/shared';
import { saveCarpenterProfile } from '@/lib/carpenter/actions';
import { CATEGORY_LABELS } from '@/lib/labels';

const fld =
  'w-full rounded-xl border border-subtle bg-surface px-4 py-3.5 text-lg text-charcoal outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20';

const PERSON_LABEL: Record<PersonType, string> = { MEI: 'MEI', PJ: 'Empresa (PJ)', PF: 'Pessoa física' };

export type CarpenterFormInitial = {
  personType: PersonType;
  name: string;
  companyName: string;
  cnpjOrCpf: string;
  serviceCity: string;
  serviceCep: string;
  serviceRadiusKm: string;
  categories: Category[];
  bio: string;
};

export function CarpenterProfileForm({ initial }: { initial?: CarpenterFormInitial }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [personType, setPersonType] = useState<PersonType>(initial?.personType ?? 'MEI');
  const [name, setName] = useState(initial?.name ?? '');
  const [companyName, setCompanyName] = useState(initial?.companyName ?? '');
  const [doc, setDoc] = useState(initial?.cnpjOrCpf ?? '');
  const [city, setCity] = useState(initial?.serviceCity ?? '');
  const [cep, setCep] = useState(initial?.serviceCep ?? '');
  const [radius, setRadius] = useState(initial?.serviceRadiusKm ?? '20');
  const [cats, setCats] = useState<Category[]>(initial?.categories ?? []);
  const [bio, setBio] = useState(initial?.bio ?? '');

  const toggleCat = (c: Category) =>
    setCats((cs) => (cs.includes(c) ? cs.filter((x) => x !== c) : [...cs, c]));

  const isPF = personType === 'PF';

  const save = () =>
    start(async () => {
      setError(null);
      const r = await saveCarpenterProfile({
        personType,
        name: name.trim(),
        companyName: companyName.trim() || undefined,
        cnpjOrCpf: doc.trim(),
        serviceCity: city.trim(),
        serviceCep: cep.trim(),
        serviceRadiusKm: Number(radius),
        categories: cats,
        bio: bio.trim() || undefined,
      });
      if (!r.ok) return setError(r.error);
      router.push('/marceneiro');
      router.refresh();
    });

  return (
    <div className="flex flex-col gap-6">
      <Block title="Você é…">
        <div className="grid grid-cols-3 gap-2">
          {PERSON_TYPES.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPersonType(p)}
              className={`rounded-xl border px-3 py-3 text-center text-base font-medium transition ${
                personType === p ? 'border-brand-primary bg-brand-primary/10 text-charcoal' : 'border-subtle text-muted'
              }`}
            >
              {PERSON_LABEL[p]}
            </button>
          ))}
        </div>
      </Block>

      <Block title="Seus dados">
        <Label text="Nome">
          <input className={fld} value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" />
        </Label>
        {!isPF && (
          <Label text="Nome da empresa (opcional)">
            <input className={fld} value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Marcenaria do Zé" />
          </Label>
        )}
        <Label text={isPF ? 'CPF' : 'CNPJ'}>
          <input className={fld} inputMode="numeric" value={doc} onChange={(e) => setDoc(e.target.value)} placeholder={isPF ? '000.000.000-00' : '00.000.000/0000-00'} />
        </Label>
      </Block>

      <Block title="Onde você atende">
        <Label text="Cidade">
          <input className={fld} value={city} onChange={(e) => setCity(e.target.value)} placeholder="Sua cidade" />
        </Label>
        <div className="grid grid-cols-2 gap-3">
          <Label text="CEP base">
            <input className={fld} inputMode="numeric" value={cep} onChange={(e) => setCep(e.target.value)} placeholder="00000-000" />
          </Label>
          <Label text="Raio (km)">
            <input className={fld} type="number" min={1} max={200} value={radius} onChange={(e) => setRadius(e.target.value)} />
          </Label>
        </div>
      </Block>

      <Block title="O que você faz">
        <p className="text-sm text-muted">Escolha as categorias que você atende.</p>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => toggleCat(c)}
              className={`rounded-pill border px-4 py-2 text-base font-medium transition ${
                cats.includes(c) ? 'border-brand-primary bg-brand-primary/10 text-charcoal' : 'border-subtle text-muted'
              }`}
            >
              {CATEGORY_LABELS[c]}
            </button>
          ))}
        </div>
      </Block>

      <Block title="Sobre você (opcional)">
        <textarea className={`${fld} min-h-24`} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Conte um pouco da sua experiência" />
      </Block>

      <button
        type="button"
        onClick={save}
        disabled={pending}
        className="rounded-xl bg-brand-primary px-6 py-4 text-lg font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
      >
        {pending ? 'Salvando…' : 'Salvar perfil'}
      </button>
      {error && (
        <p className="rounded-xl bg-ochre/20 px-4 py-3 text-base text-charcoal" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-subtle bg-surface p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-charcoal">{title}</h2>
      {children}
    </section>
  );
}

function Label({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium text-charcoal">{text}</span>
      {children}
    </label>
  );
}
