import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

/** Indicação de arquiteto: ?ref=CODE em qualquer página é guardado num cookie
 *  que sobrevive ao cadastro/login até a criação do pedido (vínculo §1.2). */
const REF_COOKIE = 'abilar_ref';

export async function middleware(request: NextRequest) {
  const response = await updateSession(request);
  const ref = request.nextUrl.searchParams.get('ref');
  if (ref && /^[A-Za-z0-9]{3,24}$/.test(ref)) {
    response.cookies.set(REF_COOKIE, ref.toUpperCase(), {
      maxAge: 60 * 60 * 24 * 60, // 60 dias
      path: '/',
      sameSite: 'lax',
      httpOnly: true,
    });
  }
  return response;
}

export const config = {
  // Roda em tudo, menos assets estáticos e imagens.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
