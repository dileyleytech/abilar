'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { ActionResult } from '@/lib/auth/actions';
import {
  updateName,
  updateEmail,
  requestPhoneChange,
  confirmPhoneChange,
} from '@/lib/auth/actions';

const fld =
  'w-full rounded-xl border border-subtle bg-surface px-4 py-3 text-base text-charcoal outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20';

export function MeuPerfil({
  name,
  email,
  phone,
}: {
  name: string | null;
  email: string | null;
  phone: string | null;
}) {
  return (
    <div className="rounded-2xl border border-subtle bg-surface p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-charcoal">Meus dados</h2>
      <p className="mt-1 text-sm text-muted">Mantenha seus dados atualizados.</p>
      <div className="mt-4 divide-y divide-subtle">
        <EditableField
          label="Nome"
          value={name}
          placeholder="Seu nome completo"
          onSave={(v) => updateName({ name: v })}
        />
        <EditableField
          label="E-mail"
          type="email"
          value={email}
          placeholder="voce@exemplo.com"
          onSave={(v) => updateEmail({ email: v })}
          successMsg="Enviamos um link de confirmação para o novo e-mail."
        />
        <PhoneField phone={phone} />
      </div>
    </div>
  );
}

function EditableField({
  label,
  value,
  placeholder,
  type = 'text',
  onSave,
  successMsg,
}: {
  label: string;
  value: string | null;
  placeholder?: string;
  type?: string;
  onSave: (v: string) => Promise<ActionResult>;
  successMsg?: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value ?? '');
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const save = () =>
    start(async () => {
      setMsg(null);
      const r = await onSave(val.trim());
      if (r.ok) {
        setMsg({ ok: true, text: successMsg ?? 'Salvo!' });
        setEditing(false);
        router.refresh();
      } else {
        setMsg({ ok: false, text: r.error });
      }
    });

  return (
    <div className="py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-subtle">{label}</p>
          {!editing && <p className="truncate text-base text-charcoal">{value || '—'}</p>}
        </div>
        {!editing && (
          <button
            type="button"
            onClick={() => {
              setVal(value ?? '');
              setEditing(true);
              setMsg(null);
            }}
            className="shrink-0 text-sm font-medium text-brand-primary hover:underline"
          >
            Editar
          </button>
        )}
      </div>
      {editing && (
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input className={fld} type={type} placeholder={placeholder} value={val} onChange={(e) => setVal(e.target.value)} />
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded-xl bg-brand-primary px-4 py-3 text-base font-semibold text-white disabled:opacity-50"
              disabled={pending}
              onClick={save}
            >
              {pending ? 'Salvando…' : 'Salvar'}
            </button>
            <button type="button" className="rounded-xl border border-subtle px-4 py-3 text-base text-charcoal" onClick={() => setEditing(false)}>
              Cancelar
            </button>
          </div>
        </div>
      )}
      {msg && (
        <p className={`mt-2 rounded-lg px-3 py-2 text-sm text-charcoal ${msg.ok ? 'bg-sage/25' : 'bg-ochre/20'}`} role="status">
          {msg.text}
        </p>
      )}
    </div>
  );
}

function PhoneField({ phone }: { phone: string | null }) {
  const router = useRouter();
  const [step, setStep] = useState<'idle' | 'enter' | 'otp'>('idle');
  const [newPhone, setNewPhone] = useState('');
  const [code, setCode] = useState('');
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const send = () =>
    start(async () => {
      setMsg(null);
      const r = await requestPhoneChange({ phone: newPhone });
      if (r.ok) setStep('otp');
      else setMsg({ ok: false, text: r.error });
    });

  const confirm = () =>
    start(async () => {
      setMsg(null);
      const r = await confirmPhoneChange({ phone: newPhone, token: code });
      if (r.ok) {
        setMsg({ ok: true, text: 'Telefone atualizado!' });
        setStep('idle');
        setNewPhone('');
        setCode('');
        router.refresh();
      } else {
        setMsg({ ok: false, text: r.error });
      }
    });

  return (
    <div className="py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-subtle">Telefone</p>
          {step === 'idle' && <p className="truncate font-mono text-base text-charcoal">{phone || '—'}</p>}
        </div>
        {step === 'idle' && (
          <button
            type="button"
            onClick={() => {
              setNewPhone('');
              setStep('enter');
              setMsg(null);
            }}
            className="shrink-0 text-sm font-medium text-brand-primary hover:underline"
          >
            Trocar
          </button>
        )}
      </div>

      {step === 'enter' && (
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input className={fld} type="tel" inputMode="tel" placeholder="(11) 98765-4321" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
          <div className="flex gap-2">
            <button type="button" className="rounded-xl bg-brand-primary px-4 py-3 text-base font-semibold text-white disabled:opacity-50" disabled={pending} onClick={send}>
              {pending ? 'Enviando…' : 'Enviar código'}
            </button>
            <button type="button" className="rounded-xl border border-subtle px-4 py-3 text-base text-charcoal" onClick={() => setStep('idle')}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {step === 'otp' && (
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input
            className={`${fld} text-center tracking-[0.3em]`}
            inputMode="numeric"
            maxLength={6}
            placeholder="______"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          />
          <div className="flex gap-2">
            <button type="button" className="rounded-xl bg-brand-primary px-4 py-3 text-base font-semibold text-white disabled:opacity-50" disabled={pending} onClick={confirm}>
              {pending ? 'Confirmando…' : 'Confirmar'}
            </button>
            <button type="button" className="rounded-xl border border-subtle px-4 py-3 text-base text-charcoal" onClick={() => setStep('enter')}>
              Voltar
            </button>
          </div>
        </div>
      )}

      {msg && (
        <p className={`mt-2 rounded-lg px-3 py-2 text-sm text-charcoal ${msg.ok ? 'bg-sage/25' : 'bg-ochre/20'}`} role="status">
          {msg.text}
        </p>
      )}
    </div>
  );
}
