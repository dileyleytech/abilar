'use client';

import { useState, useTransition } from 'react';
import { setPassword } from '@/lib/auth/actions';

export function SetPasswordForm() {
  const [open, setOpen] = useState(false);
  const [pwd, setPwd] = useState('');
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const save = () =>
    start(async () => {
      setMsg(null);
      const r = await setPassword({ password: pwd });
      if (r.ok) {
        setMsg({ ok: true, text: 'Senha salva! Agora você pode entrar com senha, sem SMS.' });
        setPwd('');
        setOpen(false);
      } else {
        setMsg({ ok: false, text: r.error });
      }
    });

  return (
    <div className="rounded-lg bg-surface p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-charcoal">Senha de acesso</h2>
      <p className="text-sm text-muted">Defina uma senha para entrar sem precisar de SMS toda vez.</p>

      {!open ? (
        <button
          type="button"
          className="mt-3 w-full rounded-md border border-subtle px-5 py-3 text-base font-medium text-charcoal"
          onClick={() => setOpen(true)}
        >
          Definir senha
        </button>
      ) : (
        <div className="mt-3 flex flex-col gap-3">
          <input
            type="password"
            autoComplete="new-password"
            placeholder="Nova senha (mín. 8 caracteres)"
            className="w-full rounded-md border border-subtle bg-surface px-4 py-4 text-lg text-charcoal outline-none focus:border-brand"
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
          />
          <div className="flex gap-2">
            <button
              type="button"
              className="flex-1 rounded-md bg-brand px-4 py-3 text-base font-medium text-white disabled:opacity-50"
              disabled={pending || pwd.length < 8}
              onClick={save}
            >
              {pending ? 'Salvando…' : 'Salvar senha'}
            </button>
            <button type="button" className="rounded-md border border-subtle px-4 py-3 text-base text-charcoal" onClick={() => setOpen(false)}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {msg && (
        <p className={`mt-3 rounded-md px-4 py-3 text-base text-charcoal ${msg.ok ? 'bg-sage/25' : 'bg-ochre/20'}`} role="status">
          {msg.text}
        </p>
      )}
    </div>
  );
}
