---
name: nova-feature
description: Use ao implementar qualquer feature nova ou corrigir bug no Abilar. Garante o fluxo TDD + fases + segurança do projeto (teste antes do código, regras financeiras só por config, revisão de segurança em fluxos de dinheiro). Invoque com /nova-feature ou deixe o Claude carregar quando você pedir para implementar/alterar algo.
---

# Workflow padrão de feature — Abilar

Siga SEMPRE esta ordem ao implementar algo neste projeto:

1. **Contexto:** leia o `CLAUDE.md` e a seção relevante de `/docs` (mestre + o doc do papel: mobile, design, ciência de dados ou segurança). Identifique em qual **fase** (§9 do mestre) a tarefa se encaixa.
2. **Plano curto:** liste em 3–6 passos o que será feito e quais arquivos/entidades toca. Se a tarefa toca pagamento/escrow/auth/dados pessoais, anuncie que vai aplicar o checklist de segurança.
3. **Teste primeiro (TDD):** escreva os testes (casos felizes + bordas) ANTES da implementação. Para `packages/pricing`, escrow e saque, cobertura é inegociável.
4. **Implemente** o mínimo para os testes passarem. Dinheiro em centavos (`BIGINT`), dimensão em mm, regras financeiras só de `PricingConfig`, valor recalculado no servidor.
5. **Segurança (se aplicável):** rode o checklist de `docs/ABILAR-SEGURANCA-E-PAGAMENTOS.md` (autorização/RLS + ownership, validação zod, idempotência de webhook, sem segredo no código, rate limit).
6. **Verde:** `pnpm lint && pnpm typecheck && pnpm test`. Nada avança com pipeline vermelho.
7. **Commit pequeno** com mensagem clara; uma feature por PR.

Nunca: chutar taxa/percentual, confiar em valor vindo do cliente, pular teste, ou introduzir outro provedor de LLM além do Gemini.

Tarefa: $ARGUMENTS
