'use client';

import { useState, useTransition } from 'react';
import { setPassword } from '@/lib/auth/actions';
import { Button } from '@/components/ui';

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
    <div className="rounded-2xl border border-subtle bg-surface p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-charcoal">Senha de acesso</h2>
      <p className="mt-1 text-sm text-muted">Defina uma senha para entrar sem precisar de SMS toda vez.</p>

      {!open ? (
        <Button variant="outline" className="mt-4 w-full" onClick={() => setOpen(true)}>
          Definir senha
        </Button>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          <input
            type="password"
            autoComplete="new-password"
            placeholder="Nova senha (mín. 8 caracteres)"
            className="w-full rounded-xl border border-subtle bg-surface px-4 py-3.5 text-lg text-charcoal outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
          />
          <div className="flex gap-2">
            <Button variant="primary" className="flex-1" disabled={pending || pwd.length < 8} onClick={save}>
              {pending ? 'Salvando…' : 'Salvar senha'}
            </Button>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {msg && (
        <p
          className={`mt-3 rounded-xl px-4 py-3 text-base ${msg.ok ? 'bg-sage/25 text-charcoal' : 'bg-danger/10 text-danger'}`}
          role="status"
        >
          {msg.text}
        </p>
      )}
    </div>
  );
}
