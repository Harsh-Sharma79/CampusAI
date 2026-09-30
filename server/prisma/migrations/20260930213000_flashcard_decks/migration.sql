CREATE TABLE "FlashcardDeck" (
    "id" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FlashcardDeck_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Flashcard" ADD COLUMN "deckId" UUID;
ALTER TABLE "Flashcard" ADD COLUMN "pageNumber" INTEGER;

CREATE INDEX "Flashcard_deckId_idx" ON "Flashcard"("deckId");
CREATE INDEX "FlashcardDeck_ownerId_createdAt_idx" ON "FlashcardDeck"("ownerId", "createdAt");

ALTER TABLE "FlashcardDeck" ADD CONSTRAINT "FlashcardDeck_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Flashcard" ADD CONSTRAINT "Flashcard_deckId_fkey"
  FOREIGN KEY ("deckId") REFERENCES "FlashcardDeck"("id") ON DELETE CASCADE ON UPDATE CASCADE;
