-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('STUDENT', 'ADMIN');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('UPLOADING', 'PROCESSING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('SYLLABUS', 'NOTES', 'PREVIOUS_YEAR_PAPER', 'OTHER');

-- CreateEnum
CREATE TYPE "ChatRole" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('MCQ', 'TRUE_FALSE', 'SHORT_ANSWER');

-- CreateEnum
CREATE TYPE "QuizType" AS ENUM ('PRACTICE', 'DIAGNOSTIC');

-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('FOUNDATIONAL', 'INTERMEDIATE', 'ADVANCED');

-- CreateEnum
CREATE TYPE "AttemptStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "FlashcardState" AS ENUM ('NEW', 'LEARNING', 'REVIEW', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "StudyTaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('DOCUMENT_UPLOADED', 'DOCUMENT_PROCESSED', 'TUTOR_MESSAGE', 'GUIDED_LEARNING', 'DIAGNOSTIC_COMPLETED', 'QUIZ_COMPLETED', 'FLASHCARD_REVIEWED', 'STUDY_SESSION', 'STUDY_TASK_COMPLETED', 'PLAN_GENERATED');

-- CreateEnum
CREATE TYPE "RecommendationAction" AS ENUM ('GUIDED_LEARNING', 'QUIZ', 'FLASHCARDS', 'REVIEW', 'READ_DOCUMENT');

-- CreateEnum
CREATE TYPE "BackgroundJobType" AS ENUM ('PROCESS_DOCUMENT', 'GENERATE_EMBEDDINGS', 'ANALYZE_DOCUMENT', 'GENERATE_QUIZ', 'GENERATE_FLASHCARDS', 'UPDATE_RECOMMENDATIONS');

-- CreateEnum
CREATE TYPE "BackgroundJobStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "avatar" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'STUDENT',
    "universityId" UUID,
    "courseId" UUID,
    "semesterId" UUID,
    "onboardingComplete" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "University" (
    "id" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "University_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Course" (
    "id" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "universityId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Semester" (
    "id" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "courseId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Semester_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subject" (
    "id" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "courseId" UUID,
    "semesterId" UUID,
    "name" TEXT NOT NULL,
    "importance" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Topic" (
    "id" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "subjectId" UUID NOT NULL,
    "parentId" UUID,
    "canonicalPath" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "importance" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Topic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningObjective" (
    "id" UUID NOT NULL,
    "topicId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LearningObjective_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "subjectId" UUID,
    "topicId" UUID,
    "fileName" TEXT NOT NULL,
    "title" TEXT,
    "storageKey" TEXT NOT NULL,
    "storageUrl" TEXT,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "checksum" TEXT NOT NULL,
    "pageCount" INTEGER,
    "documentType" "DocumentType" NOT NULL DEFAULT 'OTHER',
    "status" "DocumentStatus" NOT NULL DEFAULT 'UPLOADING',
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "processingStartedAt" TIMESTAMP(3),
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentChunk" (
    "id" UUID NOT NULL,
    "documentId" UUID NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "pageNumber" INTEGER,
    "tokenCount" INTEGER,
    "embeddingModel" TEXT,
    "embeddingDimensions" INTEGER,
    "embedding" vector(768),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentChunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Chat" (
    "id" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "subjectId" UUID,
    "topicId" UUID,
    "documentId" UUID,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Chat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" UUID NOT NULL,
    "chatId" UUID NOT NULL,
    "role" "ChatRole" NOT NULL,
    "content" TEXT NOT NULL,
    "citations" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quiz" (
    "id" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "subjectId" UUID,
    "topicId" UUID,
    "documentId" UUID,
    "title" TEXT NOT NULL,
    "quizType" "QuizType" NOT NULL DEFAULT 'PRACTICE',
    "difficulty" "Difficulty" NOT NULL DEFAULT 'INTERMEDIATE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Quiz_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" UUID NOT NULL,
    "quizId" UUID NOT NULL,
    "documentId" UUID,
    "topicId" UUID,
    "type" "QuestionType" NOT NULL,
    "prompt" TEXT NOT NULL,
    "options" JSONB,
    "correctAnswer" TEXT NOT NULL,
    "gradingRubric" TEXT,
    "explanation" TEXT,
    "difficulty" "Difficulty" NOT NULL DEFAULT 'INTERMEDIATE',
    "pageNumber" INTEGER,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizAttempt" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "quizId" UUID NOT NULL,
    "status" "AttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "scorePercent" DOUBLE PRECISION,
    "correctCount" INTEGER NOT NULL DEFAULT 0,
    "incorrectCount" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "QuizAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizAnswer" (
    "id" UUID NOT NULL,
    "attemptId" UUID NOT NULL,
    "questionId" UUID NOT NULL,
    "response" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "awardedPoints" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "feedback" TEXT,
    "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuizAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Flashcard" (
    "id" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "topicId" UUID,
    "documentId" UUID,
    "chatId" UUID,
    "front" TEXT NOT NULL,
    "back" TEXT NOT NULL,
    "state" "FlashcardState" NOT NULL DEFAULT 'NEW',
    "intervalDays" INTEGER NOT NULL DEFAULT 0,
    "easeFactor" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "nextReviewAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastReviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Flashcard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlashcardReview" (
    "id" UUID NOT NULL,
    "flashcardId" UUID NOT NULL,
    "known" BOOLEAN NOT NULL,
    "responseTimeMs" INTEGER,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "intervalAfterDays" INTEGER NOT NULL,

    CONSTRAINT "FlashcardReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudyPlan" (
    "id" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudyPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudyTask" (
    "id" UUID NOT NULL,
    "planId" UUID NOT NULL,
    "topicId" UUID,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "recommendedMinutes" INTEGER NOT NULL,
    "status" "StudyTaskStatus" NOT NULL DEFAULT 'TODO',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudyTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudySession" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "topicId" UUID,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "durationMinutes" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudySession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentMastery" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "topicId" UUID NOT NULL,
    "masteryScore" DOUBLE PRECISION NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "lastStudiedAt" TIMESTAMP(3),
    "lastAssessedAt" TIMESTAMP(3),
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "correctCount" INTEGER NOT NULL DEFAULT 0,
    "incorrectCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentMastery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TopicPerformance" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "topicId" UUID NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "correct" INTEGER NOT NULL DEFAULT 0,
    "incorrect" INTEGER NOT NULL DEFAULT 0,
    "accuracy" DOUBLE PRECISION,
    "recentAccuracy" DOUBLE PRECISION,
    "lastStudiedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TopicPerformance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningActivity" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "subjectId" UUID,
    "topicId" UUID,
    "type" "ActivityType" NOT NULL,
    "durationMinutes" INTEGER,
    "metadata" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LearningActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mistake" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "topicId" UUID,
    "questionId" UUID NOT NULL,
    "attemptId" UUID NOT NULL,
    "studentAnswer" TEXT NOT NULL,
    "correctAnswer" TEXT NOT NULL,
    "explanation" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Mistake_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recommendation" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "topicId" UUID,
    "action" "RecommendationAction" NOT NULL,
    "recommendedMinutes" INTEGER NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "reason" TEXT NOT NULL,
    "evidence" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Recommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSettings" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "preferredStudyMinutes" INTEGER NOT NULL DEFAULT 60,
    "notificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
    "aiResponseStyle" TEXT NOT NULL DEFAULT 'guided',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIUsage" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "operation" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "estimatedCost" DECIMAL(12,8),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamEvent" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "subjectId" UUID,
    "documentId" UUID,
    "title" TEXT NOT NULL,
    "examAt" TIMESTAMP(3) NOT NULL,
    "importance" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExamEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuidedLearningSession" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "topicId" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "currentStep" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuidedLearningSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuidedLearningStep" (
    "id" UUID NOT NULL,
    "sessionId" UUID NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "prompt" TEXT NOT NULL,
    "response" TEXT,
    "feedback" TEXT,
    "explanation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuidedLearningStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BackgroundJob" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "type" "BackgroundJobType" NOT NULL,
    "status" "BackgroundJobStatus" NOT NULL DEFAULT 'PENDING',
    "payload" JSONB NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BackgroundJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_courseId_idx" ON "User"("courseId");

-- CreateIndex
CREATE INDEX "User_universityId_idx" ON "User"("universityId");

-- CreateIndex
CREATE INDEX "User_semesterId_idx" ON "User"("semesterId");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

-- CreateIndex
CREATE INDEX "University_ownerId_idx" ON "University"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "University_ownerId_name_key" ON "University"("ownerId", "name");

-- CreateIndex
CREATE INDEX "Course_ownerId_idx" ON "Course"("ownerId");

-- CreateIndex
CREATE INDEX "Course_universityId_idx" ON "Course"("universityId");

-- CreateIndex
CREATE UNIQUE INDEX "Course_universityId_name_key" ON "Course"("universityId", "name");

-- CreateIndex
CREATE INDEX "Semester_ownerId_idx" ON "Semester"("ownerId");

-- CreateIndex
CREATE INDEX "Semester_courseId_idx" ON "Semester"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "Semester_courseId_name_key" ON "Semester"("courseId", "name");

-- CreateIndex
CREATE INDEX "Subject_ownerId_idx" ON "Subject"("ownerId");

-- CreateIndex
CREATE INDEX "Subject_courseId_idx" ON "Subject"("courseId");

-- CreateIndex
CREATE INDEX "Subject_semesterId_idx" ON "Subject"("semesterId");

-- CreateIndex
CREATE UNIQUE INDEX "Subject_ownerId_courseId_name_key" ON "Subject"("ownerId", "courseId", "name");

-- CreateIndex
CREATE INDEX "Topic_ownerId_subjectId_idx" ON "Topic"("ownerId", "subjectId");

-- CreateIndex
CREATE INDEX "Topic_parentId_idx" ON "Topic"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "Topic_ownerId_subjectId_canonicalPath_key" ON "Topic"("ownerId", "subjectId", "canonicalPath");

-- CreateIndex
CREATE INDEX "LearningObjective_topicId_idx" ON "LearningObjective"("topicId");

-- CreateIndex
CREATE UNIQUE INDEX "LearningObjective_topicId_name_key" ON "LearningObjective"("topicId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Document_storageKey_key" ON "Document"("storageKey");

-- CreateIndex
CREATE INDEX "Document_ownerId_createdAt_idx" ON "Document"("ownerId", "createdAt");

-- CreateIndex
CREATE INDEX "Document_ownerId_status_idx" ON "Document"("ownerId", "status");

-- CreateIndex
CREATE INDEX "Document_subjectId_idx" ON "Document"("subjectId");

-- CreateIndex
CREATE INDEX "Document_topicId_idx" ON "Document"("topicId");

-- CreateIndex
CREATE INDEX "DocumentChunk_documentId_pageNumber_idx" ON "DocumentChunk"("documentId", "pageNumber");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentChunk_documentId_chunkIndex_key" ON "DocumentChunk"("documentId", "chunkIndex");

-- CreateIndex
CREATE INDEX "Chat_ownerId_updatedAt_idx" ON "Chat"("ownerId", "updatedAt");

-- CreateIndex
CREATE INDEX "Chat_topicId_idx" ON "Chat"("topicId");

-- CreateIndex
CREATE INDEX "ChatMessage_chatId_createdAt_idx" ON "ChatMessage"("chatId", "createdAt");

-- CreateIndex
CREATE INDEX "Quiz_ownerId_createdAt_idx" ON "Quiz"("ownerId", "createdAt");

-- CreateIndex
CREATE INDEX "Quiz_subjectId_idx" ON "Quiz"("subjectId");

-- CreateIndex
CREATE INDEX "Quiz_topicId_idx" ON "Quiz"("topicId");

-- CreateIndex
CREATE INDEX "Question_quizId_idx" ON "Question"("quizId");

-- CreateIndex
CREATE INDEX "Question_topicId_idx" ON "Question"("topicId");

-- CreateIndex
CREATE UNIQUE INDEX "Question_quizId_position_key" ON "Question"("quizId", "position");

-- CreateIndex
CREATE INDEX "QuizAttempt_userId_startedAt_idx" ON "QuizAttempt"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "QuizAttempt_quizId_status_idx" ON "QuizAttempt"("quizId", "status");

-- CreateIndex
CREATE INDEX "QuizAnswer_questionId_idx" ON "QuizAnswer"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "QuizAnswer_attemptId_questionId_key" ON "QuizAnswer"("attemptId", "questionId");

-- CreateIndex
CREATE INDEX "Flashcard_ownerId_nextReviewAt_idx" ON "Flashcard"("ownerId", "nextReviewAt");

-- CreateIndex
CREATE INDEX "Flashcard_topicId_idx" ON "Flashcard"("topicId");

-- CreateIndex
CREATE INDEX "FlashcardReview_flashcardId_reviewedAt_idx" ON "FlashcardReview"("flashcardId", "reviewedAt");

-- CreateIndex
CREATE INDEX "StudyPlan_ownerId_startDate_idx" ON "StudyPlan"("ownerId", "startDate");

-- CreateIndex
CREATE INDEX "StudyTask_planId_scheduledFor_idx" ON "StudyTask"("planId", "scheduledFor");

-- CreateIndex
CREATE INDEX "StudyTask_topicId_idx" ON "StudyTask"("topicId");

-- CreateIndex
CREATE INDEX "StudyTask_status_scheduledFor_idx" ON "StudyTask"("status", "scheduledFor");

-- CreateIndex
CREATE INDEX "StudySession_userId_startedAt_idx" ON "StudySession"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "StudySession_topicId_idx" ON "StudySession"("topicId");

-- CreateIndex
CREATE INDEX "StudentMastery_userId_masteryScore_idx" ON "StudentMastery"("userId", "masteryScore");

-- CreateIndex
CREATE INDEX "StudentMastery_topicId_idx" ON "StudentMastery"("topicId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentMastery_userId_topicId_key" ON "StudentMastery"("userId", "topicId");

-- CreateIndex
CREATE INDEX "TopicPerformance_userId_accuracy_idx" ON "TopicPerformance"("userId", "accuracy");

-- CreateIndex
CREATE INDEX "TopicPerformance_topicId_idx" ON "TopicPerformance"("topicId");

-- CreateIndex
CREATE UNIQUE INDEX "TopicPerformance_userId_topicId_key" ON "TopicPerformance"("userId", "topicId");

-- CreateIndex
CREATE INDEX "LearningActivity_userId_occurredAt_idx" ON "LearningActivity"("userId", "occurredAt");

-- CreateIndex
CREATE INDEX "LearningActivity_userId_type_occurredAt_idx" ON "LearningActivity"("userId", "type", "occurredAt");

-- CreateIndex
CREATE INDEX "LearningActivity_topicId_occurredAt_idx" ON "LearningActivity"("topicId", "occurredAt");

-- CreateIndex
CREATE INDEX "Mistake_userId_resolvedAt_createdAt_idx" ON "Mistake"("userId", "resolvedAt", "createdAt");

-- CreateIndex
CREATE INDEX "Mistake_topicId_createdAt_idx" ON "Mistake"("topicId", "createdAt");

-- CreateIndex
CREATE INDEX "Recommendation_userId_createdAt_idx" ON "Recommendation"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Recommendation_userId_completedAt_idx" ON "Recommendation"("userId", "completedAt");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_createdAt_idx" ON "Notification"("userId", "readAt", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserSettings_userId_key" ON "UserSettings"("userId");

-- CreateIndex
CREATE INDEX "AIUsage_userId_createdAt_idx" ON "AIUsage"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AIUsage_operation_createdAt_idx" ON "AIUsage"("operation", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_expiresAt_idx" ON "RefreshToken"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "RefreshToken_expiresAt_revokedAt_idx" ON "RefreshToken"("expiresAt", "revokedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_expiresAt_idx" ON "PasswordResetToken"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "ExamEvent_userId_examAt_idx" ON "ExamEvent"("userId", "examAt");

-- CreateIndex
CREATE INDEX "ExamEvent_subjectId_examAt_idx" ON "ExamEvent"("subjectId", "examAt");

-- CreateIndex
CREATE INDEX "GuidedLearningSession_userId_startedAt_idx" ON "GuidedLearningSession"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "GuidedLearningSession_topicId_idx" ON "GuidedLearningSession"("topicId");

-- CreateIndex
CREATE INDEX "GuidedLearningStep_sessionId_idx" ON "GuidedLearningStep"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "GuidedLearningStep_sessionId_stepNumber_key" ON "GuidedLearningStep"("sessionId", "stepNumber");

-- CreateIndex
CREATE INDEX "BackgroundJob_status_availableAt_idx" ON "BackgroundJob"("status", "availableAt");

-- CreateIndex
CREATE INDEX "BackgroundJob_userId_createdAt_idx" ON "BackgroundJob"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "University"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_semesterId_fkey" FOREIGN KEY ("semesterId") REFERENCES "Semester"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "University" ADD CONSTRAINT "University_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "University"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Semester" ADD CONSTRAINT "Semester_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Semester" ADD CONSTRAINT "Semester_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subject" ADD CONSTRAINT "Subject_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subject" ADD CONSTRAINT "Subject_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subject" ADD CONSTRAINT "Subject_semesterId_fkey" FOREIGN KEY ("semesterId") REFERENCES "Semester"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Topic" ADD CONSTRAINT "Topic_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Topic" ADD CONSTRAINT "Topic_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Topic" ADD CONSTRAINT "Topic_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Topic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningObjective" ADD CONSTRAINT "LearningObjective_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentChunk" ADD CONSTRAINT "DocumentChunk_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quiz" ADD CONSTRAINT "Quiz_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quiz" ADD CONSTRAINT "Quiz_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quiz" ADD CONSTRAINT "Quiz_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quiz" ADD CONSTRAINT "Quiz_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizAttempt" ADD CONSTRAINT "QuizAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizAttempt" ADD CONSTRAINT "QuizAttempt_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizAnswer" ADD CONSTRAINT "QuizAnswer_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "QuizAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizAnswer" ADD CONSTRAINT "QuizAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Flashcard" ADD CONSTRAINT "Flashcard_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Flashcard" ADD CONSTRAINT "Flashcard_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Flashcard" ADD CONSTRAINT "Flashcard_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Flashcard" ADD CONSTRAINT "Flashcard_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlashcardReview" ADD CONSTRAINT "FlashcardReview_flashcardId_fkey" FOREIGN KEY ("flashcardId") REFERENCES "Flashcard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyPlan" ADD CONSTRAINT "StudyPlan_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyTask" ADD CONSTRAINT "StudyTask_planId_fkey" FOREIGN KEY ("planId") REFERENCES "StudyPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyTask" ADD CONSTRAINT "StudyTask_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudySession" ADD CONSTRAINT "StudySession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudySession" ADD CONSTRAINT "StudySession_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentMastery" ADD CONSTRAINT "StudentMastery_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentMastery" ADD CONSTRAINT "StudentMastery_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopicPerformance" ADD CONSTRAINT "TopicPerformance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopicPerformance" ADD CONSTRAINT "TopicPerformance_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningActivity" ADD CONSTRAINT "LearningActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningActivity" ADD CONSTRAINT "LearningActivity_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningActivity" ADD CONSTRAINT "LearningActivity_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mistake" ADD CONSTRAINT "Mistake_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mistake" ADD CONSTRAINT "Mistake_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mistake" ADD CONSTRAINT "Mistake_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mistake" ADD CONSTRAINT "Mistake_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "QuizAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recommendation" ADD CONSTRAINT "Recommendation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recommendation" ADD CONSTRAINT "Recommendation_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSettings" ADD CONSTRAINT "UserSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIUsage" ADD CONSTRAINT "AIUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamEvent" ADD CONSTRAINT "ExamEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamEvent" ADD CONSTRAINT "ExamEvent_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamEvent" ADD CONSTRAINT "ExamEvent_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuidedLearningSession" ADD CONSTRAINT "GuidedLearningSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuidedLearningSession" ADD CONSTRAINT "GuidedLearningSession_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuidedLearningStep" ADD CONSTRAINT "GuidedLearningStep_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "GuidedLearningSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BackgroundJob" ADD CONSTRAINT "BackgroundJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
