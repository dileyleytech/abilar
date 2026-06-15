// preview.ts — geração da prévia de imagem do projeto (§8.2). SEM auth (o chamador
// autoriza). Dois caminhos, escolhidos por ambiente:
//  • LOCAL (sem binding JOBS): geração SÍNCRONA + guarda no Supabase.
//  • PRODUÇÃO (binding JOBS): enfileira o job; o worker consumer gera + guarda no R2.
import { modules, projectPhotos, and, eq, desc, sql } from '@abilar/db';
import {
  resolveImageProvider,
  buildImagePrompt,
  pickPrimaryModule,
  seedFromModules,
  previewJobSchema,
  bytesToBase64,
  checkRegenLimit,
  DEFAULT_REGEN_LIMIT,
} from '@abilar/ai-vision';
import type { WorkType } from '@abilar/shared';
import { getDb } from '@/lib/db';
import { resolveImageStore, base64ToBytes } from '@/lib/ai/image-store';
import { getBindings } from '@/lib/ai/cf-env';
import { signedProjectPhotoUrl } from '@/lib/storage';
import { toSeed } from './queries';

type Result<T> = { ok: true; data: T } | { ok: false; error: string };
export type PreviewResult = { queued: boolean; path?: string; version?: number; url?: string | null };

const ROOM_TYPE: Record<string, string> = {
  COZINHA: 'a Brazilian kitchen', GUARDA_ROUPA: 'a bedroom', BANHEIRO: 'a bathroom',
  LAVANDERIA: 'a laundry room', HOME_OFFICE: 'a home office', PAINEL_TV: 'a living room',
  ESTANTE: 'a living room', OUTRO: 'a Brazilian residential room',
};

/** Monta o prompt da prévia + identifica o módulo principal. */
async function buildPrompt(projectId: string): Promise<{ prompt: string; primaryModuleId: string } | null> {
  const db = getDb();
  const rows = await db.select().from(modules).where(eq(modules.projectId, projectId));
  if (rows.length === 0) return null;
  const state = seedFromModules(toSeed(rows));
  const primary = pickPrimaryModule(state.state);
  if (!primary) return null;
  const workType = (rows.find((r) => r.id === primary.id)?.workType ?? null) as WorkType | null;
  const { prompt } = buildImagePrompt(primary, { roomType: ROOM_TYPE[primary.type], workType: workType ?? undefined });
  return { prompt, primaryModuleId: primary.id };
}

/** Caminho da foto base (a parede enviada pelo cliente): preferir a do módulo. */
async function pickBasePhotoPath(projectId: string, moduleId: string): Promise<string | null> {
  const db = getDb();
  const rows = await db
    .select({ moduleId: projectPhotos.moduleId, kind: projectPhotos.kind, path: projectPhotos.path })
    .from(projectPhotos)
    .where(and(eq(projectPhotos.projectId, projectId), eq(projectPhotos.isCurrent, true)));
  const usable = rows.filter((r) => r.kind !== 'GENERATED');
  const pick =
    usable.find((r) => r.moduleId === moduleId) ??
    usable.find((r) => r.kind === 'ORIGINAL_ROOM') ??
    usable[0];
  return pick?.path ?? null;
}

/** Baixa a foto base do storage e devolve em base64 (para edição inline). */
async function downloadBase(path: string): Promise<{ base64: string; mimeType: string } | null> {
  const url = await signedProjectPhotoUrl(path);
  if (!url) return null;
  const res = await fetch(url);
  if (!res.ok) return null;
  const bytes = new Uint8Array(await res.arrayBuffer());
  const mimeType = res.headers.get('content-type') || (path.endsWith('.png') ? 'image/png' : 'image/jpeg');
  return { base64: bytesToBase64(bytes), mimeType };
}

/** Limite de regenerações por projeto (custo, §8.7). Config por env, default seguro. */
function previewLimit(): number {
  const n = Number(process.env.GEMINI_PREVIEW_LIMIT);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_REGEN_LIMIT;
}

/** Quantas prévias já foram geradas (cada uma é uma versão GENERATED). */
async function regenUsed(projectId: string): Promise<number> {
  const db = getDb();
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(projectPhotos)
    .where(and(eq(projectPhotos.projectId, projectId), eq(projectPhotos.kind, 'GENERATED')));
  return row?.n ?? 0;
}

/** Próxima versão da prévia (GENERATED) do projeto. */
async function nextVersion(projectId: string): Promise<number> {
  const db = getDb();
  const [row] = await db
    .select({ v: sql<number>`coalesce(max(${projectPhotos.version}), 0)::int` })
    .from(projectPhotos)
    .where(and(eq(projectPhotos.projectId, projectId), eq(projectPhotos.kind, 'GENERATED')));
  return (row?.v ?? 0) + 1;
}

/** Gera a prévia SINCRONAMENTE (caminho local) e guarda. */
export async function generatePreview(projectId: string): Promise<Result<PreviewResult>> {
  const built = await buildPrompt(projectId);
  if (!built) return { ok: false, error: 'Adicione um móvel ao pedido antes de gerar a prévia.' };

  const provider = resolveImageProvider({ GEMINI_API_KEY: process.env.GEMINI_API_KEY, GEMINI_IMAGE_MODEL: process.env.GEMINI_IMAGE_MODEL });
  if (provider.name === 'echo') return { ok: false, error: 'Geração de imagem indisponível (configure a GEMINI_API_KEY).' };

  // Edita a FOTO real do cliente (preserva parede/perspectiva, §8.5) quando há base.
  const basePath = await pickBasePhotoPath(projectId, built.primaryModuleId);
  const base = basePath ? await downloadBase(basePath) : null;
  const prompt = base
    ? `Edit the attached photo of the wall/room. ${built.prompt} Place the furniture on the wall shown in the photo.`
    : built.prompt;

  let result;
  try {
    result = await provider.editImage({ prompt, imageBase64: base?.base64, mimeType: base?.mimeType });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Não foi possível gerar a prévia agora.' };
  }

  const version = await nextVersion(projectId);
  const path = `${projectId}/generated/v${version}.png`;
  const store = resolveImageStore(getBindings() ?? undefined);
  await store.put(path, base64ToBytes(result.imageBase64), result.mimeType);

  const db = getDb();
  await db.update(projectPhotos).set({ isCurrent: false }).where(and(eq(projectPhotos.projectId, projectId), eq(projectPhotos.kind, 'GENERATED')));
  await db.insert(projectPhotos).values({ projectId, kind: 'GENERATED', path, version, isCurrent: true });

  const url = await store.signedUrl(path);
  return { ok: true, data: { queued: false, path, version, url } };
}

/** Decide o caminho: enfileira (produção) ou gera já (local). */
export async function requestPreview(projectId: string): Promise<Result<PreviewResult>> {
  // Guardrail de custo (§8.7): limite de regenerações por projeto.
  const limit = checkRegenLimit(await regenUsed(projectId), previewLimit());
  if (!limit.allowed) return { ok: false, error: limit.message ?? 'Você atingiu o limite de prévias.' };

  const bindings = getBindings();
  if (bindings?.JOBS) {
    const built = await buildPrompt(projectId);
    if (!built) return { ok: false, error: 'Adicione um móvel ao pedido antes de gerar a prévia.' };
    const baseImagePath = await pickBasePhotoPath(projectId, built.primaryModuleId);
    const job = previewJobSchema.parse({ projectId, prompt: built.prompt, baseImagePath });
    await bindings.JOBS.send({ type: 'IMAGE_PREVIEW', job });
    return { ok: true, data: { queued: true } };
  }
  return generatePreview(projectId);
}

/** URL da prévia atual (GENERATED isCurrent) — para exibir após gerar/recarregar. */
export async function currentPreviewUrl(projectId: string): Promise<string | null> {
  const db = getDb();
  const [row] = await db
    .select({ path: projectPhotos.path })
    .from(projectPhotos)
    .where(and(eq(projectPhotos.projectId, projectId), eq(projectPhotos.kind, 'GENERATED'), eq(projectPhotos.isCurrent, true)))
    .orderBy(desc(projectPhotos.version))
    .limit(1);
  if (!row) return null;
  return resolveImageStore(getBindings() ?? undefined).signedUrl(row.path);
}
