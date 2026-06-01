# Abilar — Workstream MOBILE (Expo / React Native)

> Companheiro de `ESPECIFICACAO-ABILAR.md`. Público: dev mobile sênior. Objetivo: app **híbrido iOS + Android** (e web/desktop pelo Next.js), com push, câmera com coach de foto, entrada por áudio e pagamento **externo** — aprovável na App Store e no Google Play. TDD + CI no GitHub obrigatórios.

## 1. Stack e por quê
- **Expo (React Native) + EAS** (Build / Submit / Update). Continuidade com React; um código para iOS e Android; OTA updates para corrigir rápido sem nova revisão de loja.
- **Desktop/web:** o app Next.js (spec mestre §1.4) cobre desktop responsivo. Não fazer app desktop nativo na v1 (ver dúvida nº8 na conversa).
- Bibliotecas-chave: `expo-router` (navegação), `expo-notifications` (push), `expo-camera` (captura), `expo-image-picker` (usa o **system picker** — importante p/ política do Google), `expo-av`/`expo-audio` (gravar áudio), `expo-sensors` (giroscópio p/ nível da foto), `expo-secure-store` (tokens), TanStack Query (dados), `expo-localization` (PT-BR).
- **Sem WebView wrapper.** Apple rejeita "casca de site" (4.2); o app é nativo de verdade (push + câmera + áudio já garantem features nativas).

## 2. Pagamento dentro do app (decisão crítica de loja)
Marcenaria é **bem/serviço físico** → **pagamento externo (cartão/Pix via Asaas), NUNCA In-App Purchase**. Tanto Apple quanto Google **exigem** pagamento externo para bens/serviços físicos e **rejeitam** uso de IAP nesse caso.
- Implementar checkout via Asaas (cartão/Pix/boleto) em fluxo web seguro (HTTPS) ou SDK, **sem** StoreKit/Play Billing.
- **Não** criar produtos IAP no App Store Connect (produtos IAP "legados" presos em revisão já causaram rejeições 3.1.3 repetidas em casos reais — manter a conta limpa).
- Nada de linguagem/telas de "compra in-app"; é "contratar serviço".

## 3. Push (Expo Notifications) — eventos na spec mestre §10
- Registrar `PushToken` por device (plataforma IOS/ANDROID/WEB); enviar via Expo Push → FCM/APNs.
- Android 13+: pedir `POST_NOTIFICATIONS` em runtime. iOS: pedir autorização.
- **Deep links** para a tela exata (orçamento X, marco Y). Idempotência e `NotificationPref`/quiet hours respeitados.
- Não usar `USE_FULL_SCREEN_INTENT` (é permissão especial; nossas notificações são comuns).

## 4. Foto: upload, galeria ou câmera + coach (detalhe de IA no doc de ciência de dados)
- **Galeria:** usar **system photo picker** (`expo-image-picker`) → no Android evita `READ_MEDIA_IMAGES/VIDEO` (a política do Google manda usar o picker p/ acesso pontual; broad access exige declaração e justificativa). Menos permissão = menos atrito de revisão.
- **Câmera:** `expo-camera` com `NSCameraUsageDescription` (iOS) e `CAMERA` (Android), com texto de propósito claro.
- **Coach de foto em tempo real (on-device, barato):** giroscópio p/ "nivele o telefone", luminância do frame p/ "ambiente escuro, acenda a luz", overlay de enquadramento ("mostre a parede inteira"), detecção simples de desfoque. **Sem IA por frame** (custo/latência). Só após a captura, uma checagem única no Gemini valida ("refazer: muito escura / chegue mais perto").
- Guia visual de exemplos de "foto boa vs ruim" antes de abrir a câmera (ver doc design).

## 5. Áudio → texto/orçamento
- Gravar com `expo-audio`; subir o arquivo para R2 (URL assinada); processar com **Gemini multimodal** (transcreve + estrutura num passo). Detalhe do pipeline no doc de ciência de dados.
- Cliente: descreve o que quer (vira brief do projeto). Marceneiro: descreve o serviço → rascunho de orçamento com materiais/ferragens/tempo. **Sempre** mostrar o rascunho para o marceneiro revisar/editar antes de enviar.
- Limitar duração do áudio; mostrar transcrição para conferência (transparência).

## 6. Offline e resiliência
- O marceneiro pode estar em obra sem sinal: permitir **rascunhos offline** (orçamento, evidência de marco) com fila de sincronização ao reconectar (mutation queue do TanStack Query + storage local).
- Upload de foto/áudio com retry e progress; nunca perder uma evidência por queda de rede.

## 7. CHECKLIST DE APROVAÇÃO NAS LOJAS (obrigatório antes de submeter)
**Comum (Apple + Google):**
- [ ] Pagamento de serviço físico **externo** (sem IAP/Play Billing).
- [ ] **Exclusão de conta in-app** (e via web) — exigência das duas lojas.
- [ ] **Privacy policy** acessível dentro do app (não só na loja) + no cadastro.
- [ ] **Moderação de UGC** (fotos/áudio): triagem automática, **denunciar conteúdo**, **bloquear usuário**, contato de suporte.
- [ ] Permissões com texto de propósito claro; pedir só quando usar; mínimo necessário.
- [ ] Funciona em rede só-IPv6 (Apple 2.5.5).

**Apple:**
- [ ] Se houver login social (Google), **incluir Sign in with Apple**.
- [ ] App **não** é wrapper de site; tem features nativas (push, câmera, áudio).
- [ ] Disclosure de dados compartilhados com terceiros, **incluindo IA/serviços externos** (enviamos foto/áudio ao Gemini → declarar). Atualização nov/2025 reforçou isso.
- [ ] App Privacy "nutrition labels" no App Store Connect coerentes com o real.

**Google Play:**
- [ ] **Android Photo Picker** em vez de `READ_MEDIA_IMAGES/VIDEO` (uso pontual).
- [ ] **Data safety form** coerente com o que o app coleta/compartilha (declarar foto/áudio e compartilhamento com IA; se inferir características da pessoa a partir da foto, declarar também).
- [ ] Target API level atual; `POST_NOTIFICATIONS` em runtime.
- [ ] Sem permissões sensíveis desnecessárias (sem contatos; localização só se realmente usar — preferir entrada manual de área de atuação).
- [ ] Financial features declaration se aplicável.

## 8. CI/CD (GitHub) + TDD
- **EAS Build** disparado por GitHub Actions; **EAS Submit** para TestFlight/Play Internal em merges na `main`; **EAS Update** (OTA) para hotfix de JS.
- Testes: unitário (Jest + Testing Library RN), e2e (Maestro ou Detox) cobrindo fluxos críticos (checkout, evidência de marco, gravação de áudio). **Teste antes da implementação.**
- Builds de preview por PR; nada de merge com pipeline vermelho.

## 9. Riscos específicos
| Risco | Mitigação |
|---|---|
| Rejeição por IAP em serviço físico | Pagamento externo; conta sem produtos IAP |
| Rejeição por permissão de mídia ampla | System photo picker; câmera só com propósito |
| Rejeição por UGC sem moderação | Triagem + denúncia + bloqueio + suporte |
| Disclosure de IA divergente | Data safety / privacy labels declarando envio a Gemini |
| Evidência de marco perdida offline | Fila de sync + retry |
