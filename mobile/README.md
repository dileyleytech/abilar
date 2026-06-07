# Abilar — App mobile (Expo)

App nativo iOS + Android em **Expo / React Native**, conectado ao **mesmo backend** (Supabase + endpoints `/api/mobile/*` do Next). Testável na hora pelo **Expo Go**, sem build e sem custo.

## O que já tem (fatia 1)
- **Login**: telefone (OTP SMS), e-mail (OTP código) e e-mail/telefone + **senha**. Sessão persistida.
- **Pedidos**: cliente vê os seus; marceneiro vê os pedidos abertos na região.
- **Obra (marcos)**: andamento com %; marceneiro **inicia/conclui** etapas, cliente **aprova** — com notificações (mesma regra da web).
- **Conversas + chat**: lista de conversas, mensagens em **tempo real**, envio com **mascaramento de contato** (telefone/e-mail/link ocultados).
- **Conta**: dados do usuário + sair.

> Leitura é direto no Supabase (RLS). Escritas com regra de negócio (enviar msg, mudar etapa) passam pelos endpoints `/api/mobile/*` do Next.

## Pré-requisitos
- **Node 20+** e o app **Expo Go** no celular (App Store / Play Store — grátis).
- Celular e computador **na mesma rede Wi‑Fi**.

## Configuração (1 vez)
```bash
cd mobile
npm install
cp .env.example .env.local
```
Edite `mobile/.env.local`:
- `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_ANON_KEY` → os mesmos `NEXT_PUBLIC_SUPABASE_*` do `.env.local` da raiz.
- `EXPO_PUBLIC_API_URL` → `http://SEU_IP_LAN:3001` (descubra com `ipconfig getifaddr en0`).

> Já deixei um `.env.local` preenchido para esta máquina (IP `192.168.3.3`). Se o seu IP mudar, atualize.

## Rodar e testar
1. **Backend** (na raiz do projeto): `pnpm dev` (sobe o Next na porta **3001**, acessível na LAN).
2. **App** (em `mobile/`): `npm start`.
3. Abra o **Expo Go** e **escaneie o QR** (iOS: câmera; Android: dentro do Expo Go).
4. Entre com uma conta de teste e navegue.

### Conta de teste (admin)
`admin@abilar.com.br` / `Abilar@2026` (aba **🔑 Senha**). Para testar como cliente/marceneiro, use as contas criadas no app web.

## Limitações conhecidas (próximas fatias)
- **Fotos no chat**: aparecem como “📷 Foto (veja no site)” — assinar a imagem precisa de um endpoint; entra depois.
- **Câmera / áudio / push**: precisam de *dev build* (EAS), não rodam 100% no Expo Go. Entram quando formos publicar.
- **Cadastro de conta**: por enquanto pelo site; o app foca em login + uso.

## Problemas comuns
- **“Sem conexão com o servidor”** ao enviar mensagem/aprovar etapa: confira `EXPO_PUBLIC_API_URL` (IP certo + porta **3001**) e se o `pnpm dev` está rodando.
- **Não chega o SMS/e-mail**: use a conta admin com **senha**.
- **Tela em branco / cache**: no terminal do Expo aperte `r` (reload) ou rode `npm start -- --clear`.
