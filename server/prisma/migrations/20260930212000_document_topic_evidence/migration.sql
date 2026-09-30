CREATE TABLE "DocumentTopic" (
    "documentId" UUID NOT NULL,
    "topicId" UUID NOT NULL,
    "evidencePages" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DocumentTopic_pkey" PRIMARY KEY ("documentId", "topicId")
);

CREATE INDEX "DocumentTopic_topicId_idx" ON "DocumentTopic"("topicId");

ALTER TABLE "DocumentTopic" ADD CONSTRAINT "DocumentTopic_documentId_fkey"
  FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DocumentTopic" ADD CONSTRAINT "DocumentTopic_topicId_fkey"
  FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
