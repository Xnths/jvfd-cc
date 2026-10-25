# Contas e chaves necessárias (tutorial)

Nada aqui é necessário para o site atual continuar funcionando. São os passos para ligar a nova plataforma
(login com Google, comentários com Turnstile, e-mails, Search Console). Faça na ordem; cada seção diz o que
colocar no `.env` do Pi (`/var/www/jvfd-cc/.env`).

## 0. Segredos aleatórios (no Pi)

```bash
cd /var/www/jvfd-cc
for k in POSTGRES_PASSWORD AIRFLOW_DB_PASSWORD COOKIE_SECRET IP_HASH_SECRET REVALIDATE_SECRET UNSUBSCRIBE_SECRET; do
  echo "$k=$(openssl rand -hex 24)"
done
```
Cole as linhas no `.env`. Depois gere a chave de assinatura dos tokens (uma vez, não troque depois):
```bash
mkdir -p secrets && docker run --rm -v "$PWD/secrets:/out" --entrypoint /usr/local/bin/migrate clinic-backend:local keys generate /out/jwt.pem
chmod 600 secrets/jwt.pem
```
(Se a imagem ainda não existir, rode antes `docker compose -f deploy/compose.yml build auth`.)

## 1. Login com Google (obrigatório)

1. Entre em <https://console.cloud.google.com> com a conta do João ou do Jonathas e crie um projeto: **"Site Psicólogo"**.
2. **APIs e serviços → Tela de consentimento OAuth** → tipo **Externo** → nome do app "Psicólogo João Fernandes",
   e-mail de suporte = o seu. Escopos: deixe os padrões (`openid`, `email`, `profile`). Em **Usuários de teste**, adicione
   `fernandesdominguesjoaovitor@gmail.com` e `jonathascastilhoes@gmail.com`. Pode ficar em "Testando": só essas duas
   contas entram, que é o que queremos.
3. **Credenciais → Criar credenciais → ID do cliente OAuth → Aplicativo da Web**.
   - Origens JavaScript autorizadas: `https://psicologojoaofernandes.com` e `http://localhost:3000`
   - URIs de redirecionamento: `https://psicologojoaofernandes.com/auth/google/callback` e `http://localhost:3000/auth/google/callback`
4. Copie o ID e o segredo para o `.env`:
   ```
   GOOGLE_OAUTH_CLIENT_ID=...apps.googleusercontent.com
   GOOGLE_OAUTH_CLIENT_SECRET=...
   ```

## 2. Cloudflare Turnstile (comentários e perguntas anônimas)

1. Painel Cloudflare → **Turnstile → Add widget**. Domínio `psicologojoaofernandes.com`, modo **Managed**.
2. Copie para o `.env`: `TURNSTILE_SITE_KEY=` (pública) e `TURNSTILE_SECRET=`.
3. Em **Security → Settings**, confirme que nenhuma regra de cache cobre `/admin*`, `/auth/*` ou `/api/*`, e que o
   *Bot Fight Mode* não bloqueia `POST /api/leads`.

## 3. Resend (e-mail da newsletter)

1. A chave atual já está no `.env` (`RESEND_API_KEY`). Confirme em <https://resend.com/domains> que o domínio está **Verified** (SPF e DKIM).
2. Opcional (descadastro automático por bounce): **Webhooks → Add endpoint** `https://psicologojoaofernandes.com/api/v1/webhooks/resend`
   e copie o *Signing secret* para `RESEND_WEBHOOK_SECRET=`.

## 4. Search Console (SEO automático, fase posterior)

1. Google Cloud (mesmo projeto) → **APIs → Biblioteca → "Google Search Console API" → Ativar**.
2. **IAM → Contas de serviço → Criar** ("gsc-reader") → aba **Chaves → Adicionar chave → JSON**. Salve no Pi em
   `/var/www/jvfd-cc/secrets/gsc-sa.json` e rode `chmod 600`.
3. <https://search.google.com/search-console> → sua propriedade → **Configurações → Usuários e permissões → Adicionar usuário**:
   o e-mail da conta de serviço (`...@...iam.gserviceaccount.com`), permissão **Restrito**.
4. `.env`: `GSC_SITE_URL=sc-domain:psicologojoaofernandes.com` (se a propriedade for "Domínio") ou
   `https://psicologojoaofernandes.com/` (se for "Prefixo de URL"), e `GSC_CREDENTIALS_FILE=/run/secrets/gsc-sa.json`.

## 5. Backup fora do Pi

Backup no mesmo cartão SD não protege de nada. Instale o rclone (`sudo apt install rclone`), rode `rclone config`
e crie um remote (Cloudflare R2, Backblaze B2 ou Google Drive). Anote o nome em `RCLONE_REMOTE=`.
Recomendado também: um SSD USB/NVMe para `/var/lib/docker` (o cartão SD sofre com escrita de banco de dados).

## 6. Opcionais

- `ANTHROPIC_API_KEY` (rascunhos de resumos e títulos; defina limite de gasto no console da Anthropic).
- `NCBI_API_KEY` e `NCBI_EMAIL` (PubMed, limite maior de consultas).

## 7. Ligar a plataforma nova (só depois dos itens 0 e 1)

```bash
cd /var/www/jvfd-cc && bash deploy/deploy.sh
```
Este script sobe Postgres, auth e API e troca o nginx (alguns segundos fora do ar na primeira vez).
**Hoje o deploy normal é `bash scripts/deploy.sh`, que não mexe em nada disso.**
