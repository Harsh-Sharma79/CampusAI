CREATE INDEX "DocumentChunk_embedding_hnsw_idx" ON "DocumentChunk" USING hnsw ("embedding" vector_cosine_ops) WHERE "embedding" IS NOT NULL;
