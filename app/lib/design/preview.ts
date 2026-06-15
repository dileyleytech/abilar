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
  type SeedModule,
} from '@abilar/ai-vision';
import type { WorkType } from '@abilar/shared';
import { getDb } from '@/lib/db';
import { resolveImageStore, base64ToBytes } from '@/lib/ai/image-store';
import { getBindings } from '@/lib/ai/cf-env';
import { toSeed } from './queries';

type Result<T> = { ok: true; data: T } | { ok: false; error: string };
export type PreviewResult = { queued: boolean; path?: string; version?: number; url?: string | null };

const ROOM_TYPE: Record<string, string> = {
  COZINHA: 'a Brazilian kitchen', GUARDA_ROUPA: 'a bedroom', BANHEIRO: 'a bathroom',
  LAVANDERIA: 'a laundry room', HOME_OFFICE: 'a home office', PAINEL_TV: 'a living room',
  ESTANTE: 'a living room', OUTRO: 'a Brazilian residential room',
};

/** Monta o prompt da prévia a partir do estado atual (módulo principal). */
async function buildPrompt(projectId: string): Promise<{ prompt: string; workType: WorkType | null } | null> {
  const db = getDb();
  const rows = await db.select().from(modules).where(eq(modules.projectId, projectId));
  if (rows.length === 0) return null;
  const state = seedFromModules(toSeed(rows));
  const primary = pickPrimaryModule(state.state);
  if (!primary) return null;
  const workType = (rows.find((r) => r.id === primary.id)?.workType ?? null) as WorkType | null;
  const { prompt } = buildImagePrompt(primary, { roomType: ROOM_TYPE[primary.type], workType: workType ?? undefined });
  return { prompt, workType };
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

  let result;
  try {
    result = await provider.editImage({ prompt: built.prompt });
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
  const bindings = getBindings();
  if (bindings?.JOBS) {
    const built = await buildPrompt(projectId);
    if (!built) return { ok: false, error: 'Adicione um móvel ao pedido antes de gerar a prévia.' };
    const job = previewJobSchema.parse({ projectId, prompt: built.prompt, baseImagePath: null });
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
