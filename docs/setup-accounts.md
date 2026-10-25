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

## 4. Search Console (SEO automático)

O Airflow já roda os jobs; sem a chave abaixo eles apenas avisam "não configurado" (nada quebra).

1. Google Cloud (mesmo projeto) → **APIs → Biblioteca → "Google Search Console API" → Ativar**.
2. **IAM → Contas de serviço → Criar** ("gsc-reader") → aba **Chaves → Adicionar chave → JSON**. Salve no Pi em
   `/var/www/jvfd-cc/secrets/gsc/gsc-sa.json` (a pasta `secrets/gsc` já existe) e rode `chmod 600`.
3. <https://search.google.com/search-console> → sua propriedade → **Configurações → Usuários e permissões → Adicionar usuário**:
   o e-mail da conta de serviço (`...@...iam.gserviceaccount.com`), permissão **Restrito**.
4. `.env` no Pi: `GSC_SITE_URL=sc-domain:psicologojoaofernandes.com` (propriedade "Domínio") ou
   `https://psicologojoaofernandes.com/` ("Prefixo de URL"). Depois `bash deploy/deploy.sh` (ou `docker compose ... up -d api`).
5. Teste em **/admin → Tarefas → gsc.sync → Rodar agora**: a primeira execução busca até 16 meses de histórico.

## 5. Backup fora do Pi

O backup diário (banco + mídia) já é gravado no volume `clinic-backups` do Pi (7 diários + 4 semanais), mas no mesmo cartão SD.
Para copiar para fora, crie um bucket (Cloudflare R2 ou Backblaze B2) e coloque no `.env` do Pi:
`RCLONE_REMOTE=offsite:nome-do-bucket`, `RCLONE_CONFIG_OFFSITE_TYPE=s3`, `RCLONE_CONFIG_OFFSITE_PROVIDER=Cloudflare`,
`RCLONE_CONFIG_OFFSITE_ACCESS_KEY_ID=...`, `RCLONE_CONFIG_OFFSITE_SECRET_ACCESS_KEY=...`, `RCLONE_CONFIG_OFFSITE_ENDPOINT=https://<conta>.r2.cloudflarestorage.com`.
Recomendado também: um SSD USB/NVMe para `/var/lib/docker`.

## 6. Pesquisa científica e opcionais

- `NCBI_EMAIL=` um e-mail de contato (PubMed e Crossref pedem um). Sem ele a pesquisa semanal não roda.
- `NCBI_API_KEY=` opcional (limite maior de consultas).
- `RETENTION_LEADS_DAYS=90` **somente depois que o João confirmar**: apaga, todo dia, leads (cliques de anúncio) mais antigos que isso. Vazio = nunca apaga leads.
- Resumos em português com IA: `OPENAI_API_KEY=` (opcional; `OPENAI_MODEL=` padrão `gpt-4o-mini`; `LLM_MONTHLY_BUDGET_USD=` padrão 5). O resumo semanal envia só título, periódico e resumo públicos do artigo. Passando do orçamento do mês, o rascunho volta a citar o resumo original. Gasto em `llm_usage`.
- Botão **Gerar rascunho** em /admin/pautas: usa a mesma chave e o mesmo orçamento. Três passos (busca de fontes no PubMed/SciELO + uma busca na web, ideia do post, texto final no estilo do João) e cria um post em rascunho com as fontes. Custo típico: cerca de US$ 0,03 por rascunho (a busca na web é a maior parte). `OPENAI_DRAFT_MODEL=` opcional para o texto final; sem `NCBI_EMAIL` só a busca na web é usada.

## 7. Airflow

Roda no Pi (perfil `airflow` do compose), só acessível pela rede local: `ssh -L 8088:localhost:8088 xnths@192.168.68.110`
e abra <http://localhost:8088> (usuário `admin`, senha `AIRFLOW_ADMIN_PASSWORD` do `.env`).
Para desligar: `AIRFLOW_ENABLED=0` e `docker compose -f deploy/compose.yml --profile airflow stop`. O site não depende dele.
