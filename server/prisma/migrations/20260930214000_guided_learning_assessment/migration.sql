ALTER TABLE "GuidedLearningStep"
    ADD COLUMN "expectedConcept" TEXT,
    ADD COLUMN "awardedPoints" DOUBLE PRECISION,
    ADD COLUMN "answeredAt" TIMESTAMP(3);
