# Como usar o Claude Design + conectar com o Claude Code

Objetivo: criar a identidade da **Abilar** no **Claude Design** e fazer ela "conversar" com o **Claude Code** (o front usa exatamente as cores/tipografia da marca).

## Parte 1 — Criar a identidade no Claude Design
O Claude Design é o ambiente com **canvas** onde o Claude cria e itera artes por chat (logo, telas, identidade). Passos:
1. Abra o **Claude Design**.
2. Cole o **prompt** que está em `docs/ABILAR-BRIEF-LOGO-DESIGN.md` (ou anexe o arquivo inteiro + o `brand/abilar-logo.svg` como ponto de partida).
3. Itere por conversa: "deixa o telhadinho mais sutil", "testa o ícone em fundo escuro", "gera 3 variações do avatar da ABI". O canvas vai mostrando as versões.
4. Peça os **entregáveis** listados no brief (logo cor/mono, ícone app, lockups, fundo escuro, avatar ABI).
5. **Exporte** os assets: SVG (logo/ícone, vetorial) e PNG (prévias/redes). Guarde tudo na pasta `brand/` do projeto.
6. Peça também os **tokens**: a lista final de cores (hex) e fontes — você vai usar no código (Parte 2).

> Dica: trate o `ABILAR-IDENTIDADE-VISUAL.md` como a fonte de verdade da marca. Se mudar algo no Design, atualize esse doc.

## Parte 2 — Fazer Design e Code "conversarem"
A ponte entre os dois é um arquivo de **design tokens** (cores, tipografia, espaçamentos) que o front consome. Assim, o que você definiu no Design vira, de fato, a cara do app.

1. No repositório, crie `packages/shared/tokens.ts` (ou `tokens.json`) com os tokens da marca. Exemplo:
   ```ts
   export const colors = {
     amber: "#C56A33",      // primária
     green: "#2F6B5E",      // confiança/segurança
     charcoal: "#1F2421",   // texto
     sand: "#F6F1EA",       // fundo
     greenSoft: "#7BAE9E",
     amberSoft: "#E8A765",
   } as const;
   export const fonts = { heading: "Poppins", body: "Inter", mono: "JetBrains Mono" } as const;
   ```
2. **Web (Next.js + Tailwind):** aponte o `tailwind.config` para esses tokens (cores e fontes da marca). **Mobile (Expo + NativeWind):** use os mesmos tokens. Resultado: uma identidade só nas duas plataformas.
3. **Diga ao Claude Code para usar os tokens.** O `CLAUDE.md` já referencia os docs; acrescente: "use sempre os tokens de `packages/shared/tokens.ts` e o `docs/ABILAR-IDENTIDADE-VISUAL.md`; não invente cores/fontes."
4. **Assets:** coloque os SVG/PNG exportados em `brand/` e, os que o app usa (ícone, logo, avatar da ABI), em `app/public/` (web) e nos assets do Expo (mobile).
5. **Fluxo contínuo:** quando evoluir a marca no Design, atualize os tokens + o doc de identidade e peça ao Code para "reaplicar os tokens". Design define a aparência; Code aplica de forma consistente.

## Resumo do fluxo
```
Claude Design  →  exporta logo/ícone/avatar (SVG/PNG) + tokens (cores/fontes)
      │                         │
      ▼                         ▼
   brand/ (assets)     packages/shared/tokens.ts  ←  Claude Code lê e aplica (Tailwind/NativeWind)
      │                         │
      └──────── docs/ABILAR-IDENTIDADE-VISUAL.md (fonte de verdade) ──────────┘
```

Assim o visual criado no Design aparece igualzinho no produto construído pelo Code.
