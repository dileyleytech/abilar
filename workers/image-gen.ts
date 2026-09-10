// workers/image-gen.ts — Consumer da Cloudflare Queue (binding JOBS / fila abilar-jobs).
// CAMINHO DE PRODUÇÃO (§8.2): geração de imagem em background, sem travar a tela.
// Em LOCAL a geração roda síncrona (app/lib/design/preview.ts); aqui é o jeito correto
// quando deployado. Excluído do typecheck/lint (tsconfig + eslint) — valida no deploy.
//
// Fluxo por mensagem:
//   1. valida o job com previewJobSchema (mesmo contrato do produtor)
//   2. gera a imagem com o GeminiImageProvider (Nano Banana 2)
//   3. grava no R2 (binding MEDIA), versionando o caminho
//   4. atualiza project_photos (kind=GENERATED, version, is_current, cache_key)
//   5. (TODO) notifica o cliente via Supabase Realtime / push
//
// O produtor (app/lib/design/preview.ts) já manda no job a `version` reservada e a
// `cacheKey` (§8.7) — o consumidor grava, não recalcula.
//
// Requer deploy: bindings MEDIA (R2), HYPERDRIVE (Postgres) e a env GEMINI_API_KEY.
// Excluído do bundle do OpenNext: precisa de um entrypoint próprio no deploy —
// hoje `wrangler.toml` aponta o consumer para o worker do Next, que não tem
// handler `queue()`. TODO(deploy) junto com os itens abaixo.

import { createGeminiImageProvider, previewJobSchema, base64ToBytes } from '@abilar/ai-vision';

export interface Env {
  MEDIA: R2Bucket;
  HYPERDRIVE: { connectionString: string };
  GEMINI_API_KEY: string;
  GEMINI_IMAGE_MODEL?: string;
}

type QueueMessageBody = { type: string; job: unknown };

export default {
  async queue(batch: MessageBatch<QueueMessageBody>, env: Env): Promise<void> {
    const provider = createGeminiImageProvider({ apiKey: env.GEMINI_API_KEY, model: env.GEMINI_IMAGE_MODEL });

    for (const msg of batch.messages) {
      try {
        if (msg.body?.type !== 'IMAGE_PREVIEW') { msg.ack(); continue; }
        const job = previewJobSchema.parse(msg.body.job);

        // TODO(deploy): se job.baseImagePath, ler os bytes do R2 (env.MEDIA.get) e
        // passar como imageBase64 (igual ao caminho local) para editar a foto real.
        const result = await provider.editImage({ prompt: job.prompt });
        const path = `${job.projectId}/generated/v${job.version}.png`;
        await env.MEDIA.put(path, base64ToBytes(result.imageBase64), { httpMetadata: { contentType: result.mimeType } });

        // TODO(deploy): UPDATE project_photos SET is_current=false WHERE project_id=$1 AND kind='GENERATED';
        //               INSERT INTO project_photos (project_id, kind, path, version, is_current, cache_key)
        //               VALUES ($1,'GENERATED',$2,job.version,true,job.cacheKey)
        //               via Drizzle/Hyperdrive (mesma lógica de app/lib/design/preview.ts).
        //               SEM isso a prévia nunca aparece na UI e o limite de custo
        //               (que conta linhas GENERATED) fica travado em zero.
        // TODO(deploy): notificar o cliente (Supabase Realtime/push) que a prévia ficou pronta.

        msg.ack();
      } catch {
        msg.retry(); // re-tenta (max_retries no wrangler.toml); depois vai pra DLQ.
      }
    }
  },
};

// Tipos mínimos (substituir por @cloudflare/workers-types ao ligar o deploy).
interface R2Bucket { put(key: string, value: Uint8Array, opts?: { httpMetadata?: { contentType?: string } }): Promise<unknown> }
interface MessageBatch<T> { messages: { body: T; ack(): void; retry(): void }[] }
