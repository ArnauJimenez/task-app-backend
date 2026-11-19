![CI Pipeline](https://github.com/ArnauJimenez/task-app-backend/actions/workflows/ci.yml/badge.svg)

# Task App Backend

A production-oriented backend for task management and conversational task automation. It provides a TypeScript/Express API, JWT-authenticated task operations, a Gemini-powered agent with CRUD tools, and real-time chat over Socket.IO.

## Architecture

```text
┌────────────────────┐      REST / Socket.IO      ┌──────────────────────────┐
│ Web / API clients  │ ─────────────────────────► │ Node.js 20 + Express     │
│ Conversational UI  │                            │ HTTP API + Socket.IO     │
└────────────────────┘                            └────────────┬─────────────┘
                                                               │
                               ┌───────────────────────────────┼──────────────────────┐
                               │                               │                      │
                               ▼                               ▼                      ▼
                     ┌───────────────────┐          ┌────────────────┐    ┌────────────────┐
                     │ Pino HTTP logging │          │ Sentry         │    │ JWT auth       │
                     │ request IDs       │          │ error telemetry│    │ user identity  │
                     └───────────────────┘          └────────────────┘    └───────┬────────┘
                                                                                   │
                                                        ┌──────────────────────────┘
                                                        ▼
                                              ┌─────────────────────┐
                                              │ Agent / task routes │
                                              └──────────┬──────────┘
                                                         │
                                       Agent tool calls  │  CRUD requests
                                                         ▼
                                              ┌─────────────────────┐
                                              │ Zod validation      │
                                              │ strict tool schemas │
                                              └──────────┬──────────┘
                                                         ▼
                                              ┌─────────────────────┐
                                              │ Prisma ORM          │
                                              │ user-scoped queries │
                                              └──────────┬──────────┘
                                                         ▼
                                              ┌─────────────────────┐
                                              │ PostgreSQL          │
                                              │ local / CI / prod   │
                                              └─────────────────────┘

Agent requests ──► Gemini adapter ──► tool calls ──► Zod ──► Prisma ──► PostgreSQL
```

> **Database note:** The Prisma schema and migration history use PostgreSQL. The initial PostgreSQL migration is intended for a new, empty database. Existing databases must be reviewed and baselined before enabling automatic migration deployment.

## Core stack

- **Runtime and API:** Node.js 20, TypeScript, Express 4
- **Real-time messaging:** Socket.IO
- **Persistence:** PostgreSQL 15, Prisma 5
- **Validation:** Zod
- **Authentication:** JWT and bcrypt
- **Agent integration:** Gemini API with typed task tools
- **Observability:** Pino / `pino-http`, request correlation IDs, Sentry
- **Containers:** Multi-stage Docker build and Docker Compose
- **Quality and CI:** Vitest, Supertest, GitHub Actions

## Features

- JWT-based registration and login.
- Authenticated task creation, listing, retrieval, update, and deletion.
- Per-user data isolation: task reads and mutations are scoped to the authenticated `userId`.
- Conversational task agent at `POST /api/agent/chat`, with `get_tasks`, `get_task_analytics`, `create_task`, `update_task`, and `delete_task` tools.
- User-scoped task analytics for totals, pending/completed counts, and rounded completion rate. Urgent-task counts are unavailable because the current task schema has no priority field.
- Real-time chat and conversation events using Socket.IO.
- Request IDs returned in `x-request-id` and included in structured HTTP logs.
- Database readiness endpoints at `GET /health` and `GET /api/health`.

### Main HTTP routes

| Route | Purpose |
|---|---|
| `POST /api/auth/register` | Register a user |
| `POST /api/auth/login` | Authenticate and receive a JWT |
| `/api/tasks` | Authenticated task CRUD |
| `POST /api/agent/chat` | Send a prompt to the task agent (JWT required) |
| `/api/chat` | Conversations and messages |
| `GET /health` | Database-aware cloud/container readiness probe |
| `GET /api/health` | Compatibility health endpoint |

Use `Authorization: Bearer <token>` for protected routes. The agent endpoint accepts a JSON body such as `{"prompt":"Show my pending tasks"}`.

## Architectural decisions

### Tenant isolation at the data boundary

Authenticated user identity is derived from the verified JWT, not from an arbitrary client-supplied user ID. Task operations include the authenticated `userId` in their database filters, including update and delete operations. Agent tool arguments are validated before execution; UUID-based task identifiers and strict schemas reduce ambiguity at the tool boundary.

### Production container hardening

The [Dockerfile](./Dockerfile) separates build-time and runtime stages. The runtime image installs production dependencies only, runs as the unprivileged `node` user, and starts the compiled Socket.IO server. PostgreSQL is not published to the host in the production Compose configuration.

### Correlated observability

Pino HTTP middleware emits structured request-completion logs with status and response time. A validated incoming `x-request-id` is preserved, or a UUID is generated and returned for correlation. Sentry's Express error handler is installed before the global JSON error handler.

### Reproducible CI database

The GitHub Actions workflow starts an ephemeral PostgreSQL service, generates Prisma Client, deploys PostgreSQL migrations, builds the TypeScript project, and runs the test suite.

## Local development

### Requirements

- Node.js 20 and npm
- Docker with the Compose plugin (for the included PostgreSQL service)

### Setup

1. Install dependencies:

   ```sh
   npm ci
   ```

2. Create a root `.env` from the sample:

   **PowerShell**

   ```powershell
   Copy-Item .env.example .env
   ```

   **Bash**

   ```sh
   cp .env.example .env
   ```

   Ensure `DATABASE_URL` points to the local PostgreSQL instance (the included Compose service maps host port `5433` to container port `5432`) and set a private `JWT_SECRET` of at least eight characters. Set `CORS_ORIGIN` to one or more comma-separated frontend origins. Add `GEMINI_API_KEY` to enable Gemini-backed chat and agent features. Do not commit `.env`.

3. Start PostgreSQL:

   ```sh
   docker compose up -d postgres_db
   ```

4. Generate Prisma Client and apply PostgreSQL migrations:

   ```sh
   npx prisma generate
   npm run db:migrate:deploy
   ```

5. Start the development server:

   ```sh
   npm run dev
   ```

The API and Socket.IO server listen on `http://localhost:3000` by default. Override `PORT` in `.env` if needed. `/health` checks PostgreSQL connectivity and returns HTTP 503 when the database is unavailable:

```sh
curl http://localhost:3000/health
```

## Production with Docker Compose

Create a **local, untracked** `.env.production` file in the repository root. Supply the required variables:

```dotenv
POSTGRES_USER=task_app
POSTGRES_PASSWORD=replace-with-a-strong-password
POSTGRES_DB=tasks
DATABASE_URL=postgresql://task_app:replace-with-a-strong-password@postgres_db:5432/tasks?schema=public
JWT_SECRET=replace-with-a-long-random-secret
CORS_ORIGIN=https://your-frontend.example.com
PORT=3000
```

Use URL-encoded characters in the database URL if the password contains reserved URL characters. Optional settings include `GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_TIMEOUT_MS`, `SENTRY_DSN`, and `FRONTEND_URL`. Keep real production secrets in your deployment's secret manager rather than in source control.

Build and start the stack:

```sh
docker compose -f docker-compose.prod.yml --env-file .env.production up --build -d
docker compose -f docker-compose.prod.yml --env-file .env.production ps
docker compose -f docker-compose.prod.yml --env-file .env.production logs --tail 100 api_server
```

The API is published on `${PORT:-3000}`; PostgreSQL remains private to the Compose network. Startup runs `prisma migrate deploy` before starting the API. The API waits for PostgreSQL's health check, and its readiness endpoint checks an actual database connection. Test with `curl http://localhost:3000/health` (replace `3000` if `PORT` differs).

### Cloud Deployment & Live Demo

For a small cloud deployment, create a PostgreSQL database in [Neon](https://neon.tech/) and deploy this repository to [Render](https://render.com/) using its Docker runtime and the repository `Dockerfile`. Configure Render's environment variables with the Neon `DATABASE_URL` (including `?sslmode=require`), a strong `JWT_SECRET`, `CORS_ORIGIN` set to the frontend's exact HTTPS origin(s), and any optional `GEMINI_API_KEY` or `SENTRY_DSN`. Render supplies `PORT`; the server binds to `0.0.0.0` and uses that value.

The container applies migrations before listening. The initial PostgreSQL baseline requires an empty database. Do not point it at a database containing existing tables or data unless that database has been deliberately baselined against this migration history. Configure Render's health check path as `/health`; it returns `200` only when PostgreSQL is reachable.

Free-tier instances may spin down while idle, so the first request after a cold start can take around 30 seconds. Add the deployed API URL here once available: **Live API:** _not deployed_.

`CORS_ORIGIN` accepts comma-separated exact origins and `*` wildcard patterns such as `https://*.example.com`. A bare `*` allows every browser origin and should only be used intentionally. When unset, the backend defaults to `http://localhost:5173`. `FRONTEND_URL` remains supported as a legacy fallback.

Stop the stack without deleting its database volume:

```sh
docker compose -f docker-compose.prod.yml --env-file .env.production down
```

## Tests and build

Run the configured test command and TypeScript build:

```sh
npm test
npm run build
```

`npm test` runs the Vitest unit and service suites. Database-backed authentication integration tests are separated into `npm run test:integration`; they require a reachable PostgreSQL database configured by `DATABASE_URL`. CI runs both commands against its ephemeral PostgreSQL service.

Avoid running migrations or destructive database setup commands against shared or production databases without reviewing their impact.

## Configuration reference

| Variable | Required | Purpose |
|---|---:|---|
| `DATABASE_URL` | Yes | Prisma PostgreSQL connection URL |
| `JWT_SECRET` | Yes | Signing secret for authentication tokens |
| `PORT` | No | HTTP and Socket.IO port; defaults to `3000` |
| `FRONTEND_URL` | No | Allowed frontend origin(s); defaults to `http://localhost:5173` |
| `CORS_ORIGIN` | No | Comma-separated allowed origins/patterns; takes precedence over `FRONTEND_URL` |
| `GEMINI_API_KEY` | For agent / bot | Gemini API credential |
| `GEMINI_MODEL` | No | Gemini model name |
| `GEMINI_TIMEOUT_MS` | No | Gemini request timeout |
| `SENTRY_DSN` | No | Sentry error telemetry DSN |
| `POSTGRES_USER` | Compose | PostgreSQL container user |
| `POSTGRES_PASSWORD` | Compose | PostgreSQL container password |
| `POSTGRES_DB` | Compose | PostgreSQL container database |
