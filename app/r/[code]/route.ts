import { NextResponse, type NextRequest } from 'next/server';
import { getSessionProfile } from '@/lib/auth/session';
import { activeArchitectByCode } from '@/lib/architects/queries';

const REF_COOKIE = 'abilar_ref';

/** Landing do link de indicação do arquiteto. Guarda o código e manda a pessoa
 *  para o lugar certo conforme o estado da sessão:
 *  - cliente logado → criar pedido (já com o vínculo no cookie);
 *  - logado em outro papel → sua área;
 *  - deslogado → cadastro (o cookie sobrevive ao cadastro/login). */
export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }): Promise<Response> {
  const { code } = await params;
  const clean = /^[A-Za-z0-9]{3,24}$/.test(code) ? code.toUpperCase() : null;

  // Código inválido/inexistente → home, sem cookie.
  if (!clean || !(await activeArchitectByCode(clean))) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  const profile = await getSessionProfile();
  const target =
    !profile ? '/cadastro'
    : profile.role === 'CLIENT' ? '/pedidos/novo'
    : profile.role === 'CARPENTER' ? '/marceneiro'
    : profile.role === 'ARCHITECT' ? '/arquiteto'
    : profile.role === 'ADMIN' ? '/admin'
    : '/conta';

  const res = NextResponse.redirect(new URL(target, req.url));
  res.cookies.set(REF_COOKIE, clean, { maxAge: 60 * 60 * 24 * 60, path: '/', sameSite: 'lax', httpOnly: true });
  return res;
}
