# Como começar o Abilar no VS Code (com Claude Code)

Guia prático: preparar a pasta, soltar os docs, dar o **prompt inicial** ao Claude Code e usar **Skills**.

---

## Passo 1 — Pré-requisitos
- **Node.js LTS** e **pnpm** instalados.
- **VS Code** + extensão/CLI do **Claude Code** (login na sua conta Anthropic).
- Contas: **Cloudflare**, **Supabase**, **Google AI Studio** (Gemini), **Asaas**, **GitHub**.

## Passo 2 — Criar a pasta do projeto e os docs
```
mkdir abilar && cd abilar
git init
mkdir docs .claude
```
Coloque os 5 specs em `docs/`:
- docs/ESPECIFICACAO-ABILAR.md
- docs/ABILAR-MOBILE-EXPO.md
- docs/ABILAR-DESIGN-E-ACESSIBILIDADE.md
- docs/ABILAR-CIENCIA-DE-DADOS.md
- docs/ABILAR-SEGURANCA-E-PAGAMENTOS.md

Na **raiz**, coloque: `CLAUDE.md`, `wrangler.toml`, `.env.example`, `.gitignore`.
Crie a skill do projeto: `.claude/skills/nova-feature/SKILL.md` (o arquivo `SKILL.md` que te entreguei vai aqui).

Estrutura final:
```
abilar/
├── CLAUDE.md
├── wrangler.toml
├── .env.example
├── .gitignore
├── docs/ (os 5 .md)
└── .claude/skills/nova-feature/SKILL.md
```

## Passo 3 — Abrir no VS Code e iniciar o Claude Code
- Abra a pasta no VS Code.
- Abra o Claude Code (painel ou terminal). Ele lê o `CLAUDE.md` automaticamente.
- Cole o **PROMPT INICIAL** (abaixo).

## Passo 4 — Repositório e CI
Crie o repo no GitHub e conecte a **Git integration** da Cloudflare (deploy automático no push). O Claude Code vai configurar o GitHub Actions na Fase 0.

---

## PROMPT INICIAL (cole no Claude Code)

```
Você vai construir o projeto "Abilar". Antes de qualquer código:

1. Leia o CLAUDE.md e TODOS os arquivos em /docs (mestre + mobile + design + ciência de dados + segurança). Eles são a fonte de verdade.
2. Não me faça perguntas agora — as decisões da v1 estão em §1.2.1 do mestre. Se faltar um valor, use um default seguro e deixe um TODO.

Regras inegociáveis (do CLAUDE.md): TDD (teste antes do código), CI verde obrigatório, segurança em primeiro lugar, dinheiro em centavos, dimensão em mm, todo LLM é Gemini, regras financeiras só por configuração, servidor é a fonte de verdade de valor, trabalhar em fases.

Comece pela FASE 0 (Plano de Execução, §9 do mestre):
- Monorepo pnpm: app Next.js 15 (App Router) + packages/{shared,pricing,ai-vision} + db/ (Drizzle).
- Adapter @opennextjs/cloudflare; preparar wrangler.toml (já existe um esqueleto na raiz — complete os bindings).
- Configurar CI no GitHub (lint, typecheck, test) e a Git integration da Cloudflare.
- CRÍTICO: validar o deploy com uma página dummy ANTES de qualquer feature (já tive dor com deploy no Cloudflare).
- Escrever os primeiros testes (mesmo que triviais) para o pipeline nascer verde.

Ao terminar a Fase 0, me mostre: o que criou, como rodar localmente, e o checklist da Fase 0 marcado. Só então seguimos para a Fase 1. Trabalhe em commits pequenos e use a skill /nova-feature no fluxo.
```

Depois de cada fase, um prompt curto: `Implemente a Fase 1 seguindo o CLAUDE.md e a §9. Use /nova-feature.`

---

## Como usar SKILLS no Claude Code

**O que é uma Skill:** uma pasta com um arquivo `SKILL.md` (frontmatter YAML + instruções em markdown). O Claude **carrega sozinho** quando a `description` casa com o que você pediu, ou você **invoca** como slash command pelo nome da pasta (skill `nova-feature` → `/nova-feature`). Diferente do `CLAUDE.md` (que está sempre no contexto), a Skill só entra quando é relevante — economiza contexto.

**Onde ficam:**
- Projeto: `.claude/skills/<nome>/SKILL.md` (versionado no repo, vale pra equipe).
- Pessoal (todos os seus projetos): `~/.claude/skills/<nome>/SKILL.md`.
- O **nome da pasta** define o nome da skill (não o nome do arquivo, que é sempre `SKILL.md`).

**Anatomia do SKILL.md:**
```
---
name: nova-feature
description: Quando usar a skill (seja específico — é isso que faz o Claude carregar na hora certa).
---
# Instruções em markdown que o Claude vai seguir...
$ARGUMENTS  # recebe o texto que você passa ao invocar
```

**Skills já embutidas** no Claude Code (sempre disponíveis): `/code-review`, `/debug`, `/loop`, `/batch`, `/claude-api`. Use `/code-review` antes de PRs sensíveis (pagamento!).

**Como usar no fluxo deste projeto:**
- Implementar algo → `/nova-feature criar o motor de pricing da Fase 3` (ou só peça "implemente X" e a skill carrega pela description).
- Antes de mergear fluxo de dinheiro → `/code-review`.

**Skills úteis para criar depois** (uma pasta cada em `.claude/skills/`):
- `revisao-seguranca` — roda o checklist de `docs/ABILAR-SEGURANCA-E-PAGAMENTOS.md` num diff.
- `nova-migration` — padroniza criação de migration Drizzle + policy RLS + teste.
- `novo-endpoint` — Route Handler com validação zod + autorização + teste, no padrão do projeto.

**Boas práticas:** `description` específica e com palavras-chave (melhora a ativação automática); inclua exemplos; teste a skill aos poucos; **nunca** coloque segredos (API keys) dentro de uma SKILL.md.

**Diferença rápida:**
- `CLAUDE.md` = memória sempre ativa (regras gerais do projeto).
- Skill = workflow/conhecimento carregado sob demanda (repetível, invocável por `/nome`).
- `/docs` = especificações longas (fonte de verdade), referenciadas pelo CLAUDE.md.

Skills seguem o padrão aberto Agent Skills (agentskills.io) e funcionam também no Claude.ai e no Claude Desktop — você define uma vez e usa em todo lugar.
