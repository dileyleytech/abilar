# Abilar

Marketplace de marcenaria e obra com IA (**ABI**, a assistente), visualização do projeto antes de contratar e **pagamento seguro por etapa de obra (escrow)**. App **web (Next.js)** + **mobile (Expo)**.

## Por onde começar
1. Leia **`docs/COMO-COMECAR.md`** — passo a passo no VS Code + prompt inicial para o Claude Code + como usar Skills.
2. O **`CLAUDE.md`** (raiz) é a memória do projeto (regras de ouro, stack, índice).
3. Para a marca/logo, veja **`docs/COMO-USAR-DESIGN-E-CODE.md`** e **`docs/ABILAR-BRIEF-LOGO-DESIGN.md`**.

## Documentos (`/docs`)
- `ESPECIFICACAO-ABILAR.md` — **mestre**: arquitetura, dados, pricing, pagamento/escrow, UX, fases, riscos.
- `ABILAR-MOBILE-EXPO.md` — app híbrido, push, câmera/áudio, aprovação nas lojas.
- `ABILAR-DESIGN-E-ACESSIBILIDADE.md` — design system + UX do marceneiro (baixa familiaridade com tech).
- `ABILAR-CIENCIA-DE-DADOS.md` — imagem (obra nova vs substituição), áudio→orçamento, coach de foto.
- `ABILAR-SEGURANCA-E-PAGAMENTOS.md` — modelo de ameaças, cadência de escrow, TDD/CI.
- `ABILAR-IDENTIDADE-VISUAL.md` — marca, cores, tipografia, a assistente ABI.
- `ABILAR-SOBRE-A-EMPRESA.md` — sobre, objetivo, mercado (base do PDF institucional).
- `ABILAR-BRIEF-LOGO-DESIGN.md` — brief para gerar o logo no Claude Design.
- `COMO-COMECAR.md` / `COMO-USAR-DESIGN-E-CODE.md` — guias práticos.

## Outros
- `wrangler.toml`, `.env.example`, `.gitignore` — config (raiz).
- `.claude/skills/nova-feature/SKILL.md` — skill do projeto (fluxo TDD + segurança).
- `brand/` — logo (SVG) e o PDF institucional.

## Stack
Next.js 15 + Cloudflare Workers (OpenNext) · Supabase (Postgres/Auth/Storage/Realtime) via Hyperdrive · Drizzle · Cloudflare Queues/R2/Browser Rendering · Expo (mobile) · Asaas (pagamento/escrow) · Gemini (toda IA) · ABI (assistente).

## Desenvolvimento (Fase 0 — fundação)

Pré-requisitos: **Node ≥ 20** e **pnpm 9** (`npm i -g pnpm@9`).

```bash
pnpm install          # instala o monorepo
pnpm dev              # Next.js em http://localhost:3000 (dummy landing + /api/health)
pnpm test             # vitest (pricing, shared, ai-vision, db) — rode ANTES de implementar (TDD)
pnpm lint             # eslint flat config
pnpm typecheck        # tsc no app + em todos os pacotes
pnpm build            # next build
pnpm preview          # build OpenNext + runtime Workers local (workerd)
pnpm deploy           # build OpenNext + deploy Cloudflare (requer auth + recursos)
pnpm db:generate      # drizzle-kit generate (migrations)
pnpm db:migrate       # drizzle-kit migrate
```

### Layout do monorepo
```
app/                 # Next.js 15 (App Router) — UI + Route Handlers + Server Actions
packages/shared/     # tokens de design, helpers de dinheiro (centavos) e mm, enums/zod
packages/pricing/    # motor financeiro PURO (Fase 3) — base do escrow já testada
packages/ai-vision/  # orquestração de imagem por IA (Fase 6) — contrato do provider
db/                  # schema Drizzle + cliente (Hyperdrive/postgres.js)
workers/             # consumers de Cloudflare Queues (a partir da Fase 6)
```

### Deploy na Cloudflare (passos manuais, fora do código)
A página dummy e o pipeline já compilam (`pnpm build`, `opennextjs-cloudflare build`,
`wrangler deploy --dry-run` ✓). Para o **primeiro deploy real**, ainda é preciso:
1. Criar os recursos: Hyperdrive (apontando p/ a conexão **direta 5432** do Supabase),
   R2 (`abilar-media`), KV, Queue (`abilar-jobs` + DLQ) — e colar os IDs no `wrangler.toml`.
2. `wrangler secret put` para `GEMINI_API_KEY`, `ASAAS_*`, `SUPABASE_SERVICE_ROLE_KEY`, etc.
3. Conectar a **Git integration** da Cloudflare ao repo (deploy automático no push).
4. Smoke test: abrir `/` e `GET /api/health`.
