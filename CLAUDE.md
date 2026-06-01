# CLAUDE.md — Abilar

> Memória do projeto para o Claude Code. Leia este arquivo no início de **toda** sessão. Ele resume as regras; a fonte de verdade detalhada está em `/docs`.

## O que é
Marketplace de marcenaria sob demanda (estilo Airbnb/Uber para obra): tem uma assistente de IA chamada **ABI** (a voz do produto no chat de design, dicas de foto e orçamento por voz). Conecta clientes (PF) a marceneiros (PJ/MEI/PF), com cotação assistida por IA, edição de imagem por chat, pagamento por **evolução de obra (escrow)**, chat pós pré-aprovação, contrato padrão, blog automático e site institucional. Marca: **Abilar** · Assistente de IA: **ABI**. App **web (Next.js)** + **mobile (Expo)**.

## Documentos (fonte de verdade — leia conforme a tarefa)
- `docs/ESPECIFICACAO-ABILAR.md` — **mestre**: arquitetura, dados, pricing, pagamento, fases, riscos.
- `docs/ABILAR-MOBILE-EXPO.md` — app híbrido, push, câmera/áudio, aprovação nas lojas.
- `docs/ABILAR-DESIGN-E-ACESSIBILIDADE.md` — design system, UX do marceneiro (baixa familiaridade com tech), guia de foto.
- `docs/ABILAR-CIENCIA-DE-DADOS.md` — imagem (obra nova vs substituição), áudio→orçamento, coach de foto, completude.
- `docs/ABILAR-SEGURANCA-E-PAGAMENTOS.md` — modelo de ameaças, hardening, cadência de escrow, TDD/CI.

Antes de qualquer tarefa: releia a seção relevante do mestre **e** a §9 (Plano de Execução, fases).

## Regras de ouro (inegociáveis)
1. **TDD:** escreva o teste ANTES da implementação. Sem teste, não implementa.
2. **CI verde obrigatório:** lint + typecheck + testes + SCA em todo PR. Nada de merge com pipeline vermelho.
3. **Segurança primeiro:** é uma plataforma que move dinheiro. Tudo que toca pagamento/escrow/auth/dados pessoais passa pelo checklist de `docs/ABILAR-SEGURANCA-E-PAGAMENTOS.md`.
4. **Dinheiro = `BIGINT` em centavos.** Nunca `float`.
5. **Dimensão física = milímetros (mm)** inteiros. UI exibe em cm.
6. **Todo LLM é Gemini** (texto, NLU, imagem), 1 cliente / 1 `GEMINI_API_KEY`: `3.1 Flash-Lite` (NLU), `3 Flash` (conteúdo), `3.1 Flash Image`/Nano Banana 2 (imagem), `3.1 Pro` só se pedido.
7. **Regras financeiras só por configuração** (tabela `PricingConfig`). Nunca hardcode taxa/percentual. Faltou valor → TODO + default seguro.
8. **Servidor é a fonte de verdade de valor:** recalcular `quotePricing` no backend; nunca confiar em valor vindo do cliente.
9. **Trabalhe em fases** (§9 do mestre), uma de cada vez, em commits pequenos.
10. **Use sempre os design tokens** de `packages/shared/tokens.ts` (cores/fontes da marca) e o `docs/ABILAR-IDENTIDADE-VISUAL.md`. Nunca hardcode cor/fonte. Os tokens são PROVISÓRIOS até o Claude Design entregar os finais — só trocar os valores no arquivo.

## Stack
Next.js 15 (App Router) + React 19 + TS + Tailwind/shadcn → **Cloudflare Workers via `@opennextjs/cloudflare`** (Git integration). **Supabase** (Postgres + Auth + Storage + Realtime), acesso via **Hyperdrive** (⚠️ conexão **direta** 5432, nunca pooler 6543; `nodejs_compat`). ORM **Drizzle**. **Cloudflare Queues** (async), **R2** (mídia), **Browser Rendering** (PDF). Mobile **Expo**. Pagamento **Asaas** atrás de `PaymentProvider`. Push **Expo Notifications**.

## Estrutura
```
app/         # Next.js (páginas + Route Handlers + Server Actions) — rotas por papel
workers/     # consumers de Cloudflare Queues (image-gen, pdf, blog)
packages/    # shared (tipos/zod), pricing (puro, 100% testado), ai-vision
db/          # schema Drizzle + migrations + policies RLS
docs/        # as specs acima
.claude/skills/  # skills do projeto (workflows repetíveis)
```

## Comandos (preencher conforme implementa)
- `pnpm dev` — dev local
- `pnpm preview` — runtime Workers local (OpenNext)
- `pnpm test` / `pnpm test:watch` — testes (rodar ANTES de implementar)
- `pnpm lint && pnpm typecheck`
- `pnpm deploy` — deploy Cloudflare (ou via Git integration)
- `pnpm db:generate && pnpm db:migrate` — Drizzle

## Decisões fechadas (v1) — ver §1.2.1 do mestre
Matching por cidade+categoria+CEP/raio · login OTP telefone (+e-mail grátis) · auto-aprovação de marco em 5 dias · recebedor MEI/PJ/PF · desktop só web · comissão do arquiteto sai da fatia da plataforma · PT-BR · chat só após pré-aprovação · contrato padrão por projeto (revisar com advogado).

## Como pedir ajuda ao usuário
Só pergunte se for decisão de negócio nova e ambígua. Para o resto, siga as specs e os defaults; deixe TODO quando faltar valor.
