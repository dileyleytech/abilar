# Abilar — Brand Assets

Conceito: **ABI** (a assistente de IA) + **lar** (a casa). O pingo do “i” vira uma casinha — o gancho visual da marca.

## Estrutura

```
brand/
├── svg/                      # vetor (texto convertido em curvas — sem dependência de fonte)
│   ├── abilar-wordmark-color.svg        # logo principal (âmbar + carvão, telhado verde)
│   ├── abilar-wordmark-mono-black.svg   # monocromático carvão
│   ├── abilar-wordmark-mono-white.svg   # monocromático areia (p/ fundo escuro)
│   ├── abilar-wordmark-dark.svg         # colorido p/ fundo escuro (ocre + areia + sálvia)
│   ├── abilar-logo-horizontal.svg       # lockup ícone + wordmark
│   ├── abilar-icon-amber.svg            # ícone de app (âmbar)
│   ├── abilar-icon-green.svg            # ícone de app (verde)
│   ├── abilar-abi-casa-rosto.svg        # avatar da ABI (casa-rosto)
│   ├── abilar-abi-balao.svg             # avatar da ABI (balão de chat)
│   └── abilar-casinha.svg               # símbolo isolado (casinha)
├── png/                      # PNG transparente, alta resolução (1600–2200px)
└── favicon/                  # 16 / 32 / 180 (apple-touch) / 512
```

## Uso

- **Web/app:** prefira os **SVG** (escaláveis, nítidos, sem fonte instalada).
- **Favicon:** `favicon/favicon-32.png` (+ `apple-touch-icon-180.png`, `icon-512.png` para PWA).
- **Fundo escuro:** use `abilar-wordmark-dark.svg` ou `…-mono-white.svg`.
- Tokens de cor/tipografia: `packages/shared/tokens.ts`.

## Cores

| Token | Hex | Uso |
|---|---|---|
| Âmbar Terracota | `#C56A33` | primária |
| Verde Profundo | `#2F6B5E` | secundária / ABI |
| Carvão | `#1F2421` | texto |
| Areia | `#F6F1EA` | fundo |
| Sálvia | `#7BAE9E` | acento claro |
| Ocre | `#E8A765` | acento quente |

## Tipografia

- **Títulos:** Poppins (500 / 600 / 700) — o wordmark é Poppins SemiBold.
- **Corpo:** Inter (400 / 500 / 600).
- **Labels/código:** JetBrains Mono.

> O wordmark nos SVGs já está **vetorizado** (curvas), então não depende do Poppins estar instalado.
