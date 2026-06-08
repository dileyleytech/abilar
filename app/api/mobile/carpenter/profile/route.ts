import { carpenterOnboardingSchema } from '@abilar/shared';
import { carpenterProfiles, eq, sql } from '@abilar/db';
import { getDb } from '@/lib/db';
import { authenticateBearer, json } from '@/lib/api/mobile-auth';

// Lê o perfil profissional do marceneiro logado (ou null).
export async function GET(req: Request): Promise<Response> {
  const auth = await authenticateBearer(req);
  if (!auth) return json({ error: 'Não autenticado.' }, 401);
  const [p] = await getDb().select().from(carpenterProfiles).where(eq(carpenterProfiles.userId, auth.userId)).limit(1);
  return json({ profile: p ?? null });
}

// Cria/atualiza o perfil profissional (onboarding). JSON: carpenterOnboardingSchema.
export async function POST(req: Request): Promise<Response> {
  const auth = await authenticateBearer(req);
  if (!auth || auth.role !== 'CARPENTER') return json({ error: 'Apenas marceneiros.' }, 403);
  const parsed = carpenterOnboardingSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' }, 400);
  const d = parsed.data;

  const values = {
    personType: d.personType,
    name: d.name,
    companyName: d.companyName ?? null,
    cnpjOrCpf: d.cnpjOrCpf,
    bio: d.bio ?? null,
    serviceCity: d.serviceCity,
    serviceCep: d.serviceCep,
    serviceRadiusKm: d.serviceRadiusKm,
    serviceLat: d.serviceLat != null ? String(d.serviceLat) : null,
    serviceLng: d.serviceLng != null ? String(d.serviceLng) : null,
    categories: d.categories,
    ...(d.maxParallelProjects != null ? { maxParallelProjects: d.maxParallelProjects } : {}),
  };
  await getDb()
    .insert(carpenterProfiles)
    .values({ userId: auth.userId, ...values })
    .onConflictDoUpdate({ target: carpenterProfiles.userId, set: { ...values, updatedAt: sql`now()` } });
  return json({ ok: true });
}
