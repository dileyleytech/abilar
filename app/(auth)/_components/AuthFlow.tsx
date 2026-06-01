'use client';

import { useState } from 'react';
import type { SignupRole } from '@abilar/shared';
import { requestPhoneOtp, verifyPhoneOtp, requestEmailLink, signInWithPassword } from '@/lib/auth/actions';

type Mode = 'login' | 'signup';
type Method = 'phone' | 'email' | 'password';
type Phase = 'role' | 'enter' | 'otp' | 'sent';

const ROLE_CARDS: { role: SignupRole; emoji: string; title: string; desc: string }[] = [
  { role: 'CLIENT', emoji: '🏠', title: 'Sou cliente', desc: 'Quero um móvel novo ou trocar o atual' },
  { role: 'CARPENTER', emoji: '🪚', title: 'Sou marceneiro', desc: 'Quero receber pedidos e orçar' },
  { role: 'ARCHITECT', emoji: '📐', title: 'Sou arquiteto', desc: 'Quero indicar e acompanhar projetos' },
];

export function AuthFlow({ mode }: { mode: Mode }) {
  const [phase, setPhase] = useState<Phase>(mode === 'signup' ? 'role' : 'enter');
  const [method, setMethod] = useState<Method>('phone');
  const [role, setRole] = useState<SignupRole | undefined>(undefined);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (fn: () => Promise<void>) => {
    setError(null);
    setLoading(true);
    try {
      await fn();
    } finally {
      setLoading(false);
    }
  };

  const sendPhone = () =>
    run(async () => {
      const r = await requestPhoneOtp({ phone, role });
      if (!r.ok) return setError(r.error);
      setPhase('otp');
    });

  const confirmPhone = () =>
    run(async () => {
      const r = await verifyPhoneOtp({ phone, token });
      if (r && !r.ok) setError(r.error); // sucesso redireciona no servidor
    });

  const sendEmail = () =>
    run(async () => {
      const r = await requestEmailLink({ email, role });
      if (!r.ok) return setError(r.error);
      setPhase('sent');
    });

  const loginPwd = () =>
    run(async () => {
      const r = await signInWithPassword({ identifier, password });
      if (r && !r.ok) setError(r.error); // sucesso redireciona no servidor
    });

  const big = 'w-full rounded-md px-5 py-4 text-lg font-medium';
  const field =
    'w-full rounded-md border border-subtle bg-surface px-4 py-4 text-lg text-charcoal outline-none focus:border-brand';

  // Passo 1 do cadastro: escolher papel (cards grandes).
  if (phase === 'role') {
    return (
      <div className="flex flex-col gap-3">
        <h2 className="text-center text-lg font-semibold text-charcoal">Quem é você?</h2>
        {ROLE_CARDS.map((c) => (
          <button
            key={c.role}
            type="button"
            onClick={() => {
              setRole(c.role);
              setPhase('enter');
            }}
            className="flex items-center gap-4 rounded-lg border border-subtle bg-surface px-5 py-4 text-left transition hover:border-brand"
          >
            <span className="text-3xl" aria-hidden>
              {c.emoji}
            </span>
            <span>
              <span className="block text-lg font-semibold text-charcoal">{c.title}</span>
              <span className="block text-sm text-muted">{c.desc}</span>
            </span>
          </button>
        ))}
      </div>
    );
  }

  if (phase === 'sent') {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="text-4xl" aria-hidden>
          ✉️
        </span>
        <p className="text-lg text-charcoal">Enviamos um link para {email}.</p>
        <p className="text-sm text-muted">Abra o e-mail e toque no link para entrar.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Alternar telefone / e-mail / senha (senha só no login) */}
      <div className="flex gap-1 rounded-pill bg-deep p-1" role="tablist" aria-label="Forma de entrar">
        {((mode === 'login' ? ['phone', 'email', 'password'] : ['phone', 'email']) as Method[]).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={method === m}
            onClick={() => {
              setMethod(m);
              setError(null);
              setPhase('enter');
            }}
            className={`flex-1 rounded-pill px-3 py-2 text-sm font-medium ${
              method === m ? 'bg-surface text-charcoal' : 'text-muted'
            }`}
          >
            {m === 'phone' ? '📱 Celular' : m === 'email' ? '✉️ E-mail' : '🔑 Senha'}
          </button>
        ))}
      </div>

      {method === 'phone' && phase === 'enter' && (
        <>
          <label className="text-base text-charcoal" htmlFor="phone">
            Seu número de celular
          </label>
          <input
            id="phone"
            className={field}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="(11) 98765-4321"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <button type="button" className={`${big} bg-brand text-white`} onClick={sendPhone} disabled={loading}>
            {loading ? 'Enviando…' : 'Enviar código por SMS'}
          </button>
        </>
      )}

      {method === 'phone' && phase === 'otp' && (
        <>
          <label className="text-base text-charcoal" htmlFor="otp">
            Digite o código que chegou por SMS
          </label>
          <input
            id="otp"
            className={`${field} text-center tracking-[0.4em]`}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="______"
            value={token}
            onChange={(e) => setToken(e.target.value.replace(/\D/g, ''))}
          />
          <button type="button" className={`${big} bg-brand text-white`} onClick={confirmPhone} disabled={loading}>
            {loading ? 'Conferindo…' : 'Entrar'}
          </button>
          <button type="button" className="text-base text-muted underline" onClick={() => setPhase('enter')}>
            Trocar o número
          </button>
        </>
      )}

      {method === 'email' && (
        <>
          <label className="text-base text-charcoal" htmlFor="email">
            Seu e-mail
          </label>
          <input
            id="email"
            className={field}
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="voce@exemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button type="button" className={`${big} bg-brand text-white`} onClick={sendEmail} disabled={loading}>
            {loading ? 'Enviando…' : 'Enviar link de acesso'}
          </button>
        </>
      )}

      {method === 'password' && (
        <>
          <label className="text-base text-charcoal" htmlFor="ident">
            Telefone ou e-mail
          </label>
          <input
            id="ident"
            className={field}
            type="text"
            autoComplete="username"
            placeholder="(11) 98765-4321 ou voce@exemplo.com"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
          />
          <label className="text-base text-charcoal" htmlFor="pwd">
            Senha
          </label>
          <input
            id="pwd"
            className={field}
            type="password"
            autoComplete="current-password"
            placeholder="Sua senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="button" className={`${big} bg-brand text-white`} onClick={loginPwd} disabled={loading}>
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
          <p className="text-center text-sm text-muted">
            Ainda não tem senha? Entre por celular/e-mail e defina uma senha em “Minha conta”.
          </p>
        </>
      )}

      {error && (
        <p className="rounded-md bg-ochre/20 px-4 py-3 text-base text-charcoal" role="alert" aria-live="assertive">
          {error}
        </p>
      )}
    </div>
  );
}
