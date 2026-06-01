# Abilar — Workstream SEGURANÇA & PAGAMENTOS

> Companheiro de `ESPECIFICACAO-ABILAR.md` (§5, §6). Público: responsável por pagamento e segurança. Premissa: **a plataforma move dinheiro** — não há margem para falha. Tudo aqui é TDD + revisão obrigatória antes de merge.

## 1. Cadência de pagamento por evolução de obra (detalhe)
O cliente paga **100% antecipado**; o dinheiro fica **retido em escrow** (conta escrow do Asaas) e é liberado por **marco aprovado**. Marcos default (configuráveis) na spec mestre §2.7: Sinal 20% → Material+corte 15% → Montagem+acabamento 20% → Entrega 15% → Instalação 20% → Vistoria 10%.

**Máquina de estados do dinheiro:**
```
PENDING → (pago) PAID/IN_ESCROW
  M0 sinal liberado (~1 sem antes do início)        → WalletEntry(RELEASE)
  cada marco: PENDING → EVIDENCE_SENT → APPROVED      → releaseEscrow(%) → PARTIALLY_RELEASED
  último marco APPROVED                               → RELEASED
  rejeição → DISPUTE (parcela congelada, mediação admin)
  cancelamento → REFUND do escrow não liberado
```
- **Auto-aprovação por prazo:** se o cliente não responder em N dias após a evidência (sugestão 3–7; ver dúvida nº3), o marco auto-aprova — protege o marceneiro de inércia. Notificar antes.
- **Saque:** marceneiro vê saldo (`WalletEntry`) e escolhe `transferToPix` (`Withdrawal`) ou manter. KYC do recebedor concluído antes do 1º repasse (exigência do gateway).
- **Diluição de parcelamento:** `s` (escolha do marceneiro) + margem da plataforma `mp`, conforme motor §5. Todo cálculo em centavos, testado.

## 2. Modelo de ameaças (o que pode dar errado e como barrar)
| Ameaça | Mitigação |
|---|---|
| Adulteração de valor no cliente (preço/itens) | **Servidor é a fonte de verdade**: recalcular `quotePricing` no backend; nunca confiar em valor vindo do app |
| Liberar escrow sem aprovação real | Liberação só por evento de aprovação autenticado do cliente dono do projeto (RLS + verificação de ownership) |
| Replay/duplicação de webhook do gateway | Idempotência por `gatewayChargeId`+evento; verificar **assinatura** do webhook; ignorar repetidos |
| Marceneiro sacar valor não liberado | Saldo derivado **apenas** de `WalletEntry(RELEASE)`; saque valida saldo no servidor |
| Aprovar marco de outro projeto (IDOR) | RLS + checagem `auth.uid()` dono em toda mutation; nunca confiar em id vindo do cliente sem autorizar |
| Conta de marceneiro sequestrada → muda chave Pix e saca | 2FA em ações sensíveis (trocar chave Pix/sacar); cooldown + notificação ao mudar dados de recebimento |
| Vazamento de foto/áudio (dados pessoais) | URLs assinadas e curtas no R2; sem listagem pública; acesso por RLS |
| Injeção (SQL/prompt) | Queries parametrizadas (Drizzle); validar/escapar entrada; tratar entrada de áudio/texto como não-confiável no prompt do Gemini |
| Chargeback / fraude no cartão | Antifraude do gateway; reter liberação em escrow reduz exposição; política de estorno clara |
| Lavagem / uso indevido | KYC no onboarding de recebedor; limites; monitorar padrões anômalos |
| Disintermediação pelo chat (fechar por fora) | Chat só após pré-aprovação; mascarar telefone/e-mail/links nas mensagens; termos; garantia do escrow só on-platform |
| Ler chat de terceiros | Conversa só entre participantes (RLS); URLs de anexo assinadas e curtas |
| Repúdio de aceite do contrato | Registrar aceite com timestamp + hash de IP + versão do contrato; PDF imutável no R2 |

## 3. Controles de aplicação (checklist de PR)
- [ ] **Autorização** em toda rota/mutation: RLS no banco **+** verificação de papel/ownership na Server Action (defesa em profundidade).
- [ ] **Validação de entrada** com schema (zod) no servidor; nunca confiar no cliente.
- [ ] **Segredos** só em Wrangler secrets/env do Worker; nunca no código/repo; rotação documentada.
- [ ] **Webhooks** com verificação de assinatura + idempotência.
- [ ] **Dinheiro** sempre `BIGINT` centavos; arredondamento definido e testado; sem `float`.
- [ ] **Logs** sem PII/segredos; trilha de auditoria para tudo que toca dinheiro (quem, quando, quanto).
- [ ] **Rate limiting** em login, saque, troca de chave Pix, geração de IA.
- [ ] **HTTPS/TLS** ponta a ponta; HSTS; cookies `HttpOnly`/`Secure`/`SameSite`.
- [ ] **Headers** de segurança (CSP, etc.) no app web.
- [ ] **Dependências**: SCA (Dependabot/audit) no CI; sem libs com CVE conhecida.

## 4. LGPD / privacidade
- **Base legal e consentimento** para tratar foto/áudio/dados pessoais; finalidade declarada.
- **Compartilhamento com terceiros (Gemini/Asaas)** declarado na política, no app, e nas lojas (data safety / privacy labels).
- **Exclusão de conta** in-app + web (também exigência das lojas); definir o que é apagado vs retido por obrigação fiscal/financeira.
- **Minimização**: coletar só o necessário; reter pelo tempo necessário; criptografia em repouso (Supabase/R2) e em trânsito.
- Encarregado (DPO) e canal de titular de dados.

## 5. Regulatório de pagamento
- Reter dinheiro de terceiros tem implicação: usar a **conta escrow do gateway** (não custódia própria) reduz o risco de ser enquadrado como instituição de pagamento. **Validar com jurídico/contador** antes de operar.
- **Tributação:** split correto → imposto só sobre a comissão da plataforma, não sobre o GMV. Confirmar com contador.

## 6. TDD + CI/CD (GitHub) — obrigatório
- **Teste antes da implementação.** Cobertura mínima inegociável em: `packages/pricing` (100%), escrow/liberação de marcos, saque, webhooks, autorização.
- Pipeline por PR: lint → typecheck → testes unit/integ → SCA → (mobile) build de preview. **Sem CI verde, sem merge.**
- Testes de segurança no fluxo financeiro: tentativas de IDOR, replay de webhook, adulteração de valor, saque acima do saldo — todos devem **falhar com segurança** e estar cobertos por teste.
- Ambientes separados (sandbox do gateway em dev/staging; produção isolada). Nunca testar com chave de produção.

## 7. Prioridade
Segurança e o motor financeiro (§5) são as partes que **não podem** ter atalho. Se houver conflito entre prazo e rigor de segurança no fluxo de dinheiro, o rigor vence.
