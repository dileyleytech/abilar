import { authenticateBearer, json } from '@/lib/api/mobile-auth';
import { ownsProject } from '@/lib/design/core';
import { loadDesignState } from '@/lib/design/queries';
import { currentPreviewUrl, referenceUrls } from '@/lib/design/preview';

// GET ?projectId= → estado de design + prévia atual + referências do cliente (dono).
export async function GET(req: Request): Promise<Response> {
  const auth = await authenticateBearer(req);
  if (!auth) return json({ error: 'Não autenticado.' }, 401);

  const projectId = new URL(req.url).searchParams.get('projectId') ?? '';
  if (!projectId || !(await ownsProject(projectId, auth.userId))) return json({ error: 'Pedido não encontrado.' }, 404);

  const [state, previewUrl, references] = await Promise.all([
    loadDesignState(projectId),
    currentPreviewUrl(projectId),
    referenceUrls(projectId),
  ]);
  return json({ state, previewUrl, references });
}
