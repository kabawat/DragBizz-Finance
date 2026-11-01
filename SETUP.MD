# DragBizz Finance setup

## Step: 1 — Requirements

Requires Node.js 22, Yarn 4.14.1, Docker Compose and MongoDB. Start [shared Redis](../DragBizz-Infra/SETUP.MD) first.

## Step: 2 — Create the env file

Create `.env`:

```bash
cp env.example .env
```

## Step: 3 — Configure the service

Set database URLs, service credentials and Redis settings from Infra's `redis/secrets/finance.env`. Configure the selected payment gateway, webhook credentials and Core/Utility endpoints. Use test gateway credentials for development.

## Step: 4 — Start development

Start development:

```bash
yarn dev:start
yarn dev:logs
```

## Step: 5 — Start production

For production, copy `env.example` to `.env.production`, fill in production settings and use Infra's `secrets-production/finance.env` credentials. Provision production key/certificate mounts under `/etc/dragbizz/production/` as declared in Compose.

```bash
yarn prod:start
yarn prod:logs
```

`dev:start` uses `docker-compose.dev.yml`; `prod:start` uses only `docker-compose.yml` and `.env.production`. Stop with `yarn dev:stop` or `yarn prod:stop`.
