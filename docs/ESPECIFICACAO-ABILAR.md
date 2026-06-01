# Abilar — Especificação Técnica Completa (v1)

> **Marketplace de marcenaria sob demanda** — conecta clientes (PF) que querem fazer móveis planejados a marceneiros (PJ), com cotação assistida por IA, geração/edição de imagem por chat, arquitetos parceiros e motor financeiro de split/parcelamento configurável.

---

## 0. Como usar este documento com o Claude Code

Este documento é a **fonte de verdade** do projeto. Ele foi escrito para ser lido por um agente de codificação (Claude Code dentro do VS Code).

**Regras de trabalho para o agente:**

1. Antes de qualquer tarefa, releia a seção correspondente desta spec e a seção **§9 (Plano de Execução)**.
2. Trabalhe sempre em **fases** (§9). Não pule fases. Cada fase termina com testes passando e um commit.
3. Coloque uma cópia resumida das convenções (§1.4) num arquivo `CLAUDE.md` na raiz do repo, e referencie esta spec em `/docs/ESPECIFICACAO-ABILAR.md`.
4. **Nunca** invente regras de negócio financeiras: todas vivem em tabelas de configuração (§5). Se faltar um valor, deixe um TODO e um default seguro, não chute.
5. Toda quantia monetária é `BIGINT` em **centavos**. Nunca `float` para dinheiro.
6. Toda dimensão física é armazenada em **milímetros (mm)** como inteiro. UI exibe em cm.
7. **Todo LLM é Gemini** (texto, NLU e imagem), atrás de um cliente único com `GEMINI_API_KEY`: `3.1 Flash-Lite` para parsing/NLU, `3 Flash` para conteúdo, `3.1 Flash Image`/Nano Banana 2 para imagem, `3.1 Pro` só quando explicitado. Não introduzir outro provedor de LLM sem necessidade.
8. **TDD obrigatório:** escreva o teste **antes** da implementação. Nenhuma regra financeira, de escrow ou de pagamento entra sem teste cobrindo casos felizes e de borda.
9. **CI/CD no GitHub** desde o dia 1: cada PR roda lint + typecheck + testes + checagem de segurança (§ doc Segurança). Nada faz merge com pipeline vermelho.
10. **Segurança em primeiro lugar:** é uma plataforma que move dinheiro. Toda mudança que toque pagamento, escrow, auth ou dados pessoais exige revisão pelo checklist do `ABILAR-SEGURANCA-E-PAGAMENTOS.md`.
11. **Multiplataforma:** app **Expo (React Native)** para iOS e Android + app **Next.js** (web/desktop), compartilhando API, tipos (`packages/shared`) e tokens de design. Ver `ABILAR-MOBILE-EXPO.md`.
12. **Acessibilidade do marceneiro:** o público marceneiro tem baixa familiaridade com tecnologia. Toda tela de marceneiro segue `ABILAR-DESIGN-E-ACESSIBILIDADE.md` (ícone+áudio primeiro, texto mínimo, fluxo guiado, alvos grandes).

**Documentos por papel (workstreams paralelos):**
- `ESPECIFICACAO-ABILAR.md` (este) — arquitetura, dados, pricing, pagamento, fases. (eng. dados/backend)
- `ABILAR-MOBILE-EXPO.md` — app híbrido, push, câmera/áudio, lojas. (dev mobile)
- `ABILAR-DESIGN-E-ACESSIBILIDADE.md` — design system, UX marceneiro low-literacy, guia de foto. (frontend/design)
- `ABILAR-CIENCIA-DE-DADOS.md` — imagem (obra nova vs substituição), áudio→orçamento, coach de foto, completude. (cientista de dados)
- `ABILAR-SEGURANCA-E-PAGAMENTOS.md` — modelo de ameaças, hardening financeiro, cadência de escrow, TDD/CI. (segurança/pagamentos)

Estrutura de pastas alvo do monorepo:

```
abilar/                 # app Next.js full-stack único (deploy em Cloudflare Workers)
├── app/                    # App Router: páginas + Route Handlers (API) + Server Actions
│   ├── (client)/ (carpenter)/ (architect)/ (admin)/   # rotas por papel
│   └── api/                # webhooks (Asaas), endpoints internos
├── workers/                # consumers de Cloudflare Queues (image-gen, pdf, payments)
├── packages/
│   ├── shared/             # tipos, DTOs, schemas zod compartilhados
│   ├── pricing/            # motor de cálculo financeiro (puro, testável, sem I/O)
│   └── ai-vision/          # orquestração de edição de imagem
├── db/
│   ├── schema.ts           # Drizzle schema
│   └── migrations/         # migrations Supabase/Drizzle + policies RLS
├── docs/
│   └── ESPECIFICACAO-ABILAR.md
├── open-next.config.ts     # config do adapter OpenNext (caching etc.)
└── wrangler.toml           # bindings: Hyperdrive, R2, Queues, Browser Rendering, secrets
```

---

## 1. Visão geral, princípios e stack

### 1.1 Objetivo do produto
Permitir que uma pessoa física descreva uma necessidade de marcenaria (com foto do cômodo e medidas), **veja uma prévia visual gerada por IA** que ela edita conversando por chat, e receba **orçamentos de marceneiros**. A plataforma intermedia o pagamento e cobra comissão de ambos os lados, repassando parte a um arquiteto parceiro. O marceneiro também ganha um **módulo de gestão financeira gratuito** (orçamentos próprios, custos, lucro, relatórios, PDF).

### 1.2 Papéis (atores)
- **Cliente (PF):** cria pedidos, interage no chat de design, recebe e aceita orçamentos, paga.
- **Marceneiro (PJ ou PF):** vê pedidos, envia orçamentos, define parcelamento aceito, gerencia finanças, gera PDFs, edita/sugere melhorias no projeto do cliente.
- **Arquiteto parceiro:** cadastrado pela plataforma, aparece como parceiro, recebe % por transação. Sem custo para entrar.
- **Admin (plataforma):** configura taxas, promoções, parceiros, gateways; vê dashboards.

### 1.2.1 Decisões fechadas (v1)
1. **Matching de pedidos:** por **cidade + categoria**; marceneiro cadastra **CEP** e **raio (km)**; só recebe/ve pedidos dentro do raio e nas categorias que atende.
2. **Login:** **OTP por telefone (SMS)** como padrão (melhor p/ marceneiro); **e-mail/magic link gratuito** como opção (cliente). Se houver login social, incluir Sign in with Apple. Limitar envios (anti SMS-pumping).
3. **Auto-aprovação de marco:** **5 dias** sem resposta do cliente após evidência.
4. **Recebedor:** aceitar **MEI, PJ e PF (CPF)** — KYC do gateway antes do 1º repasse.
5. **Desktop:** **web responsivo** (sem app desktop nativo).
6. **Moderação de foto/áudio/chat:** triagem automática (Gemini) + denúncia/bloqueio.
7. **Comissão do arquiteto:** % sobre V saindo **da fatia da plataforma** (não acréscimo ao cliente).
8. **Idioma/região:** **PT-BR / Brasil** apenas.
9. **Chat cliente↔marceneiro:** habilitado **só após pré-aprovação** do cliente (§7.8).
10. **Contrato padrão** gerado por projeto aprovado (§6.5) — requer revisão jurídica.

### 1.3 Decisões de arquitetura (e porquês) — **produção: Supabase + Cloudflare**
- **Full-stack Next.js único** (App Router) deployado em **Cloudflare Workers via `@opennextjs/cloudflare`**, com **Git integration** (deploy automático no push, preview por branch, rollback). Não há monólito NestJS separado: a API vive em **Route Handlers / Server Actions** do Next.js. Motivo: `next-on-pages` (Pages) está **deprecado**; o caminho suportado e estável hoje é Workers+OpenNext, que entrega o mesmo CI/CD git-conectado do Pages.
  - ⚠️ **Pages literal não serve** para este app (full-stack); só funcionaria em export estático. O "deploy estilo Pages" que se deseja é entregue por Workers + Git integration.
- **Supabase como backend-as-a-service:** Postgres + **Auth** + **Storage** + **Realtime**. Autorização por **Row Level Security (RLS)** no Postgres — mapeia direto no modelo de papéis/ownership (§3), substituindo guards manuais.
- **Acesso ao banco a partir dos Workers via Cloudflare Hyperdrive** (pooling global + cache). ⚠️ Apontar o Hyperdrive para a **conexão DIRETA do Supabase (porta 5432, `db.<ref>.supabase.co`)**, **NUNCA** para o pooler Supavisor (6543) — double-pooling causa ~95% de erros 500. Hyperdrive já faz pooling em transaction mode. Requer flag `nodejs_compat` e driver `pg`/`postgres.js`.
- **ORM: Drizzle** (first-class em Workers, casa com Hyperdrive + `pg`). Alternativa: Prisma com `@prisma/adapter-pg`. (Trocamos o Prisma da v0 por Drizzle pela compatibilidade com o edge.)
- **Filas/async via Cloudflare Queues** (substitui Redis/BullMQ): geração de imagem, PDF e processamento de webhooks. Workers têm limite de CPU/tempo — toda tarefa longa é assíncrona via Queue + consumer Worker. A geração de imagem em si é só uma chamada HTTP ao modelo externo (não é CPU-bound), então cabe bem.
- **Real-time via Supabase Realtime** (canal websocket) para chat de design, feed de pedidos e notificações. ⚠️ **Não** usar `LISTEN/NOTIFY` do Postgres através do Hyperdrive — não passa por pooler de transação.
- **Storage de mídia em Cloudflare R2** (nativo dos Workers, sem custo de egress) para fotos, imagens geradas e PDFs. Supabase Storage é alternativa aceitável se quiser tudo num lugar só.
- **Camada de pagamento desacoplada** atrás de `PaymentProvider` (§6). Começa com **Asaas**; trocável por Pagar.me/Stone. Webhooks chegam num Route Handler/Worker.
- **Motor de pricing puro** (`packages/pricing`): funções determinísticas, sem I/O, 100% testadas, roda em qualquer runtime (inclusive Workers). Parte mais arriscada de errar.
- **Edição de imagem orquestrada** (`packages/ai-vision`): provider de modelo trocável (Gemini / Flux / Qwen) atrás de interface (§8), executada em consumer de Queue.

### 1.4 Stack alvo (produção)
| Camada | Tecnologia | Observação |
|---|---|---|
| App (front+back) | **Next.js 15 (App Router)**, React 19, TS, Tailwind, shadcn/ui | web/desktop; API em Route Handlers / Server Actions |
| Mobile (iOS+Android) | **Expo (React Native)**, EAS Build/Submit/Update | híbrido; consome a mesma API; ver `ABILAR-MOBILE-EXPO.md` |
| Push | **Expo Notifications** (FCM + APNs) + Web Push | notificações em todos os eventos (§14) |
| Áudio→texto/orçamento | **Gemini multimodal** (áudio nativo) | transcreve e estrutura num só passo; sem provedor extra |
| Deploy | **Cloudflare Workers** via **`@opennextjs/cloudflare`** + **Git integration** | push no GitHub → deploy automático, preview por branch, rollback |
| Estado/Dados | TanStack Query, Zustand (UI local) | |
| Banco | **Supabase Postgres** | dinheiro em centavos, dimensões em mm |
| Acesso ao banco | **Cloudflare Hyperdrive** + driver `pg`/`postgres.js` | ⚠️ apontar p/ conexão **direta** (5432), não pooler 6543; `nodejs_compat` |
| ORM | **Drizzle** | Workers-native; alt: Prisma + `@prisma/adapter-pg` |
| Auth | **Supabase Auth** + **RLS** | papéis (CLIENT/CARPENTER/ARCHITECT/ADMIN) e ownership no RLS |
| Real-time | **Supabase Realtime** | chat, feed de pedidos, notificações (não usar LISTEN/NOTIFY via Hyperdrive) |
| Fila/async | **Cloudflare Queues** (+ consumer Workers) | geração de imagem, PDF, webhooks |
| Storage | **Cloudflare R2** | fotos, imagens geradas, PDFs (alt: Supabase Storage) |
| Pagamento | **Asaas** (v1) → interface trocável | split, Pix, boleto, cartão |
| IA imagem | **Gemini 3.1 Flash Image (Nano Banana 2)** via API; fallback Flux Kontext | edição por instrução; mesmo `GEMINI_API_KEY` do texto |
| IA texto/NLU/conteúdo | **Gemini** (tudo que é LLM): **3.1 Flash-Lite** (NLU/parsing), **3 Flash** (blog); **3.1 Pro** opcional (qualidade) | provedor único; function calling p/ saída estruturada; free tier ~1.500 req/dia nos Flash |
| PDF | **Cloudflare Browser Rendering** (`@cloudflare/puppeteer`) p/ HTML→PDF; alt: `pdf-lib`/React-PDF | Puppeteer cru não roda no edge |
| Segredos/Config | Wrangler secrets + vars de ambiente do Worker | nunca hardcode chaves |

---

## 2. Glossário de domínio — Marcenaria (essencial para a IA)

Para a IA gerar/editar móveis com coerência, o sistema precisa **falar marcenaria**. Esta taxonomia alimenta tanto o parser de comandos (§8.4) quanto os prompts de imagem.

### 2.1 Tipos de peça
guarda-roupa, closet, armário de cozinha (base, aéreo, torre/coluna), balcão, bancada, painel de TV, estante/prateleiras, cabeceira, home office, rack, sapateira, banheiro (gabinete), lavanderia.

### 2.2 Materiais e chapas
- **MDF** (médio), **MDP** (mais barato, para caixaria reta), **compensado**, **madeira maciça**.
- Espessuras comuns: **15 mm**, **18 mm** (padrão de caixaria), **25 mm** (tampos/bancadas).
- **Fita de borda** (acabamento das bordas): PVC, ABS — cor combinando ou contrastante.

### 2.3 Acabamentos / cores
- **Melamínico/BP** (baixa pressão): padrões amadeirados (carvalho, freijó, nogueira, itapuã), lisos (branco, off-white, cinza, preto), texturizados.
- **Laca** (pintura): fosca ou brilhante, qualquer cor RAL.
- **Fórmica/laminado**.
- Padrões frequentes no Brasil: *Branco TX*, *Cinza Sagrado*, *Carvalho Hanover*, *Freijó*, *Nogal*, *Itapuã*.

### 2.4 Ferragens e sistemas
- Corrediças: convencional, **telescópica**, com amortecedor (soft-close).
- Dobradiças: 35 mm, com amortecedor.
- Puxadores: cava (perfil), barra, **sistema push (toque)**, puxador embutido (cabo/Gola).
- Iluminação: fita LED em nichos/prateleiras.
- Estrutura interna: gaveteiros, cabideiros, prateleiras reguláveis, divisórias.

### 2.5 Medidas (sempre em mm internamente)
Toda peça tem **L × A × P** (largura × altura × profundidade). Profundidade típica de guarda-roupa: 550–600 mm; cozinha base: 580 mm; aéreo: 350 mm. Vão entre balcão e aéreo: ~600 mm. Essas referências viram *defaults* sugeridos e *validações* de sanidade.

### 2.6 Conceito central de design
Um **Projeto** é composto por **Módulos**. Cada módulo tem dimensões, material, acabamento, ferragens e *itens internos* (gavetas, portas, prateleiras). A IA edita a *representação visual*; o **estado estruturado** (módulos + medidas + materiais) é o que vira orçamento. **A imagem nunca é fonte de verdade de medida** (ver §8.3).

### 2.7 Etapas reais de uma obra de marcenaria (base dos marcos de pagamento)
Sequência de execução de móveis planejados, usada como **marcos de liberação de pagamento** (§6.4). Cada marco (exceto o sinal) exige **evidência (foto) do marceneiro + aprovação do cliente** para liberar a parcela. Percentuais default, **configuráveis** por marceneiro/projeto:

| # | Marco | Evento concreto | % default |
|---|---|---|---|
| M0 | **Sinal / início** | medição final in loco; liberado ~1 semana antes de iniciar | 20% |
| M1 | **Material + corte** | chapas/ferragens compradas; peças cortadas, furadas, borda colada | 15% |
| M2 | **Montagem + acabamento** | módulos montados na oficina; pintura/laca; ferragens instaladas | 20% |
| M3 | **Entrega no local** | peças transportadas ao endereço do cliente | 15% |
| M4 | **Instalação** | módulos instalados e fixados no local | 20% |
| M5 | **Vistoria final** | regulagem de portas/gavetas, arremates, vedação; cliente aprova | 10% |

Soma = 100%. O cliente paga 100% antecipado (Pix/cartão); a plataforma retém em **escrow** e libera por marco aprovado. Garante o cliente (só paga pelo que foi feito) **e** o marceneiro (recebe pelo que entregou, sem calote).

---

## 3. Modelo de dados (Supabase Postgres / Drizzle)

Entidades principais (campos resumidos; o agente expande os schemas Drizzle). `User` é gerenciado pelo **Supabase Auth** (`auth.users`); os perfis abaixo referenciam `auth.uid()`. Remover `passwordHash` (a senha fica no Supabase Auth).

```
User            (= auth.users do Supabase) + tabela profiles: id(=auth.uid), role(CLIENT|CARPENTER|ARCHITECT|ADMIN), name, phone, createdAt
CarpenterProfile userId, personType(MEI|PJ|PF), name, companyName?, cnpjOrCpf, logoUrl, useDefaultLogo(bool),
                 bio, serviceCity, serviceCep, serviceRadiusKm, categories[](GUARDA_ROUPA|COZINHA|PAINEL|...),
                 kycStatus(PENDING|APPROVED|REJECTED), rating, asaasWalletId
ArchitectProfile userId, name, cau, commissionPercent(config p/ parceiro), asaasWalletId, active
Address          id, userId, cep, ...

Project          id, clientId, title, status(DRAFT|OPEN_FOR_QUOTES|IN_NEGOTIATION|HIRED|EXECUTED|CANCELLED),
                 roomType, workType(NEW_INSTALL|REPLACE_EXISTING), sourceType(AI_GENERATED|ARCHITECT_PROJECT),
                 architectId?, createdAt
ProjectPhoto     id, projectId, kind(ORIGINAL_ROOM|GENERATED|REFERENCE|ARCHITECT_PDF), url, version, isCurrent
Module           id, projectId, type, label, widthMm, heightMm, depthMm, material, finish, hardware(jsonb),
                 items(jsonb: gavetas/portas/prateleiras), notes
DesignChatMsg    id, projectId, role(USER|SYSTEM|ASSISTANT|CARPENTER), text, structuredCommand(jsonb),
                 resultingPhotoId?, createdAt

Quote            id, projectId, carpenterId, baseValueCents (V = valor do marceneiro),
                 maxInstallments, dilutionSharePct, status(SENT|PRE_APPROVED|ACCEPTED|REJECTED|EXPIRED|PAID),
                 lineItems(jsonb: material, mão de obra, ferragens), validUntil, pdfUrl, createdAt
QuoteEdit        id, quoteId, carpenterId, type(EDIT|SUGGESTION), payload(jsonb), createdAt  # marceneiro edita/sugere projeto

# Chat cliente↔marceneiro (habilitado só após pré-aprovação — §7.8)
Conversation     id, projectId, clientId, carpenterId, quoteId?, status(ACTIVE|CLOSED|BLOCKED), createdAt
Message          id, conversationId, senderId, body, redactedBody?(telefone/email/links mascarados),
                 attachments[](R2), readAt?, flaggedReason?, createdAt

# Contrato padrão por projeto aprovado (§6.5) — modelo, revisar com jurídico
Contract         id, projectId, quoteId, version, pdfUrl, terms(jsonb: escopo, valor, marcos, prazos, garantias),
                 clientAcceptedAt?, clientAcceptIpHash?, carpenterAcceptedAt?, carpenterAcceptIpHash?,
                 status(DRAFT|AWAITING_SIGNATURES|SIGNED|CANCELLED), createdAt

PricingConfig    id, key, scope(GLOBAL|PROMO), clientCommissionPct, carpenterCommissionPct,
                 architectCommissionPct, installmentTable(jsonb), promoRules(jsonb), activeFrom, activeTo
Transaction      id, quoteId, clientId, carpenterId, architectId?,
                 method(PIX|BOLETO|CARD), installments, displayedAmountCents,
                 chargedAmountCents, gatewayFeeCents, carpenterPayoutCents,
                 platformNetCents, architectPayoutCents, dilutionBreakdown(jsonb),
                 splitBreakdown(jsonb), escrowHeldCents, escrowReleasedCents,
                 status(PENDING|PAID|IN_ESCROW|PARTIALLY_RELEASED|RELEASED|REFUNDED|FAILED),
                 gatewayChargeId, createdAt

# Liberação por evolução de obra (escrow + marcos) — §6.4
WorkOrder        id, transactionId, quoteId, carpenterId, clientId,
                 plannedStartDate, status(SCHEDULED|IN_PROGRESS|DONE|CANCELLED),
                 totalCents, createdAt
Milestone        id, workOrderId, order, code(M0..M5|custom), label, releasePct,
                 status(PENDING|EVIDENCE_SENT|APPROVED|REJECTED|RELEASED),
                 evidenceUrls[](R2), carpenterNote, clientApprovedAt, releasedAt, amountCents
WalletEntry      id, carpenterId, type(RELEASE|WITHDRAWAL|ADJUSTMENT), amountCents,
                 milestoneId?, balanceAfterCents, createdAt
Withdrawal       id, carpenterId, amountCents, method(PIX), pixKey, status(REQUESTED|PAID|FAILED),
                 gatewayTransferId, createdAt

# Gestão financeira do marceneiro (gratuito) — catálogo de custo + orçamento inteligente
CarpenterMaterial id, carpenterId, name, category(CHAPA|FERRAGEM|ACESSORIO|FITA_BORDA|SERVICO|FRETE|OUTRO),
                 unit(UN|M2|ML|H), unitCostCents, sku?, supplier?, active, updatedAt
CarpenterQuote   id, carpenterId, source(PLATFORM|EXTERNAL), clientName?, projectId?,
                 items(jsonb: materialId|free, qty, unitCostCents, marginPct), laborCents,
                 subtotalCostCents, marginCents, totalCents, completenessFlags(jsonb),
                 status(DRAFT|SENT|ACCEPTED|LOST), pdfUrl, createdAt
CarpenterProject id, carpenterId, fromQuoteId?, source(PLATFORM|EXTERNAL), title,
                 startDate, estimatedEndDate, status(QUEUED|ACTIVE|DONE|CANCELLED), createdAt
CarpenterSettings carpenterId, maxParallelProjects, defaultMilestoneTemplate(jsonb),
                 dilutionSharePct(quanto da diluição ele absorve, >= minConfig), defaultMaxInstallments

# Notificações push (multiplataforma) e entrada por áudio
PushToken        id, userId, platform(IOS|ANDROID|WEB), token(Expo/FCM/APNs/WebPush), active, lastSeenAt
NotificationPref userId, newQuoteRequest(bool), quoteSubmitted(bool), quoteApproved(bool),
                 milestoneUpdate(bool), payout(bool), channels(jsonb: push|email)
AudioInput       id, userId, role(CLIENT|CARPENTER), purpose(PROJECT_BRIEF|QUOTE_DRAFT), url(R2),
                 transcript, structuredResult(jsonb), createdAt   # transcrição+extração via Gemini multimodal

# Blog / motor de conteúdo + SEO (§12)
ContentTopic     id, cluster(ex: CUSTOS|CONTRATAR_MARCENEIRO|MOVEIS_PLANEJADOS|ARQUITETO|REFORMA),
                 primaryKeyword, secondaryKeywords[], searchIntent, audience(CLIENT|CARPENTER|ARCHITECT),
                 status(BACKLOG|USED), priority, createdAt
BlogPost         id, topicId?, slug(unique), title(<=60ch), metaDescription(<=155ch), excerpt,
                 bodyMarkdown, heroImageUrl, heroImageAlt, cluster, primaryKeyword, keywords[],
                 ctaTarget(CLIENT_SIGNUP|CARPENTER_SIGNUP|BOTH), faq(jsonb),
                 status(DRAFT|REVIEW|PUBLISHED|REJECTED), qualityScore, jsonLd(jsonb),
                 author, publishedAt, updatedAt, createdAt
BlogImage        id, postId, prompt, url(R2), alt, width, height          # imagem gerada, nunca da web
GenerationLog    id, kind(POST|IMAGE|KEEPALIVE), provider, costCents, success, error?, createdAt
```

Índices obrigatórios: `Project(status, createdAt)` (feed de pedidos), `Quote(projectId)`, `Quote(carpenterId, status)`, `Transaction(status)`, `Module(projectId)`. (Você já viveu o problema de índice faltando causando pico de CPU em réplica — aplique cedo aqui.)

**RLS (obrigatório):** cada tabela tem políticas — cliente só lê/edita seus `Project`/`Transaction`/`Conversation`; marceneiro lê `Project` com status `OPEN_FOR_QUOTES` **dentro do seu raio/cidade/categorias** e escreve seus `Quote`/`CarpenterJob`; **só participantes leem/escrevem na sua `Conversation`/`Message`** (e a conversa só existe após pré-aprovação); arquiteto lê transações que indicou; admin (claim/role) tudo. Como os Workers acessam via Hyperdrive com um usuário de banco, **propague o `auth.uid()`/role** para o contexto da query (ex.: `set local request.jwt.claims`) ou aplique a checagem na própria Server Action — definir a estratégia de RLS na Fase 1.

---

## 4. Domínios da aplicação (Route Handlers / Server Actions + Supabase + Queues)

> Não há monólito NestJS. Cada "domínio" é um conjunto de Route Handlers/Server Actions + acesso ao Supabase (com RLS) + consumers de Queue quando houver trabalho assíncrono. Mantêm fronteiras lógicas claras em `packages/`/pastas.

1. **auth** — **Supabase Auth**: **OTP por telefone (SMS)** padrão + **e-mail/magic link** (grátis); Sign in with Apple se houver social; papel no `user_metadata`; autorização por **RLS**. Limitar envios de OTP (anti SMS-pumping).
2. **users / profiles** — perfis de cliente, marceneiro (tipo MEI/PJ/PF, logo, cidade/CEP/raio, categorias, KYC), arquiteto.
3. **matching** — casa `Project` ↔ marceneiros elegíveis por **cidade + categoria + raio (CEP→geocode→distância)**; alimenta feed e push (§10).
4. **projects** — CRUD de projeto, módulos, fotos, status, `workType`, sourceType (IA vs projeto de arquiteto).
5. **design-chat** — Server Action recebe mensagem → enfileira em **Cloudflare Queue** → consumer chama `ai-vision` → grava nova imagem → cliente recebe via **Supabase Realtime**. Onboarding/guia (§7.4).
6. **quotes** — marceneiro envia orçamento (V, parcelas, diluição, itens), edita/sugere (`QuoteEdit`), PDF (Queue).
7. **chat** — conversa **cliente↔marceneiro** via **Supabase Realtime**, criada **só após pré-aprovação** (§7.8); **mascara telefone/e-mail/links** (anti-disintermediação); moderação/denúncia/bloqueio.
8. **contracts** — gera **contrato padrão** por projeto aprovado (§6.5); aceite eletrônico das duas partes (timestamp + hash de IP); PDF via Browser Rendering → R2.
9. **pricing** (usa `packages/pricing`) — calcula preço exibido, split, parcelamento/diluição, valida margem. Inline (puro).
10. **payments** — `PaymentProvider` (Asaas); cobrança com split; **escrow + liberação por marco** (§6.4); webhooks idempotentes; **saque via Pix**; carteira.
11. **finance-carpenter** (100% gratuito) — **catálogo de custo**, **construtor de orçamento** + **verificador de completude** (§7.6); orçamentos PLATFORM/EXTERNAL; relatórios; PDF.
12. **project-pipeline** (marceneiro) — orçamento aceito → `CarpenterProject`; **calendário**; limite de **paralelos** + alerta (§7.7).
13. **work-order** — converte `Transaction` paga em `WorkOrder` + `Milestone`s (§6.4); evidência; aprovação → libera parcela.
14. **architects** — cadastro, vitrine, comissão (sai da fatia da plataforma).
15. **notifications** — **Supabase Realtime** + push/e-mail (§10): pedido, orçamento, pré-aprovação/chat, pagamento, marco, saldo.
16. **admin-config** — CRUD de `PricingConfig` (incl. diluição), promoções, gateways, parceiros, templates de marco e de contrato.
17. **pdf** — consumer de Queue: orçamento/contrato → **Browser Rendering** → R2.
18. **media** — upload/URLs assinadas no **R2**, versionamento.
19. **site** — **site institucional** (landing, §7.0).
20. **content-engine** — Cron 2×/dia gera post + imagem (§12).
21. **seo** — sitemap/robots/JSON-LD/metadata (§12.4).
22. **ops/keepalive** — Cron de heartbeat (§11).

---

## 5. Motor de pricing, split e parcelamento (`packages/pricing`)

> Esta é a parte mais sensível. Tudo aqui é **função pura** e **configurável**. Nada hardcoded.

### 5.1 Variáveis de configuração (em `PricingConfig`)
- `tc` = comissão do **cliente** (% sobre V).
- `tm` = comissão do **marceneiro** (% sobre V).
- `a`  = comissão do **arquiteto** (% sobre V; 0 se não houver arquiteto).
- `installmentTable[n] = { mdrPct }` — taxa efetiva da adquirente por nº de parcelas (custo real).
- `dilutionMinCarpenterSharePct` = mínimo da diluição que o marceneiro **precisa** absorver (ex.: 50%).
- `dilutionPlatformMarginPct` = pequena margem que a plataforma adiciona sobre o custo de parcelamento (o ganho da plataforma na diluição).
- `promoRules` — overrides temporários (zera/reduz `tc`, `tm`, diluição, etc.).

**Diluição da taxa de parcelamento (modelo novo — escolhido pelo marceneiro):**
Ao definir o orçamento, o marceneiro escolhe `dilutionSharePct` = quanto do custo de parcelamento ele absorve (entre `dilutionMinCarpenterSharePct` e 100%). O cliente absorve o restante **+** a margem da plataforma. Assim a taxa é **diluída entre os dois**, o cliente paga menos do que pagaria sozinho, e a plataforma ganha a margem.

### 5.2 Fórmulas

**Base (V = valor que o marceneiro quer pelo serviço):**
```
precoBase_cliente        = V * (1 + tc)          # mostrado ao cliente, à vista, taxa embutida
payout_marceneiro_avista = V * (1 - tm)
repasse_arquiteto        = V * a
plataforma_liquida_avista= V * (tc + tm) - repasse_arquiteto - custoFixoPix
```
**À vista (Pix/boleto):** sem acréscimo. Cliente paga `precoBase_cliente`.

**Parcelado em n (cartão) — diluição:**
```
s              = dilutionSharePct        # fatia do custo que o MARCENEIRO escolhe absorver (>= mínimo)
mp             = dilutionPlatformMarginPct
custoParc      = precoBase_cliente * mdr(n)        # custo real do parcelamento (adquirente)

# marceneiro absorve a fatia s do custo (recebe menos):
payout_marceneiro_parc = payout_marceneiro_avista - (s * custoParc)

# cliente absorve o restante (1 - s) MAIS a margem da plataforma:
acrescimo_cliente      = (1 - s) * custoParc + (mp * precoBase_cliente)
precoExibido_cliente   = precoBase_cliente + acrescimo_cliente

# fechamento (a plataforma recebe o pago, paga adquirente, marceneiro e arquiteto):
plataforma_liquida_parc = precoExibido_cliente - (precoExibido_cliente * mdr(n))
                          - payout_marceneiro_parc - repasse_arquiteto
delta_parcelamento      = plataforma_liquida_parc - plataforma_liquida_avista   # >= 0 por construção (margem mp)
```
O marceneiro **vê em tempo real**, ao escolher `s` e o nº máximo de parcelas, quanto receberá em cada cenário — para decidir o que topa.

**Restrições que o motor valida:**
- `dilutionMinCarpenterSharePct <= s <= 1`.
- `payout_marceneiro_parc >= custo informado do marceneiro` (nunca pagar abaixo do custo).
- `delta_parcelamento >= plataforma_liquida_avista` (a margem `mp` garante ganho na diluição).

### 5.3 Exemplo trabalhado (sanity check — incluir como teste)

Config: `V = R$ 20.000,00`, `tc = 8%`, `tm = 10%`, `a = 3%`; **10x**: `mdr(10)=4,5%`; marceneiro escolhe `s = 50%`; `mp = 1%`.

**À vista (Pix):**
- Cliente paga: `20.000 × 1,08 = R$ 21.600,00`
- Marceneiro recebe: `20.000 × 0,90 = R$ 18.000,00`
- Comissão bruta: `20.000 × 0,18 = R$ 3.600,00`; arquiteto `600,00`; **plataforma líquida ≈ R$ 3.000,00**.

**Parcelado 10x (marceneiro escolheu absorver s = 50%, margem plataforma mp = 1%):**
- `custoParc = 21.600 × 0,045 = R$ 972,00`
- Marceneiro absorve `0,5 × 972 = R$ 486` → recebe `18.000 − 486 = R$ 17.514,00`
- Acréscimo ao cliente `= (1−0,5)×972 + 0,01×21.600 = 486 + 216 = R$ 702,00`
- Cliente paga: `21.600 + 702 = R$ 22.302,00`
- Adquirente leva: `22.302 × 0,045 = R$ 1.003,59`
- Plataforma líquida: `22.302 − 1.003,59 − 17.514 − 600 = R$ 3.184,41` → **delta ≈ +R$ 184,41**

Conferência: cliente pagou `+702` e marceneiro absorveu `486`; o custo da maquininha é `~1.004`; a margem da plataforma (`216`) cobre o MDR sobre o acréscimo e deixa `~184` de ganho extra. ✔️ Fechou e a plataforma ganha na diluição. Se o marceneiro escolher `s = 100%`, ele absorve mais, o cliente paga só a margem da plataforma, e o marceneiro recebe `~17.028` — tudo recalculado pelo motor e mostrado a ele antes de enviar.

> **Insight de produto:** o marceneiro escolhe `s` (quanto da taxa ele dilui) e vê *na hora* quanto recebe em cada nº de parcelas. O cliente nunca vê a "taxa da maquininha" crua — só um acréscimo suave. A plataforma sempre ganha a margem `mp`.

### 5.4 Contrato da função
```ts
function quotePricing(input: {
  baseValueCents: number;      // V
  config: PricingConfig;       // tc, tm, a, installmentTable(mdr), diluição, promo
  installments: number;        // 1 = à vista
  method: 'PIX' | 'BOLETO' | 'CARD';
  carpenterDilutionSharePct: number; // s, escolhido pelo marceneiro (>= mínimo)
  carpenterCostCents?: number; // proteção de margem
}): {
  displayedAmountCents: number;
  carpenterPayoutCents: number;
  architectPayoutCents: number;
  gatewayFeeCents: number;
  platformNetCents: number;
  installmentDeltaCents: number;
  valid: boolean;
  warnings: string[];
}
```

---

## 6. Fluxo de pagamento (módulo `payments`)

### 6.1 Provider trocável
```ts
interface PaymentProvider {
  createRecipient(profile): Promise<WalletId>;            // marceneiro/arquiteto (subconta)
  createCharge(params: ChargeParams): Promise<Charge>;    // split + retenção em escrow
  releaseEscrow(params: { chargeId, recipientId, amountCents }): Promise<void>; // libera marco
  transferToPix(params: { recipientId, amountCents, pixKey }): Promise<Transfer>; // saque
  handleWebhook(payload): Promise<NormalizedEvent>;
}
```
**v1 = `AsaasProvider`.** Asaas tem split nativo (percentual/fixo sobre o valor líquido, sem limite de recebedores), **conta escrow com liberação por prazo OU por evento** (mapeia direto nos marcos), saque/transferência Pix por subconta, Pix/boleto/cartão — homologado pelo BACEN. Toggles úteis: "cobra taxa de processamento do parceiro" e "comissão incide sobre parcelamento". Alternativa marketplace-grade com taxa mais negociável por volume: **Pagar.me/Stone**.

### 6.2 Sequência (com escrow por evolução de obra)
1. Cliente aceita orçamento → escolhe método e parcelas (`carpenterDilutionSharePct` já definido pelo marceneiro).
2. Backend chama `quotePricing` (§5) → valores definitivos.
3. `payments` cria a cobrança no Asaas; cliente paga **100% antecipado** (Pix/boleto à vista, ou cartão parcelado).
4. Webhook `PAYMENT_CONFIRMED` → `Transaction.PAID` → valor **retido em escrow** (`IN_ESCROW`) → cria `WorkOrder` + `Milestone`s a partir do template (§2.7).
5. Marco **M0 (sinal)** libera ~1 semana antes do início → `releaseEscrow` da parcela → `WalletEntry(RELEASE)`.
6. Para cada marco seguinte: marceneiro envia evidência (foto) → cliente aprova → `releaseEscrow` da % do marco → `Transaction` vai a `PARTIALLY_RELEASED`.
7. Último marco aprovado → `RELEASED`. Repasse do arquiteto também é liberado conforme política.
8. **Saque:** marceneiro vê saldo (`WalletEntry`), escolhe deixar na plataforma ou `transferToPix` para a conta dele (`Withdrawal`).

### 6.3 Pontos de atenção
- **Tributação:** split bem-feito faz a plataforma pagar imposto só sobre a **comissão**, não sobre o GMV. Validar com contador.
- **Reembolso/cancelamento:** modelar `REFUNDED` e cancelamento parcial (e se a obra parar no meio?) desde já.
- **Idempotência de webhook:** chave única por `gatewayChargeId` + tipo de evento.
- **Antecipação x escrow:** como o cliente paga antecipado e a liberação é por marco, o custo de parcelamento entra no cálculo da diluição (§5), não em antecipação avulsa.

### 6.4 Liberação por evolução de obra (escrow + marcos) e disputa
- `WorkOrder` espelha o `Transaction` pago; `Milestone`s seguem o template de §2.7 (percentuais **configuráveis** pelo marceneiro em `CarpenterSettings.defaultMilestoneTemplate`).
- Fluxo de cada marco: `PENDING` → marceneiro sobe evidência (`EVIDENCE_SENT`) → cliente `APPROVED`/`REJECTED`. Aprovação dispara `releaseEscrow`.
- **Auto-aprovação com prazo:** se o cliente não responder em **5 dias** (configurável) após a evidência, o marco auto-aprova — evita travar o dinheiro do marceneiro por inércia. Notificar antes (lembrete em D-2 e D-1).
- **Disputa:** se `REJECTED`, abre disputa (status do `WorkOrder`), congela a parcela e aciona mediação da plataforma (admin). Registrar tudo.
- Segurança dos dois lados: cliente só paga o que foi aprovado; marceneiro tem garantia de recebimento por etapa entregue (o dinheiro já está retido, não depende da boa vontade do cliente em pagar depois).

### 6.5 Contrato padrão por projeto aprovado
Quando o cliente aceita o orçamento (projeto vira `HIRED`), o sistema **gera um contrato padrão** (`Contract`) antes da liberação do primeiro marco.
- **Partes:** cliente, marceneiro e a plataforma como **intermediária** (não executora).
- **Conteúdo (campos do template):** escopo (projeto, módulos, medidas, materiais, acabamento), valor total e forma de pagamento, **cronograma de marcos** (§2.7) com % e gatilhos, prazos (início/estimativa de término), **garantias** (defeitos/assistência), regras de **escrow e disputa**, cancelamento/reembolso, **LGPD**, foro.
- **Aceite eletrônico:** as duas partes aceitam digitalmente (clique + timestamp + hash de IP gravados em `Contract`). v1 = aceite eletrônico registrado; e-signature formal (ICP-Brasil/terceiro) pode entrar depois.
- **PDF** gerado (Browser Rendering → R2), disponível para download pelos dois lados.
- ⚠️ **Jurídico:** este é um modelo técnico; o texto do contrato **deve ser revisado/validado por advogado** antes de entrar em produção. A spec define a estrutura, não o teor legal.

---

## 7. UX / Design de telas (visão de engenheiro de produto)

### 7.0 Site institucional (porta de entrada — `/`)
A **primeira tela do sistema é a landing pública**, não o app. Ela vende a plataforma e converte em cadastro. Logado, o usuário é levado ao app por papel.
- **Seções:** herói com proposta de valor; "para quem contrata" (cliente PF); "para marceneiros"; "para arquitetos parceiros"; **como funciona** (cotação visual por IA → orçamentos → pagamento seguro por etapa); **segurança/garantias** dos dois lados (escrow por evolução, só paga o aprovado / só recebe o entregue); prova social/depoimentos; FAQ; rodapé.
- **Argumento central (por que usar a plataforma e não "por fora"):**
  - *Cliente:* vê o projeto antes de contratar, compara orçamentos, e o **dinheiro fica protegido em escrow** liberado por etapa aprovada — sem risco de pagar adiantado e a obra não sair.
  - *Marceneiro:* recebe pedidos qualificados, **gestão de orçamento e custos grátis** (com verificador que evita orçar no prejuízo), recebe garantido por etapa entregue, e gestão da agenda/projetos.
  - *Arquiteto:* indica e ganha comissão sem custo.
- **CTAs:** `Cadastrar como cliente` (`/cadastro/cliente`), `Cadastrar como marceneiro` (`/cadastro/marceneiro`), `Entrar` (login), e link para o **Blog** (§12). SEO completo (§12.4) também se aplica à landing.

### 7.1 Princípios
- **Mobile-first**, telas curtas, um objetivo por tela.
- **Progressão guiada** (wizard) para o cliente que não entende de marcenaria.
- Linguagem leiga, zero jargão técnico para o cliente; jargão completo para o marceneiro.
- Feedback visual imediato no chat de design (o "uau" do produto).

### 7.2 Jornada do Cliente (PF)
1. **Onboarding curto** → "O que você quer fazer?" (guarda-roupa, cozinha, painel…) com cards ilustrados.
2. **Foto do cômodo** → câmera/upload. Ou "Tenho projeto de arquiteto" → upload do PDF (pula a geração por IA).
3. **Medidas guiadas** → formulário visual: largura/altura/profundidade do vão, com ilustração de *onde medir*. Validação de sanidade (§2.5).
4. **Chat de design** (§7.4) → vê prévia, conversa, itera até gostar.
5. **Publicar pedido** → fica `OPEN_FOR_QUOTES`.
6. **Receber orçamentos** → lista de marceneiros (foto do projeto, valor já com taxa embutida, prazo, nota/avaliação).
7. **Aceitar** → escolher Pix/boleto/cartão e parcelas → ver valor final → pagar.
8. **Acompanhar** → status da obra.

### 7.3 Jornada do Marceneiro (PJ)
1. **Feed de pedidos** na sua área de atuação (novos pedidos com badge em tempo real).
2. **Abrir projeto** → fotos, módulos, medidas, material desejado.
3. **Editar/sugerir** → pode propor melhor solução (`QuoteEdit`), que volta pro cliente.
4. **Enviar orçamento** → V, itens (do catálogo de custo), validade, **parcelas aceitas** + **diluição `s`** (vê payout por cenário, §5.3), passando pelo **verificador inteligente** (§7.6).
5. **Pipeline & agenda** → transforma orçamento aceito em projeto ativo, calendário, limite de paralelos (§7.7).
6. **Obra em andamento** → sobe evidência por marco; acompanha liberações no escrow; **saque via Pix** (§6.4).
7. **Gestão financeira gratuita** → catálogo de custo, orçamentos PLATFORM/EXTERNAL, lucro, relatórios, PDF.
8. **Identidade** → upload de logo próprio ou usar logo da plataforma.

### 7.4 O Chat de Design Guiado (coração da usabilidade)
Objetivo: o cliente **não edita imagem**; ele **fala** e a imagem muda. Para o sistema "entender fácil", o chat é **guiado**, não um campo de texto vazio.

Elementos:
- **Mensagem de boas-vindas com exemplos clicáveis** ("toque para experimentar"): _"Mude para tom amadeirado claro"_, _"Adicione gavetas embaixo"_, _"Quero portas de vidro"_.
- **Chips de ação contextual** abaixo do input, agrupados: **Cor/Acabamento**, **Material**, **Layout** (add/remover gaveta, porta, prateleira), **Medidas**, **Ferragens/Puxadores**, **Iluminação**.
- **Quick-edit de medidas:** quando o comando envolve dimensão, abre um *stepper* ("estender base em ___ cm") em vez de depender só de texto — isso garante precisão e alimenta o estado estruturado (§8.3).
- **Histórico com miniaturas:** cada versão da imagem fica salva; cliente volta para qualquer versão (undo visual).
- **Indicador de "o que entendi":** após cada comando, o sistema mostra em 1 linha a interpretação ("✓ Troquei o acabamento para Carvalho Hanover") — transparência e correção fácil.
- **Tutorial de 3 passos** na primeira vez (coachmarks).

### 7.6 Orçamento inteligente do marceneiro (gratuito) — anti-prejuízo
Problema real: marceneiros esquecem itens (dobradiça, parafuso, fita de borda, frete, instalação) e orçam no prejuízo. O sistema apoia:
- **Catálogo de custo** (`CarpenterMaterial`): o marceneiro cadastra seus materiais/serviços com **preço de custo** (chapa por m², ferragem por unidade, mão de obra por hora, frete…). Reutilizável em todo orçamento.
- **Construtor de orçamento**: monta itens a partir do catálogo (ou avulsos), define margem, e o sistema calcula custo, margem e total.
- **Verificador de completude (Gemini + regras):** ao fechar, analisa o tipo de peça (guarda-roupa, cozinha, etc.) e **alerta o que costuma faltar** — "Você não incluiu **dobradiças** (este móvel tem ~6 portas)", "Faltou **fita de borda**", "Sem **instalação/frete**", "Sem **corrediças** para as gavetas". Baseado num **checklist por tipo de peça** (regras determinísticas) + verificação semântica do Gemini. Nunca bloqueia; **sugere**.
- **Orçamentos EXTERNAL:** o marceneiro registra orçamentos pegos fora da plataforma (custo, valor cobrado, lucro) → entra nos relatórios. 100% grátis — é isca de adoção.
- Todo orçamento exporta **PDF bonito** (foto, medidas, materiais, logo).

### 7.7 Pipeline e agenda do marceneiro
- **Orçamento aceito → projeto ativo** (`CarpenterProject`): o marceneiro define **data de início** e o sistema estima término.
- Também pode **cadastrar projeto ativo manualmente** (obra pega por fora), sem precisar de orçamento na plataforma.
- **Calendário** mostrando todos os projetos em paralelo; visão de quando um termina para encaixar o próximo.
- **Limite de paralelos** (`CarpenterSettings.maxParallelProjects`): o marceneiro define quantas obras quer tocar ao mesmo tempo; o sistema **alerta** ao exceder ("você já tem 4 obras ativas; aceitar esta pode atrasar as demais").

### 7.8 Pré-aprovação e chat cliente↔marceneiro
O chat **não** é aberto para todos os marceneiros que orçaram — só após o cliente **pré-aprovar**.
- O cliente vê os orçamentos recebidos e **pré-aprova** um ou mais marceneiros (`Quote.status = PRE_APPROVED`). Isso **cria a `Conversation`** e libera o chat com aquele(s) marceneiro(s).
- Chat em tempo real (**Supabase Realtime**): texto, foto (R2) e áudio. Serve para tirar dúvidas, ajustar detalhes do projeto/orçamento, combinar visita técnica.
- **Anti-disintermediação:** o sistema **mascara telefone, e-mail e links** nas mensagens (regex + revisão), e os termos proíbem fechar por fora. Reforçar na UI que a **garantia do escrow só existe dentro da plataforma**.
- **Moderação (exigência das lojas):** denunciar mensagem, bloquear usuário, contato de suporte; triagem automática de conteúdo impróprio.
- Depois do alinhamento no chat, o cliente **aceita** o orçamento (`ACCEPTED`) → pagamento → contrato (§6.5) → escrow/marcos.

### 7.5 Telas (mapa)
Cliente: Landing(`/`) · Login/Cadastro · Onboarding · NovoPedido(Tipo: nova/substituição) · FotoCômodo · MedidasGuiadas · ChatDesign · MeusPedidos · OrçamentosRecebidos · **Pré-aprovar** · **ChatComMarceneiro** · Checkout/Pagamento · **Contrato(aceite)** · AcompanhamentoObra(marcos+aprovação).
Marceneiro: FeedPedidos(por área/categoria) · DetalheProjeto · Editar/Sugerir · **ConstrutorDeOrçamento(+verificador, por voz)** · CatálogoDeCusto · MeusOrçamentos · **ChatComCliente** · **Contrato(aceite)** · **Pipeline/Calendário** · **ObraEmAndamento(evidências)** · **Carteira/Saque** · Relatórios · MinhaIdentidade.
Arquiteto: Perfil · MinhasIndicações/Comissões.
Admin: ConfigTaxas · Promoções · Parceiros(Arquitetos) · Gateways · **Mediação de disputas** · Dashboards.

---

## 8. Ciência de dados — Geração e edição de imagem por chat

> Detalhe completo (obra nova vs substituição, áudio→orçamento, coach de foto, completude) em **`ABILAR-CIENCIA-DE-DADOS.md`**. Resumo abaixo. Nota-chave: o pipeline ramifica por `Project.workType` — **NEW_INSTALL** (inserir móvel onde não há nada) usa detecção de parede/área vazia + colocação respeitando perspectiva; **REPLACE_EXISTING** segmenta a peça antiga (máscara) e faz inpainting do novo no lugar.

> Problema: a partir da foto real do cômodo (ou de uma referência), gerar uma prévia realista do móvel e deixar o cliente **alterá-la conversando** ("muda pra verde", "estende a base 10 cm"), **respeitando** o ambiente e as medidas, sem o cliente editar nada manualmente.

### 8.1 Estado da arte (pesquisa, 2026)
Modelos de **edição por instrução** (recebem imagem + texto e alteram só o necessário, preservando o resto):
- **Gemini 3.1 Flash Image (Nano Banana 2):** forte em edição semântica, realismo, consistência multi-referência (até ~14 imagens), preservação de contexto; via API Gemini. (`gemini-2.5-flash-image` será descontinuado em out/2026 — usar a versão 3.1.) **Recomendado como default.**
- **Flux.1 Kontext [pro] / Flux.2 [pro] Edit:** ótimo para edições **iterativas multi-turno** com consistência — bom como fallback/segunda opção.
- **Qwen-Image-Edit (Plus):** open-source, **fine-tunável**, forte em preservação de identidade e edição local; opção se você quiser treinar com catálogo de marcenaria e self-host no futuro.
- Acesso unificado via agregador (ex.: **fal.ai**) facilita trocar de modelo por custo/qualidade sem mudar integração.

### 8.2 Arquitetura do pipeline (`packages/ai-vision`)
```
[Comando do cliente em PT-BR]
        │
        ▼
[NLU com Gemini 3.1 Flash-Lite]  → extrai COMANDO ESTRUTURADO (§8.4) + valida contra taxonomia de marcenaria (§2)
        │
        ├──> atualiza ESTADO ESTRUTURADO do projeto (módulos/medidas/material)  ← FONTE DE VERDADE
        │
        ▼
[Construtor de prompt + máscara]
   - decide: edição global (cor/estilo) ou local (inpainting com máscara da região do móvel)
   - injeta contexto de marcenaria no prompt do modelo de imagem
        │
        ▼
[Modelo de edição de imagem]  (Gemini default / Flux fallback)
   - entra: imagem atual + prompt (+ máscara/região quando local)
        │
        ▼
[Pós: validação + versão]  → salva nova ProjectPhoto (version+1), devolve no chat + "o que entendi"
```

### 8.3 Regra de ouro: **dimensões NÃO saem da imagem**
Modelos de imagem **não respeitam medidas reais de forma confiável**. Portanto:
- As medidas vivem **só no estado estruturado** (`Module.widthMm/heightMm/depthMm`), editadas por steppers/inputs (§7.4), nunca inferidas do pixel.
- A imagem é **ilustrativa** (o "como vai ficar"). O **orçamento usa o estado estruturado**, não a imagem.
- Quando o cliente diz "estende a base 10 cm": o sistema (a) atualiza `heightMm`/`widthMm` no módulo, (b) opcionalmente reflete visualmente via prompt, mas a verdade é o dado.
- Exibir um **overlay de cotas** (medidas desenhadas) sobre a imagem reforça precisão e confiança, sem depender do modelo para isso.

### 8.4 DSL de comandos de marcenaria (saída do NLU)
O NLU (Gemini 3.1 Flash-Lite, com function calling) converte fala livre em um JSON validado:
```json
{
  "intent": "CHANGE_FINISH | CHANGE_MATERIAL | RESIZE | ADD_ITEM | REMOVE_ITEM |
             CHANGE_HARDWARE | ADD_LIGHTING | CHANGE_LAYOUT | UNDO | ASK_HELP",
  "targetModuleId": "uuid | 'ALL' | null",
  "params": {
    "finish": "Carvalho Hanover | Branco TX | ...",
    "material": "MDF 18mm | ...",
    "dimension": { "axis": "WIDTH|HEIGHT|DEPTH", "deltaMm": 100, "absoluteMm": null },
    "item": { "type": "GAVETA|PORTA|PRATELEIRA|CABIDEIRO", "qty": 2, "position": "INFERIOR|SUPERIOR" },
    "hardware": "PUSH | PUXADOR_CAVA | SOFT_CLOSE",
    "lighting": "FITA_LED_PRATELEIRAS"
  },
  "confidence": 0.0,
  "clarificationNeeded": false,
  "echo": "Troquei o acabamento para Carvalho Hanover"   // o "o que entendi" (§7.4)
}
```
- Se `confidence` baixa ou ambíguo → `clarificationNeeded: true` e o chat oferece **opções** (chips), não erra silenciosamente.
- O `echo` sempre volta pro usuário para correção fácil.

### 8.5 Construção do prompt de imagem
Template (preenchido com estado + comando):
```
"Interior photo of {roomType}. Install a {moduleType} of {material}, finish {finish},
{hardware}, {lighting}. Keep the room's walls, floor, lighting and perspective unchanged.
Photorealistic, natural lighting, Brazilian residential style. Modify ONLY the furniture area."
```
- Edição **local** (cor/material de um módulo) → preferir **inpainting com máscara** da região para preservar o resto do ambiente.
- Edição **global** (trocar estilo geral) → prompt direto no modelo de edição.
- Multi-turno: sempre parte da **imagem atual** (última versão), nunca do zero, para manter consistência.

### 8.6 Marceneiro edita/sugere o projeto
O marceneiro acessa o mesmo motor: pode (a) **editar** o estado estruturado e gerar nova imagem (vira `QuoteEdit type=EDIT`), ou (b) **sugerir** ("melhor usar gaveteiro de 4 em vez de 2 portas", com nova prévia) → `type=SUGGESTION` que volta pro cliente aprovar. Toda alteração é versionada e atribuída ao autor.

### 8.7 Guardrails de qualidade e custo
- **Cache** por (imagemBase + comando) para não regenerar igual.
- **Limite de regenerações** por sessão (custo) com aviso amigável.
- **Fila assíncrona** (Cloudflare Queues): geração em background com placeholder/loading; latência típica 10–20 s. Resultado entregue ao chat via Supabase Realtime.
- **Moderação**: rejeitar fotos sem cômodo/irrelevantes; pedir nova foto.
- **Avaliação**: amostragem manual + thumbs up/down do cliente alimentando ajuste de prompts.

---

## 9. Plano de execução passo a passo (para o Claude Code)

> Cada fase = um conjunto de tarefas atômicas, termina com testes verdes + commit. Não avance sem fechar a anterior.

### Fase 0 — Fundação
- [x] App Next.js 15 (App Router) + Tailwind + shadcn/ui (fundação: `components.json` + `cn`); pnpm workspaces com `packages/{shared,pricing,ai-vision}` e `db/`. Tokens em `packages/shared/tokens.ts` consumidos via preset Tailwind.
- [x] Adapter **`@opennextjs/cloudflare`** + `wrangler.toml` (bindings: Hyperdrive, R2, Queues, Browser Rendering). `opennextjs-cloudflare build` e `wrangler deploy --dry-run` ✓ (bindings validados). `pnpm preview`/`pnpm deploy` exigem auth + recursos reais.
- [~] **Git integration na Cloudflare** (deploy automático no push, preview por branch). Página dummy (`/`) + `/api/health` compilam para o Worker. **TODO (manual, fora do código):** criar repo no GitHub, conectar a Git integration e validar o 1º deploy. Ver README.
- [~] **Supabase**: cliente Drizzle (`db/`) sobre `postgres.js`/Hyperdrive (conexão direta 5432, `prepare:false`) e `nodejs_compat` no wrangler. Schema `profiles` (esqueleto) + smoke test do schema. **TODO (manual):** criar projeto Supabase, Hyperdrive e rodar o smoke test de query real a partir do Worker.
- [x] `CLAUDE.md` com convenções (§1.4): centavos, mm, providers trocáveis, Hyperdrive = conexão direta. (Já existia; helpers de centavos/mm criados e testados em `packages/shared`.)
- [x] CI: lint, typecheck, test (+ SCA/audit e build) em `.github/workflows/ci.yml`; Dependabot configurado.

### Fase 1 — Auth e perfis
- [ ] **Supabase Auth**: **OTP por telefone (SMS via provedor)** + e-mail/magic link; rate limit anti SMS-pumping; papéis em metadata; estratégia de **RLS** (§3).
- [ ] Perfis: CarpenterProfile (tipo MEI/PJ/PF, logo, **cidade/CEP/raio, categorias**, KYC), ArchitectProfile, Address — com policies RLS.
- [ ] Telas de cadastro/login mobile-first por papel (simples p/ marceneiro, §doc Design).

### Fase 2 — Projeto e módulos (sem IA ainda)
- [ ] CRUD Project + Module + ProjectPhoto; status state-machine; **`workType` (nova/substituição)**.
- [ ] Upload de foto (R2, URL assinada) e MedidasGuiadas com validação de sanidade (§2.5).
- [ ] Caminho "projeto de arquiteto" (upload PDF, pula IA).

### Fase 3 — Motor de pricing (`packages/pricing`)  ⚠️ crítico
- [ ] Implementar `quotePricing` (§5.4) + `PricingConfig` (incl. diluição escolhida pelo marceneiro).
- [ ] **Testes** cobrindo o exemplo de §5.3 e casos de borda (promo zera taxa, margem negativa rejeitada, s no mínimo/máximo, todos os n).
- [ ] CRUD admin de taxas/promoções.

### Fase 4 — Matching, cotações, pré-aprovação e chat
- [ ] **Matching** por cidade + categoria + CEP→raio; feed de pedidos elegíveis (real-time).
- [ ] **Catálogo de custo** + **construtor de orçamento** + **verificador de completude** (§7.6).
- [ ] Marceneiro envia Quote (V, itens, parcelas, **diluição `s`**) → cliente vê valor com taxa embutida; **PDF**. Orçamentos EXTERNAL + relatórios. QuoteEdit versionado.
- [ ] **Pré-aprovação** (`PRE_APPROVED`) cria `Conversation`; **chat** cliente↔marceneiro (Realtime) com **mascaramento de contato**, moderação, denúncia/bloqueio (§7.8).

### Fase 5 — Pagamento (Asaas) + escrow + contrato
- [ ] `PaymentProvider` + `AsaasProvider`: recipients (subcontas, KYC), createCharge com **split + escrow**, `releaseEscrow`, `transferToPix`, webhooks idempotentes (assinatura verificada).
- [ ] Checkout: Pix/boleto/cartão + parcelas → `quotePricing` (diluição) → cobrança → `Transaction` (`IN_ESCROW`).
- [ ] **Contrato padrão** (§6.5) gerado no aceite; aceite eletrônico das duas partes; PDF.
- [ ] `WorkOrder` + `Milestone`s (§2.7); evidência → aprovação (com **auto-aprovação em 5 dias**) → liberação da parcela.
- [ ] **Carteira + saque Pix**; disputa/mediação; reembolso/cancelamento parcial. (Cobertura de testes de segurança — ver doc Segurança.)

### Fase 6 — Chat de design + IA (`packages/ai-vision`)
- [ ] NLU com Gemini 3.1 Flash-Lite (function calling) → DSL de comandos (§8.4), com `echo` e `clarificationNeeded`.
- [ ] Estado estruturado como fonte de verdade; dimensões via stepper (§8.3).
- [ ] `ImageEditProvider` + `GeminiProvider` (Nano Banana 2) default, `FluxProvider` fallback; consumer de Cloudflare Queue; versionamento de imagens no R2.
- [ ] UI do chat guiado: chips, exemplos clicáveis, histórico com miniaturas, overlay de cotas.
- [ ] Guardrails de custo/cache/moderação (§8.7).

### Fase 7 — Pipeline/agenda do marceneiro + identidade
- [ ] Orçamento aceito → `CarpenterProject`; cadastro manual de projeto ativo; **calendário**.
- [ ] `maxParallelProjects` + alerta de sobrecarga; previsão de término (§7.7).
- [ ] Logo do marceneiro / logo da plataforma.

### Fase 8 — Site institucional, arquitetos, admin, notificações
- [ ] **Site institucional** (`/`, §7.0): proposta de valor, segurança dos dois lados, CTAs de cadastro/login, link pro blog. SEO aplicado.
- [ ] Vitrine de arquitetos + comissão configurável + repasse no split.
- [ ] Notificações (Supabase Realtime + e-mail/push): pedido, orçamento, pagamento, marco, saldo.
- [ ] Dashboards admin; observabilidade (Workers Analytics/Logpush); produção em Cloudflare Workers (Git integration) + Supabase + R2.

### Fase 9 — Mobile (Expo), push, áudio e coach de foto
- [ ] App Expo (iOS/Android) consumindo a API; navegação por papel; design tokens compartilhados (ver `ABILAR-MOBILE-EXPO.md`).
- [ ] **Push** (Expo Notifications) em todos os eventos (§10); `PushToken`/`NotificationPref`.
- [ ] **Entrada por áudio** (cliente: brief; marceneiro: rascunho de orçamento) → Gemini multimodal → estrutura (ver `ABILAR-CIENCIA-DE-DADOS.md`).
- [ ] Câmera in-app com **coach de foto** (luminosidade, nível, enquadramento) + checagem de qualidade pós-captura.
- [ ] `workType` (obra nova vs substituição) no fluxo de pedido e no pipeline de imagem.
- [ ] EAS Build/Submit + **checklist de aprovação das lojas** (ver doc mobile). CI no GitHub.

### Fase 10 — Keep-alive, Blog automático e SEO (§11, §12)
- [ ] **Keep-alive** (§11): Cron Trigger de heartbeat batendo no Supabase; `GenerationLog(kind=KEEPALIVE)`.
- [ ] Fundação SEO (§12.4): `sitemap.xml`/`robots.txt` dinâmicos, metadata API por página, JSON-LD, OG/Twitter, canonical. (Fazer **antes** do blog.)
- [ ] Seed de `ContentTopic` com os clusters/keywords de §12.5.
- [ ] **content-engine** (§12.2): Cron 2×/dia → escolhe tópico → gera artigo (Gemini 3 Flash) → gera imagem temática (R2) → monta SEO → **portão de qualidade** → publica → atualiza sitemap → IndexNow.
- [ ] Páginas do blog: índice, post, por cluster; CTAs para `/cadastro/cliente` e `/cadastro/marceneiro`; bloco de parceria com arquitetos.
- [ ] Google Search Console: submeter sitemap; verificar indexação.

---

## 10. Notificações & eventos (push em toda a jornada)

Push é peça central (não acessório): conecta as duas pontas em tempo real. Stack: **Expo Notifications** (FCM no Android, APNs no iOS) + Web Push; preferências em `NotificationPref`; tokens em `PushToken`.

**Eventos que disparam notificação:**
| Evento | Destinatário | Ação |
|---|---|---|
| Novo pedido na área | marceneiros elegíveis (por área/categoria — ver dúvida nº2) | abre o pedido p/ orçar |
| Orçamento enviado | cliente | revisar orçamento |
| Orçamento aprovado | marceneiro | iniciar/agendar obra |
| Pagamento confirmado (em escrow) | marceneiro + cliente | obra liberada p/ iniciar |
| Marco com evidência enviada | cliente | aprovar evolução |
| Marco aprovado / saldo liberado | marceneiro | sacar ou acumular |
| Auto-aprovação se aproximando | cliente | aprovar antes do prazo |
| Disputa aberta | admin + contraparte | mediação |

Regras: idempotência (não duplicar); respeitar `NotificationPref` e quiet hours; **deep links** para a tela exata; no Android 13+ pedir `POST_NOTIFICATIONS`; registrar entrega/abertura para métricas.

---

## 11. Keep-alive — operar no tier gratuito sem o sistema "morrer"

**Problema:** o **Supabase Free pausa o projeto após ~7 dias sem requisição**. Os Cloudflare Workers **não** hibernam (ficam sempre disponíveis), então o alvo do keep-alive é só o Supabase. (Caveat honesto: isso é um contorno do free tier; a Supabase pode mudar o comportamento, e produção de verdade deve migrar para o Pro de US$ 25/mês.)

**Solução:**
- **Cron Trigger** do Cloudflare (disponível no plano free) a cada ~6 h chamando um Worker que executa uma query trivial (`select 1` ou leitura de uma linha `heartbeat`). Isso zera o contador de inatividade.
- Registrar em `GenerationLog(kind=KEEPALIVE)` para auditoria.
- **Sinergia:** assim que o blog (§12) estiver no ar publicando 2×/dia, ele **já** bate no banco e mantém o Supabase acordado — o heartbeat dedicado vira só redundância de segurança.
- ⚠️ Não confundir com "manter o Worker quente": no Cloudflare isso não é necessário.

---

## 12. Blog automático + Motor de conteúdo + SEO (canal #1 de aquisição)

> Objetivo: o blog é **obrigatório** como motor de aquisição orgânica — atrair clientes (donos de obra), marceneiros e tráfego que converte em cadastro. Publica **≥2 posts/dia** automaticamente, cada um com **imagem gerada** (nunca da web) e **SEO completo**.

### 12.1 Princípios (e o aviso de SEO)
- ⚠️ **Risco real:** conteúdo de IA em massa e raso pode ser **penalizado** pelo Google (políticas de spam e "helpful content"). Por isso o pipeline tem **portão de qualidade** obrigatório: ângulo único por post, dado concreto, sem duplicação de tema, links internos, E-E-A-T (autor, página "Sobre"). Qualidade > volume.
- "Ser bem indexado" = **SEO orgânico** (Google Search). Google **Ads** é canal pago à parte (opcional depois). Esta seção cobre o orgânico.
- **Custo ~zero no começo:** texto e imagem via **Gemini** (provedor único). O **free tier (~1.500 req/dia nos modelos Flash, sem cartão)** cobre 2 posts/dia + o NLU com folga. Texto do blog em **Gemini 3 Flash**; subir para **Gemini 3.1 Pro** (pago) só se quiser mais qualidade. ⚠️ Os modelos **Pro são pagos desde abr/2026**; Flash e Flash-Lite mantêm free tier. O free tier usa seus dados para melhoria do produto — avaliar antes de conteúdo sensível.

### 12.2 Pipeline (Cron 2×/dia, em consumer de Queue)
```
[Cron Trigger 2x/dia]
   │
   ▼
1. Seleciona ContentTopic do backlog (maior priority, status=BACKLOG, sem tema duplicado recente)
2. Gera artigo (Gemini 3 Flash; 3.1 Pro p/ qualidade) com prompt estruturado (§12.3) → título, meta, corpo MD, FAQ, keywords, CTA
3. Gera imagem TEMÁTICA (prompt derivado do tópico) → R2 → BlogImage (com alt text)
4. Monta SEO: slug, JSON-LD Article+FAQ, OG/Twitter, canonical (§12.4)
5. PORTÃO DE QUALIDADE: tamanho mínimo, originalidade (dedup vs posts existentes),
   presença de CTA + link interno, score >= limiar → senão status=REVIEW (não publica)
6. status=PUBLISHED, publishedAt=now; marca ContentTopic como USED
7. Atualiza sitemap.xml + dispara IndexNow (Bing/Yandex) e confia no GSC p/ Google
8. GenerationLog(kind=POST/IMAGE, custo, sucesso)
```
Quando o backlog de `ContentTopic` esvazia, um passo gera novos tópicos a partir dos clusters (§12.5), evitando repetição.

### 12.3 Prompt de geração do post (regras fixas)
O artigo **sempre**:
- Fala para um público de obra/reforma em PT-BR, tom prático e confiável, sem jargão técnico desnecessário.
- Cobre um dos temas-âncora: custos de obra/marcenaria, como achar bons fornecedores, dor de orçar marcenaria, móveis planejados, reforma, e **como o Abilar resolve** (conecta dono de obra ↔ marceneiro; cotação visual por IA; parceria com arquitetos).
- Tem estrutura escaneável: H1 único, H2/H3, parágrafos curtos, lista quando couber, e uma seção **FAQ** (vira `FAQPage` JSON-LD).
- Insere **CTAs internos** para `/cadastro/cliente` (PF) e `/cadastro/marceneiro` (PJ que executa obra/marcenaria), e um bloco sobre **parceria com arquitetos**.
- 800–1.500 palavras, keyword primária no título/H1/primeiro parágrafo/slug, secundárias distribuídas com naturalidade (sem keyword stuffing).
- Nunca inventa dados; quando citar números, mantém genérico/faixas.

### 12.4 Fundação técnica de SEO (fazer ANTES de publicar)
- **Metadata por página** (Next.js Metadata API): `<title>` ≤60ch, `meta description` ≤155ch, canonical.
- **JSON-LD:** `Article`/`BlogPosting`, `FAQPage`, `BreadcrumbList`, `Organization` (e `LocalBusiness` se fizer sentido por cidade).
- **Open Graph + Twitter Cards** (usa a imagem gerada).
- **`sitemap.xml` dinâmico** (todos os posts + páginas-chave) e **`robots.txt`**; submeter no **Google Search Console**.
- **IndexNow** para indexação rápida em Bing/Yandex.
- **Performance = ranking:** Core Web Vitals; o edge do Cloudflare ajuda no LCP; imagens em formato moderno (WebP/AVIF) servidas do R2/Cloudflare Images.
- **Imagem:** sempre com `alt` descritivo (acessibilidade + SEO); dimensões definidas (evita CLS).
- **Links internos:** cada post linka 2–3 outros posts do mesmo cluster + a página de cadastro (arquitetura de "pillar + cluster").
- **URLs limpas:** `/blog/{slug}` e páginas de cluster `/blog/categoria/{cluster}`.
- **E-E-A-T:** página "Sobre", autor, política, dados de contato.

### 12.5 Estratégia de keywords (clusters PT-BR para seed do `ContentTopic`)
Modelo **pillar + cluster** (uma página-pilar por cluster + vários posts de cauda longa):

- **Custos / orçamento:** "quanto custa um guarda-roupa planejado", "preço de móveis planejados", "quanto custa reformar a cozinha", "orçamento de marcenaria", "como economizar em móveis planejados".
- **Contratar fornecedor:** "como contratar um marceneiro de confiança", "marceneiro perto de mim", "como saber se o marceneiro é bom", "evitar dor de cabeça com reforma", "contrato com marceneiro".
- **Móveis planejados (intenção de compra):** "móveis planejados vale a pena", "MDF ou MDP qual melhor", "planejado x modulado", "tipos de acabamento de marcenaria".
- **Projeto / arquiteto:** "projeto de marcenaria com arquiteto", "como funciona projeto de móveis planejados", "arquiteto parceiro de marcenaria".
- **Marca/produto (fundo de funil):** "plataforma para orçar marcenaria", "site para encontrar marceneiro", "como conseguir clientes sendo marceneiro" (atrai os PJ).

Cada `ContentTopic` carrega `searchIntent` (informacional/comercial/transacional) e `audience` (CLIENT/CARPENTER/ARCHITECT) para o pipeline equilibrar a pauta entre os dois lados do marketplace.

### 12.6 Páginas do blog
Índice (`/blog`), post (`/blog/{slug}`), por cluster (`/blog/categoria/{cluster}`). Todas com CTA de cadastro visível, bloco de parceria com arquitetos e links internos. Feed/RSS opcional.

---

## 13. Riscos e mitigação
| Risco | Mitigação |
|---|---|
| IA não respeita medidas | Medida só no estado estruturado; imagem é ilustrativa (§8.3) |
| Erro no cálculo de split/parcelamento | Motor puro + testes do exemplo §5.3; valores em centavos |
| Custo de geração de imagem | Cache, limite por sessão, Cloudflare Queues, modelo trocável |
| Bitributação | Split correto (imposto só sobre comissão); validar com contador |
| Trava em fornecedor de pagamento | Interface `PaymentProvider`; Asaas→Pagar.me sem refatorar regra |
| Webhook duplicado | Idempotência por chargeId+evento |
| Performance do feed | Índices em Project(status,createdAt) etc. desde o início |
| **Deploy (dor passada)** | Workers + OpenNext + Git integration (não `next-on-pages`, deprecado); validar pipeline na Fase 0 com app dummy |
| **Hyperdrive 500s** | Apontar p/ conexão **direta** do Supabase (5432), nunca pooler 6543; `nodejs_compat` |
| **Limite de CPU/tempo do Worker** | Tarefas longas (imagem, PDF) sempre em Cloudflare Queue + consumer |
| **Real-time** | Supabase Realtime (websocket); não usar LISTEN/NOTIFY via Hyperdrive |
| **Penalidade de SEO por conteúdo de IA** | Portão de qualidade (§12.1): originalidade, dado real, dedup, E-E-A-T; qualidade > volume |
| **Supabase Free pausando** | Cron de keep-alive (§11); migrar p/ Pro ao ir a público |
| **Custo oculto da automação de blog** | Gemini free tier (~1.500 req/dia Flash) como padrão; logar custo em `GenerationLog` |
| **Disputa em marco / obra parada no meio** | Auto-aprovação por prazo, evidência obrigatória, mediação admin, cancelamento parcial com estorno do escrow não liberado (§6.4) |
| **Marceneiro orça no prejuízo** | Catálogo de custo + verificador de completude (§7.6); validação `payout >= custo` no motor (§5.2) |
| **Marceneiro aceita obra demais e atrasa** | Limite de paralelos + alerta de sobrecarga (§7.7) |
| **Taxa de parcelamento não "cai" sozinha** | Iniciar no Asaas; renegociar/migrar p/ Pagar.me por volume (TPV); taxa via negociação, não tabela pública |
| **Guardar dinheiro = responsabilidade regulatória** | Usar conta escrow do gateway (não custódia própria); revisar enquadramento como instituição de pagamento com jurídico |
| **Rejeição nas lojas (Apple/Google)** | Pagamento externo p/ bem/serviço físico (NÃO IAP); ≥3 features nativas; moderação de UGC; account deletion in-app; ver doc mobile |
| **KYC do marceneiro p/ receber** | Asaas exige verificação (CNPJ/identidade) antes de repasse; onboarding de pagamento separado do cadastro |
| **Moderação de foto/áudio (exigência das lojas)** | Triagem automática via Gemini + denúncia/bloqueio + contato de suporte |
| **Substituição (REPLACE) gerar imagem ruim** | Máscara da peça antiga + inpainting; medidas sempre do estado estruturado (doc ciência de dados) |
| **Custo de áudio/transcrição** | Gemini multimodal (free tier Flash); limitar duração; logar em `GenerationLog` |
| **Falha de segurança em transação** | TDD + revisão pelo checklist de `ABILAR-SEGURANCA-E-PAGAMENTOS.md`; nada de merge sem CI verde |
| **Disintermediação (fechar por fora pelo chat)** | Chat só após pré-aprovação; **mascarar telefone/e-mail/links**; termos; garantia do escrow só on-platform |
| **Contrato sem validade jurídica** | Modelo técnico (§6.5) **revisado por advogado** antes de produção; aceite eletrônico com timestamp+hash de IP |
| **Custo de OTP / SMS-pumping** | OTP só no cadastro; sessão longa; e-mail grátis p/ cliente; rate limit por número/IP |

---

*Documento v1 — "Abilar". Nome provisório. Próximos passos sugeridos: validar a tabela de parcelamento real do gateway escolhido e rodar um piloto de geração de imagem com 10 fotos reais de cômodos antes de fechar o provider de IA.*
