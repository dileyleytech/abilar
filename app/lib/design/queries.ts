import { modules, eq } from '@abilar/db';
import { seedFromModules, type DesignState, type SeedModule } from '@abilar/ai-vision';
import { getDb } from '@/lib/db';

type ModuleRow = typeof modules.$inferSelect;

/** DB → SeedModule (lê hardware/lighting do jsonb `hardware` e os itens de `items`). */
export function toSeed(rows: ModuleRow[]): SeedModule[] {
  return rows.map((r) => {
    const hw = (r.hardware ?? {}) as { kind?: string; lighting?: string };
    return {
      id: r.id,
      type: r.type as SeedModule['type'],
      widthMm: r.widthMm,
      heightMm: r.heightMm,
      depthMm: r.depthMm,
      material: r.material,
      finish: r.finish,
      hardware: (hw.kind as SeedModule['hardware']) ?? null,
      lighting: hw.lighting ?? null,
      items: Array.isArray(r.items) ? (r.items as SeedModule['items']) : [],
    };
  });
}

/** Estado de design inicial do projeto (módulos = fonte de verdade). Sem auth (o chamador valida). */
export async function loadDesignState(projectId: string): Promise<DesignState> {
  const db = getDb();
  const rows = await db.select().from(modules).where(eq(modules.projectId, projectId));
  return seedFromModules(toSeed(rows)).state;
}
