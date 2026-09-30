# CampusAI backend

Backend-only Express 5 + TypeScript API for the completed CampusAI frontend. The frontend is deliberately not recreated or changed here.

## Requirements

- Node.js 22+ and npm 10+
- PostgreSQL 15/16 with the `vector` extension available (`pgvector`)
- A Gemini API key for tutor, structured study generation, analysis, and embeddings
- Durable S3-compatible storage for production uploads (AWS S3, Cloudflare R2, or a compatible Supabase storage endpoint)
- SMTP settings if password-reset emails should be delivered

The project uses **`CAMPUSAI_POSTGRES_URL`** for its external PostgreSQL database. It does not use the Manus-managed `DATABASE_URL`, which is MySQL-compatible and cannot run this PostgreSQL/pgvector schema.

## Local setup

1. Copy `server/.env.example` to `server/.env` and replace the placeholders. Never commit `.env` files.
2. Start the local database if Docker Compose is available:

   ```sh
   docker compose up -d db
   ```

   For this compose service, use `CAMPUSAI_POSTGRES_URL=postgresql://campusai:dev-only-change-me@localhost:55432/campusai?schema=public`.
3. Install dependencies and generate the typed Prisma client:

   ```sh
   npm ci
   npm run prisma:generate
   ```
4. Apply committed migrations to the development database:

   ```sh
   npm run migrate:deploy
   ```
5. Start the API:

   ```sh
   npm run dev
   ```

   It listens on `http://localhost:5000` by default. Check `/api/health/live`, `/api/health/ready`, `/api/openapi.json`, and `/api/docs`.

## Configuration

Set `GEMINI_API_KEY` only in a private environment variable or deployment secret manager. The model requested for this project is configurable as `GEMINI_MODEL=gemini-2.5-flash-lite`. `GEMINI_EMBEDDING_MODEL` defaults to `gemini-embedding-2`; embeddings are requested at 768 dimensions to match the committed `vector(768)` schema. Switching embedding model or dimensions requires re-embedding existing chunks and updating the schema/index.

`SUPABASE_PROJECT_ID`, `SUPABASE_URL`, and `SUPABASE_PUBLISHABLE_KEY` in the example file are public frontend metadata only. The publishable key is not a database credential and is never used for backend database access. Use a private PostgreSQL connection string and private S3 credentials for server operations.

For production, configure `NODE_ENV=production`, strong independent `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` values (at least 32 characters), `STORAGE_DRIVER=s3` plus S3 settings, `CAMPUSAI_POSTGRES_URL`, the provider keys, and the actual `CLIENT_URL`/`CLIENT_URLS`. Local disk uploads are intentionally rejected in production. Password-reset routes require SMTP configuration; without it, no fake email is reported as sent.

Example secret generation:

```sh
openssl rand -base64 48
```

## API contract

All routes are under `/api`. Responses use `{ success: true, data }`; failures use `{ success: false, error: { code, message, details? } }`. Most endpoints require a valid access token and authorize records against the authenticated user ID. Registration creates a student, never an administrator. Admin routes require an administrator role.

OpenAPI JSON and interactive documentation are served at `/api/openapi.json` and `/api/docs`. Health checks are `/api/health/live` and `/api/health/ready`. `GET /manus-routes.json` declares that this API-only workspace has no website page routes; API and system endpoints are not page routes.

## Database and uploads

Migrations are committed under `server/prisma/migrations`. The migration sequence enables pgvector, creates application tables, adds the HNSW cosine index, and stores evidence pages for source-grounded topic maps. To apply them on a deployment database, run `npm run migrate:deploy` from a trusted migration job before serving API traffic. Do not run destructive dev migrations against production data.

PDF, DOCX, and UTF-8 TXT uploads are validated, stored privately, and queued in PostgreSQL. The worker extracts page text, chunks and embeds it, then analyzes the actual uploaded content. Job state and source data survive application restarts when the configured PostgreSQL and object store are durable. Long-running work is polled through `/api/jobs/:id`.

## Commands

- `npm run typecheck` — strict TypeScript check for source and tests
- `npm test` — focused unit and API-contract tests
- `npm run build` — production TypeScript build
- `npm run prisma:validate` / `npm run prisma:generate`
- `npm run migrate:deploy` — apply migrations to the configured external PostgreSQL database
- `npm run start` — start compiled API

## Deployment

`Dockerfile` builds the API and serves it on `PORT` (default 5000). Supply private runtime secrets through the deployment platform, use a managed PostgreSQL instance with pgvector and durable S3-compatible object storage, and run migrations as a deployment step. `/api/health/live` is the process liveness path; `/api/health/ready` checks PostgreSQL. Container filesystems are ephemeral and must not hold production uploads.

The repository does not contain real provider credentials, database passwords, user records, or seed data. The frontend-to-backend integration still needs the frontend's actual origin and API base URL to be configured for the target deployment.
