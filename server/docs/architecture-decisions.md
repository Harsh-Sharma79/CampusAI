# Backend architecture decisions

**Scope:** Backend-only CampusAI implementation. No frontend implementation or UI styling is included.

## Persistence and Prisma
- The specification requires PostgreSQL, Prisma, and pgvector.
- The Manus-managed database for this project is MySQL-compatible. Its `DATABASE_URL` is not compatible with the requested PostgreSQL schema. Keep this backend on its own `CAMPUSAI_POSTGRES_URL` DSN; do not silently use MySQL or shadow the platform-owned `DATABASE_URL`.
- The deployment must supply a PostgreSQL service with the `vector` extension installed and a private DSN. Prisma represents custom vector data as an unsupported type; use a committed custom SQL migration and parameterized Prisma raw SQL for insert/search.
- The migration uses 768-dimensional vectors and a cosine HNSW index. Changing dimensions/model requires a schema change and re-embedding stored chunks.

## Gemini API
- Call the Google Gemini API only from server code; never ship the API key to browser code.
- Defaults use the official current stable text model `gemini-3.8-flash` and stable embedding model `gemini-embedding-2`; both remain environment-configurable.
- The official embeddings guide recommends task instructions in text for `gemini-embedding-2` and does not accept `task_type` for that model. Use consistent query/document prefixes. The implementation requests 768 output dimensions to match `vector(768)`.
- AI failure is returned as a real API error, not replaced with invented or canned content.

## File storage and processing
- Local filesystem storage is for development only. Production uses an S3-compatible adapter (AWS S3, Cloudflare R2, or Supabase S3-compatible storage); providers and credentials are environment-configured.
- Upload creates the actual owned document record and persists an asynchronous job before responding; text extraction, chunking, embedding, and Gemini analysis happen in a worker.

## Authentication
- The explicit specification calls for password-backed registration, JWT authentication, and access/refresh tokens. Passwords are hashed; refresh tokens are random, opaque, rotated, and stored hashed. Private records are filtered by authenticated `userId`, never by client-supplied ownership.

## Official references reviewed (2026-09-30)
- Google Gemini model catalog: https://ai.google.dev/gemini-api/docs/models
- Google Gemini embeddings guide: https://ai.google.dev/gemini-api/docs/embeddings
- Prisma PostgreSQL extensions / pgvector: https://www.prisma.io/docs/postgres/database/postgres-extensions
