# workers/

Consumers de **Cloudflare Queues** (image-gen, pdf, blog) entram aqui a partir da
**Fase 6** (§9 do mestre). O worker principal do app é gerado pelo OpenNext
(`.open-next/worker.js`); estes são workers/handlers auxiliares para tarefas longas
e assíncronas que não cabem no tempo de CPU de uma request.

Quando criar o primeiro consumer, adicione `workers/*` ao `pnpm-workspace.yaml`.
