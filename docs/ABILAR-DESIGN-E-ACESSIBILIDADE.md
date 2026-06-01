# Abilar — Workstream DESIGN & ACESSIBILIDADE

> Companheiro de `ESPECIFICACAO-ABILAR.md` (§7). Público: frontend/design. Princípio central: o **marceneiro tem baixa familiaridade com tecnologia** — a interface dele tem que ser quase à prova de erro. O cliente tem mais traquejo, mas também precisa ser guiado (principalmente na foto).

## 1. Dois públicos, duas linguagens
- **Marceneiro (low-literacy / low-tech):** ícone + áudio primeiro, texto mínimo, um passo por tela, alvos grandes, sem jargão de software. O app **conduz** ele.
- **Cliente (PF):** mais à vontade com tecnologia, mas guiado em pontos críticos (tirar a foto certa, entender o orçamento, aprovar marcos).

## 2. Princípios de acessibilidade do marceneiro (não-negociáveis)
1. **Um objetivo por tela.** Nada de telas densas. "O que você quer fazer agora?" com 2–3 botões grandes.
2. **Ícones + rótulo curto** sempre juntos; nunca ícone sozinho. Linguagem do dia a dia ("Fazer um orçamento", "Minhas obras", "Meu dinheiro").
3. **Áudio em tudo que for entrada de texto.** Botão de microfone grande; ele fala em vez de digitar (orçamento, descrição, observação). Ver doc de ciência de dados.
4. **Leitura em voz alta opcional:** botão "ouvir" lê o resumo do orçamento/valor — ajuda quem tem dificuldade de leitura.
5. **Alvos grandes** (mín. 48dp), alto contraste, fonte grande por padrão, suporte a fonte ampliada do sistema.
6. **Confirmação antes de ação irreversível**, em linguagem simples ("Enviar este orçamento para o cliente? [Sim, enviar] [Voltar]").
7. **Sem termos de software** ("upload", "sync", "token"). Usar "enviar foto", "salvar", "entrar".
8. **Feedback imediato e humano**: estados de sucesso/erro com ícone + frase curta + próximo passo. Nunca um código de erro cru.
9. **Recuperação fácil:** sempre dá pra voltar; rascunho salvo automaticamente; nada se perde.
10. **Onboarding guiado de 1ª vez** com coachmarks curtos; tutorial em vídeo curto opcional.

## 3. Fluxo guiado do marceneiro (wizard, não formulário)
**Fazer um orçamento (caminho do áudio):**
1. Botão grande "🎤 Falar o orçamento" → ele descreve o serviço falando.
2. Sistema transcreve e monta um rascunho com itens, materiais e ferragens (ciência de dados). 
3. Tela de revisão **simples**: lista de itens com preço, cada um editável por toque; o verificador mostra cartões de alerta amigáveis ("⚠️ Faltou a dobradiça?") com [Adicionar] / [Não precisa].
4. Define forma de pagamento aceita (parcelas) com **explicação em 1 linha** de quanto ele recebe em cada caso (sem expor "taxa de maquininha").
5. Confirma e envia. Confirmação clara.

**Minhas obras (pipeline/agenda):** calendário visual simples; cartões grandes por obra com status colorido; alerta amigável de sobrecarga ("Você já tem 4 obras. Aceitar mais pode atrasar.").

**Evolução de obra:** para cada etapa, um cartão grande com foto-exemplo do que enviar; botão "📷 Enviar foto desta etapa"; ao aprovar do cliente, "💰 Liberou R$ X pra você".

**Meu dinheiro (carteira/saque):** saldo em destaque; dois botões: "Transferir pro meu Pix" / "Deixar guardado". Saque em 2 toques.

## 4. Guia de foto do cliente (qualidade da imagem alimenta a IA)
Antes de abrir a câmera, mostrar **exemplos visuais "boa vs ruim"**:
- **Boa:** ambiente iluminado, parede inteira no quadro, telefone na vertical e nivelado, sem contraluz, de frente para a parede.
- **Ruim:** escuro, cortada, torta, muito perto, contra a janela.
Dicas dinâmicas (coach on-device, ver doc mobile): "Ambiente escuro — acenda a luz", "Nivele o telefone", "Mostre a parede inteira", "Segure firme". Para `workType`:
- **Obra nova:** "Fotografe a parede/espaço vazio onde quer o móvel."
- **Substituição:** "Fotografe o móvel atual que será trocado."

## 5. Escolha do tipo de obra (cliente) — primeira pergunta
Tela inicial do pedido com dois cartões grandes ilustrados:
- 🆕 **"Quero um móvel novo"** (não existe nada no lugar) → `workType = NEW_INSTALL`.
- 🔁 **"Quero trocar um móvel que já tenho"** → `workType = REPLACE_EXISTING`.
Isso direciona o texto do guia de foto e o pipeline de imagem (ciência de dados).

## 6. Chat de design (cliente) — ver spec mestre §7.4
Chips de ação, exemplos clicáveis, stepper de medidas, histórico com miniaturas, "o que entendi". Mantém o cliente no controle sem digitar comandos complexos.

## 7. Design system (compartilhado app + web)
- Tokens (cor, tipografia, espaçamento, raio, sombra) em `packages/shared`, consumidos por NativeWind (RN) e Tailwind (web) → **uma identidade** nas duas plataformas.
- Componentes base: BotãoGrande, CartãoAção, EntradaPorVoz, PassoWizard, CartãoAlerta, CartãoObra, ResumoValor (com "ouvir").
- Estados vazios sempre com instrução do próximo passo (nunca tela em branco).
- Acessibilidade técnica: labels para leitor de tela, ordem de foco, contraste AA, toque ≥48dp, respeitar fonte/contraste do sistema.

## 8. Como validar
- Teste de usabilidade com **marceneiros reais de baixa escolaridade** antes de cravar o fluxo (mais valioso que qualquer heurística).
- Métrica-norte: % de marceneiros que completam um orçamento sozinhos, sem ajuda, na 1ª tentativa.
