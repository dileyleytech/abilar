import { NextResponse } from 'next/server';

// Health check — usado para validar o deploy (Fase 0) e o keep-alive (Fase 10).
// TODO(Fase 0): incluir um SELECT 1 via Hyperdrive quando o Supabase estiver ligado.
export function GET() {
  return NextResponse.json({
    ok: true,
    app: 'abilar',
    phase: 0,
    ts: new Date().toISOString(),
  });
}
