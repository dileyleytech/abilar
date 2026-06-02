import Link from 'next/link';
import { AuthFlow } from '../_components/AuthFlow';

export const metadata = { title: 'Entrar — Abilar' };

export default function EntrarPage() {
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-center text-xl font-semibold text-charcoal">Entrar</h1>
      <AuthFlow mode="login" />
      <p className="text-center text-base text-muted">
        Ainda não tem conta?{' '}
        <Link href="/cadastro" className="font-medium text-brand underline">
          Criar conta
        </Link>
      </p>
    </div>
  );
}
