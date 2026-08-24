# Deploy em produção

Checklist mínimo pra subir a API + painel numa VM com Docker. Não cobre HA,
backups automatizados ou observabilidade — só o necessário pra ir ao ar com
segurança básica.

## 0. Pré-requisitos

- Uma VM/servidor com Docker e Docker Compose instalados (ex.: AWS EC2 São
  Paulo — seção 7 do briefing, por causa da LGPD).
- Um domínio (ou dois: `api.seudominio.com.br` e `app.seudominio.com.br`) com
  DNS apontando pro servidor.
- Um reverse proxy com TLS na frente dos containers (Caddy é o mais simples —
  renova certificado sozinho; nginx+certbot também funciona). Este repo **não
  inclui TLS** — os containers `api` (porta 3000) e `web` (porta 8080) sobem
  em HTTP puro, pra você decidir o proxy.
- Conta WhatsApp Cloud API configurada na Meta, com o número de telefone já
  aprovado.

## 1. Segredos

```bash
cp .env.production.example .env
```

Preencha **todos** os campos — a aplicação recusa subir em produção se
`JWT_SECRET`, `WHATSAPP_APP_SECRET`, `WHATSAPP_WEBHOOK_VERIFY_TOKEN`,
`WHATSAPP_ACCESS_TOKEN` ou `WHATSAPP_PHONE_NUMBER_ID` estiverem vazios ou com
o valor de exemplo (ver `src/config/assert-production-config.ts`).

- `JWT_SECRET`: `openssl rand -base64 48`
- `POSTGRES_PASSWORD` / `REDIS_PASSWORD`: senhas fortes, únicas
- `WHATSAPP_APP_SECRET`: Meta App Dashboard → Configurações → Básico ("App
  Secret", não o access token)
- `WHATSAPP_WEBHOOK_VERIFY_TOKEN`: qualquer string que você escolher — vai
  cadastrar o mesmo valor no passo 4
- `VITE_API_URL`: a URL pública da API (ex.: `https://api.seudominio.com.br`)
  — fica embutida no build estático do front, então trocar depois exige
  rebuildar a imagem `web`, não só reiniciar o container

**Nunca** commite o `.env` preenchido.

## 2. Subir os containers

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Isso sobe `postgres`, `redis`, `api` (porta 3000) e `web` (porta 8080, estático
via nginx). Aponte seu reverse proxy pra essas duas portas.

## 3. Rodar as migrations

```bash
docker compose -f docker-compose.prod.yml exec api npx prisma migrate deploy
```

Rode isso a cada deploy que inclua uma migration nova — não roda sozinho no
boot do container.

## 4. Cadastrar o webhook na Meta

No painel da Meta (WhatsApp → Configuração → Webhook), cadastre:

- **Callback URL**: `https://api.seudominio.com.br/whatsapp/webhook`
- **Verify Token**: o mesmo valor de `WHATSAPP_WEBHOOK_VERIFY_TOKEN` do `.env`
- Inscreva-se nos campos `messages` e `message_status` (ou equivalente)

## 5. Criar o primeiro usuário ADMIN

Não existe registro público — o primeiro admin de cada clínica é criado por
script direto no banco. A imagem de produção não tem `ts-node` (só
dependências de runtime), então rode isso do seu próprio computador, apontando
pro Postgres de produção:

```bash
# se o Postgres não estiver exposto publicamente, abra um túnel primeiro:
# ssh -L 5433:localhost:5432 usuario@servidor

DATABASE_URL="postgresql://planicie:SENHA@localhost:5433/planicie_digital?schema=public" \
  npx ts-node scripts/criar-usuario-admin.ts <clinicaId> "Nome" email@clinica.com "senha-forte"
```

(A clínica em si ainda precisa existir — crie via `POST /clinicas` com esse
mesmo admin depois do primeiro login, ou direto no banco antes.)

## 6. Deploys seguintes

```bash
git pull
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec api npx prisma migrate deploy
```

## O que este checklist NÃO cobre (gaps conhecidos)

- Controle de acesso por papel além de `/usuarios` — qualquer usuário logado
  (secretária, médico ou admin) hoje lê/edita dados de qualquer clínica via
  API.
- Rate limiting nos endpoints públicos (`/auth/login`, webhook).
- Testes automatizados — não há suíte de testes no projeto ainda.
- Backup automatizado do Postgres (o volume Docker persiste os dados, mas não
  há rotina de snapshot/exportação configurada).

Fechar esses pontos antes de operar com pacientes reais em volume é
recomendado, não bloqueante para um piloto controlado.
