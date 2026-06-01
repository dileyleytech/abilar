# Abilar — Workstream CIÊNCIA DE DADOS

> Companheiro de `ESPECIFICACAO-ABILAR.md` (§2, §8). Público: cientista de dados. Tudo que é LLM/imagem é **Gemini** (provedor único). Regra de ouro mantida: **medida nunca sai da imagem** — vive no estado estruturado.

## 1. Geração de imagem por `workType` (mudança nova)
O pipeline ramifica pelo tipo de obra escolhido pelo cliente:

### 1.1 NEW_INSTALL — móvel onde não há nada
- Entrada: foto da parede/espaço vazio + estado estruturado (módulo, medidas, material, acabamento).
- Estratégia: identificar a **região alvo** (parede/piso vazio) e **inserir** o móvel respeitando perspectiva e iluminação do ambiente. Prompt instrui a **preservar paredes, piso, luz e perspectiva** e modificar só a área do móvel.
- Pode usar uma **máscara da região vazia** (inpainting) para o modelo focar onde inserir.

### 1.2 REPLACE_EXISTING — trocar móvel existente
- Entrada: foto do móvel atual + o novo desejado (estado estruturado).
- Estratégia: **segmentar a peça antiga** (gerar máscara da região do móvel atual) → **inpainting** do novo no lugar, preservando o resto do ambiente. Isso evita "fantasma" do móvel velho aparecendo no resultado.
- A máscara pode vir de: (a) segmentação automática, ou (b) o cliente "pinta" grosseiramente a área do móvel antigo (fallback simples e robusto).

### 1.3 Comum aos dois
- Modelo: **Gemini 3.1 Flash Image (Nano Banana 2)** (default), fallback Flux Kontext. Multi-turno parte sempre da **imagem atual** (consistência).
- **Medidas** só no estado estruturado (stepper na UI); imagem é ilustrativa. Overlay de cotas opcional reforça confiança.
- Versão a cada edição (`ProjectPhoto.version`); cliente navega o histórico (undo visual).

## 2. Áudio → orçamento (marceneiro) e áudio → brief (cliente)
Aproveita **Gemini multimodal** (áudio nativo): transcreve **e** estrutura num só passo.

### 2.1 Pipeline
```
[áudio do marceneiro] → R2 → Gemini (audio in)
   → { transcript, itensServico[], materiais[], ferragens[], tempoEstimado, observações }
   → cruza com o CATÁLOGO DE CUSTO do marceneiro (CarpenterMaterial) p/ preencher preços
   → passa pelo VERIFICADOR DE COMPLETUDE (§3)
   → rascunho de CarpenterQuote (status=DRAFT) → marceneiro REVISA e edita → envia
```
- Sempre devolver a **transcrição** para conferência (transparência) e o **rascunho editável** (nunca enviar automático).
- Cliente (brief): áudio → descrição estruturada do que ele quer (tipo de peça, cômodo, estilo, restrições) → alimenta o chat de design.
- Guardar em `AudioInput` (url, transcript, structuredResult). Limitar duração; logar custo em `GenerationLog`.

### 2.2 Saída estruturada (function calling)
Forçar JSON via function calling do Gemini, validado por schema (zod). Itens reconhecidos mapeiam para `CarpenterMaterial` quando houver correspondência; itens novos ficam como avulsos para o marceneiro precificar.

## 3. Verificador de completude do orçamento (anti-prejuízo) — spec mestre §7.6
Combina **regras determinísticas** + **checagem semântica do Gemini**:
- **Checklist por tipo de peça** (regra fixa). Exemplos:
  - *Guarda-roupa:* chapas (corpo+portas), fita de borda, **dobradiças** (≈ por porta), **corrediças** (por gaveta), puxadores/sistema push, cabideiro, prateleiras, **parafusos/buchas**, **instalação**, **frete**.
  - *Cozinha:* módulos base+aéreo+torre, **dobradiças** (muitas), corrediças, tampo/bancada, rodapé, puxadores, **instalação**, frete.
  - *Painel de TV / estante:* chapas, fixação na parede (mão francesa/buchas), fita de borda, nichos, **iluminação LED** (se houver), instalação.
- **Verificação semântica:** Gemini olha o orçamento + tipo de peça e aponta o que costuma faltar, em linguagem do marceneiro.
- **Nunca bloqueia**; sugere via cartões amigáveis ("⚠️ Faltou a dobradiça? Este móvel tem ~6 portas"). O marceneiro aceita ou dispensa.
- Estimar **tempo de execução/instalação** com base no tipo/qtd de módulos (alimenta o pipeline/agenda §7.7).

## 4. Coach de foto (qualidade da entrada)
- **On-device (tempo real, sem custo de IA):** luminância média do frame (escuro?), giroscópio (telefone nivelado?), detecção de desfoque (foco), overlay de enquadramento. Mensagens curtas ("Mais luz", "Nivele", "Mostre a parede inteira").
- **Pós-captura (1 chamada Gemini):** valida se a foto serve ("ok" / "refazer: muito escura/cortada/longe") e classifica o cômodo. Só então segue para a geração.
- Evitar IA por frame (custo/latência).

## 5. NLU do chat de design — spec mestre §8.4
Gemini 3.1 Flash-Lite (function calling) converte fala livre → comando estruturado (intent, módulo alvo, params, `echo`, `clarificationNeeded`). Dimensões viram update no estado estruturado, não no pixel.

## 6. Guardrails, avaliação e custo
- **Cache** por (imagem base + comando) e por (áudio hash) p/ não reprocessar igual.
- **Limites por sessão** + fila assíncrona (Cloudflare Queues) com placeholder/loading.
- **Moderação** (exigência das lojas): triar foto/áudio impróprios; reprovar e pedir novo envio.
- **Avaliação:** thumbs up/down do cliente nas imagens; amostragem manual; ajustar prompts. Métrica: nº médio de iterações até o cliente aprovar; taxa de orçamentos que o verificador "salvou" de sair no prejuízo.
- **Privacidade:** foto/áudio são dados pessoais; enviados ao Gemini → declarar nas lojas (data safety / privacy labels) e na política LGPD (ver doc segurança).
