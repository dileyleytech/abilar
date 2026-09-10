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
  previewCacheKey,
  DEFAULT_REGEN_LIMIT,
  type DesignState,
} from '@abilar/ai-vision';
import type { WorkType } from '@abilar/shared';
import { getDb } from '@/lib/db';
import { resolveImageStore, base64ToBytes } from '@/lib/ai/image-store';
import { getBindings } from '@/lib/ai/cf-env';
import { signedProjectPhotoUrl } from '@/lib/storage';
import { toSeed } from './queries';

type Result<T> = { ok: true; data: T } | { ok: false; error: string };
export type PreviewResult = {
  queued: boolean;
  path?: string;
  version?: number;
  url?: string | null;
  /** true = reaproveitamos uma prévia já gerada (§8.7), sem chamar o modelo. */
  cached?: boolean;
};

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

/** Caminho da prévia GENERATED atual (para edição multi-turno — §8.5). */
async function currentGeneratedPath(projectId: string): Promise<string | null> {
  const db = getDb();
  const [row] = await db
    .select({ path: projectPhotos.path })
    .from(projectPhotos)
    .where(and(eq(projectPhotos.projectId, projectId), eq(projectPhotos.kind, 'GENERATED'), eq(projectPhotos.isCurrent, true)))
    .orderBy(desc(projectPhotos.version))
    .limit(1);
  return row?.path ?? null;
}

type ResolvedBase = { base64: string; mimeType: string; iterating: boolean };

/**
 * Escolhe e baixa a imagem base. Para CONSISTÊNCIA (§8.5), edita a partir da
 * ÚLTIMA prévia gerada quando ela existe — aplicando só a mudança pedida e
 * preservando o resto. No 1º passo, usa a foto real da parede do cliente.
 */
async function resolveBase(
  projectId: string,
  primaryModuleId: string,
  preferBasePath?: string | null,
): Promise<ResolvedBase | null> {
  const iterated = preferBasePath ? await downloadBase(preferBasePath) : null;
  if (iterated) return { ...iterated, iterating: true };
  const wall = await pickBasePhotoPath(projectId, primaryModuleId);
  const fromWall = wall ? await downloadBase(wall) : null;
  return fromWall ? { ...fromWall, iterating: false } : null;
}

/** Renderiza a imagem a partir do prompt e da base já resolvida. */
async function renderImage(
  basePrompt: string,
  base: ResolvedBase | null,
): Promise<{ imageBase64: string; mimeType: string } | { error: string }> {
  const provider = resolveImageProvider({ GEMINI_API_KEY: process.env.GEMINI_API_KEY, GEMINI_IMAGE_MODEL: process.env.GEMINI_IMAGE_MODEL });
  if (provider.name === 'echo') return { error: 'Geração de imagem indisponível (configure a GEMINI_API_KEY).' };

  const iterating = base?.iterating ?? false;
  const prompt = base
    ? `Edit the attached image. ${basePrompt} Apply ONLY the requested change to the furniture and keep EVERY other element of the attached image (walls, floor, lighting, framing${iterating ? ', and the rest of the furniture' : ''}) exactly the same.`
    : basePrompt;
  try {
    const r = await provider.editImage({ prompt, imageBase64: base?.base64, mimeType: base?.mimeType });
    return { imageBase64: r.imageBase64, mimeType: r.mimeType };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Não foi possível gerar a prévia agora.' };
  }
}

/** Prévia já gerada para esta mesma (foto do cliente + prompt) — cache §8.7. */
async function findCached(projectId: string, key: string): Promise<{ id: string; path: string; version: number } | null> {
  const db = getDb();
  const [row] = await db
    .select({ id: projectPhotos.id, path: projectPhotos.path, version: projectPhotos.version })
    .from(projectPhotos)
    .where(and(eq(projectPhotos.projectId, projectId), eq(projectPhotos.kind, 'GENERATED'), eq(projectPhotos.cacheKey, key)))
    .orderBy(desc(projectPhotos.version))
    .limit(1);
  return row ?? null;
}

/** Marca uma prévia como a atual do projeto (as outras deixam de ser). */
async function makeCurrent(projectId: string, photoId: string) {
  const db = getDb();
  await db.update(projectPhotos).set({ isCurrent: false }).where(and(eq(projectPhotos.projectId, projectId), eq(projectPhotos.kind, 'GENERATED')));
  await db.update(projectPhotos).set({ isCurrent: true }).where(eq(projectPhotos.id, photoId));
}

/** Gera a prévia SINCRONAMENTE (caminho local) e guarda. */
export async function generatePreview(projectId: string): Promise<Result<PreviewResult>> {
  const built = await buildPrompt(projectId);
  if (!built) return { ok: false, error: 'Adicione um móvel ao pedido antes de gerar a prévia.' };

  // CACHE (§8.7): a imagem é função da foto do cliente + do prompt (que descreve o
  // estado INTEIRO, não só a última mudança). Ancoramos a chave na foto da parede —
  // assim "gerar de novo sem mudar nada" e "voltar pro verde" reaproveitam em vez
  // de pagar outra geração. A base de EDIÇÃO continua sendo a última prévia (§8.5).
  const wallPath = await pickBasePhotoPath(projectId, built.primaryModuleId);
  const key = previewCacheKey(wallPath, built.prompt);
  const store = resolveImageStore(getBindings() ?? undefined);

  const hit = await findCached(projectId, key);
  if (hit) {
    await makeCurrent(projectId, hit.id);
    return { ok: true, data: { queued: false, cached: true, path: hit.path, version: hit.version, url: await store.signedUrl(hit.path, PREVIEW_URL_TTL_SEC) } };
  }

  const base = await resolveBase(projectId, built.primaryModuleId, await currentGeneratedPath(projectId));
  const result = await renderImage(built.prompt, base);
  if ('error' in result) return { ok: false, error: result.error };

  const version = await nextVersion(projectId);
  const path = `${projectId}/generated/v${version}.png`;
  await store.put(path, base64ToBytes(result.imageBase64), result.mimeType);

  const db = getDb();
  await db.update(projectPhotos).set({ isCurrent: false }).where(and(eq(projectPhotos.projectId, projectId), eq(projectPhotos.kind, 'GENERATED')));
  await db.insert(projectPhotos).values({ projectId, kind: 'GENERATED', path, version, isCurrent: true, cacheKey: key });

  const url = await store.signedUrl(path, PREVIEW_URL_TTL_SEC);
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

    const wallPath = await pickBasePhotoPath(projectId, built.primaryModuleId);
    const key = previewCacheKey(wallPath, built.prompt);
    const hit = await findCached(projectId, key);
    if (hit) {
      // Cache hit não precisa de fila nem de modelo: entrega na hora (§8.7).
      await makeCurrent(projectId, hit.id);
      const store = resolveImageStore(bindings);
      return { ok: true, data: { queued: false, cached: true, path: hit.path, version: hit.version, url: await store.signedUrl(hit.path, PREVIEW_URL_TTL_SEC) } };
    }

    // Edita a partir da última prévia (§8.5); no 1º passo, a foto da parede.
    const baseImagePath = (await currentGeneratedPath(projectId)) ?? wallPath;
    const job = previewJobSchema.parse({ projectId, prompt: built.prompt, baseImagePath, cacheKey: key, version: await nextVersion(projectId) });
    await bindings.JOBS.send({ type: 'IMAGE_PREVIEW', job });
    return { ok: true, data: { queued: true } };
  }
  return generatePreview(projectId);
}

/** Validade da URL assinada da prévia. Mais folgada que o padrão (120 s) porque a
 *  imagem fica na tela enquanto o cliente conversa com a ABI. */
const PREVIEW_URL_TTL_SEC = 900;

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
  return resolveImageStore(getBindings() ?? undefined).signedUrl(row.path, PREVIEW_URL_TTL_SEC);
}

/** Prévia do RASCUNHO da proposta do marceneiro (estado em edição, não persistido).
 *  Gera a partir do estado fornecido e guarda num caminho de rascunho por marceneiro. */
export async function proposalDraftPreview(projectId: string, carpenterId: string, state: DesignState): Promise<Result<{ url: string | null }>> {
  const primary = pickPrimaryModule(state);
  if (!primary) return { ok: false, error: 'Adicione um móvel antes de gerar a prévia.' };
  const { prompt } = buildImagePrompt(primary, { roomType: ROOM_TYPE[primary.type] });
  const path = `${projectId}/proposals/draft-${carpenterId}.png`;
  // Consistência: itera a partir do próprio rascunho anterior (se já existir).
  const result = await renderImage(prompt, await resolveBase(projectId, primary.id, path));
  if ('error' in result) return { ok: false, error: result.error };

  const store = resolveImageStore(getBindings() ?? undefined);
  await store.put(path, base64ToBytes(result.imageBase64), result.mimeType);
  // O rascunho sempre grava no MESMO caminho: sem o cache-buster, o navegador (e o
  // CDN do Storage) devolveria a imagem anterior.
  const url = await store.signedUrl(path, PREVIEW_URL_TTL_SEC);
  return { ok: true, data: { url: url ? `${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}` : null } };
}
