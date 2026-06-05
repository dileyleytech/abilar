import { NextResponse, type NextRequest } from 'next/server';

// Busca de CEP (cidade/UF + lat/lng) via AwesomeAPI — server-side (sem CORS).
// Usado no onboarding do marceneiro para preencher cidade e centralizar o mapa.
export async function GET(request: NextRequest) {
  const cep = (request.nextUrl.searchParams.get('cep') ?? '').replace(/\D/g, '');
  if (cep.length !== 8) return NextResponse.json({ ok: false, error: 'CEP inválido' }, { status: 400 });

  try {
    const res = await fetch(`https://cep.awesomeapi.com.br/json/${cep}`, {
      headers: { Accept: 'application/json' },
      // cache no edge: CEP muda raramente
      next: { revalidate: 60 * 60 * 24 },
    });
    if (!res.ok) return NextResponse.json({ ok: false, error: 'CEP não encontrado' }, { status: 404 });
    const d = (await res.json()) as {
      city?: string;
      state?: string;
      lat?: string;
      lng?: string;
    };
    if (!d.city) return NextResponse.json({ ok: false, error: 'CEP não encontrado' }, { status: 404 });

    return NextResponse.json({
      ok: true,
      city: d.city,
      uf: d.state ?? null,
      lat: d.lat ? Number(d.lat) : null,
      lng: d.lng ? Number(d.lng) : null,
    });
  } catch {
    return NextResponse.json({ ok: false, error: 'Falha ao buscar o CEP' }, { status: 502 });
  }
}
