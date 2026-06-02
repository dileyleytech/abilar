import Link from 'next/link';
import { AuthFlow } from '../_components/AuthFlow';

export const metadata = { title: 'Criar conta — Abilar' };

export default function CadastroPage() {
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-center text-xl font-semibold text-charcoal">Criar conta</h1>
      <AuthFlow mode="signup" />
      <p className="text-center text-base text-muted">
        Já tem conta?{' '}
        <Link href="/entrar" className="font-medium text-brand underline">
          Entrar
        </Link>
      </p>
    </div>
  );
}
