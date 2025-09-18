-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('telegram', 'instagram', 'whatsapp', 'tiktok', 'web');

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "platform" "Platform" NOT NULL,
    "platform_user_id" TEXT NOT NULL,
    "platform_chat_id" BIGINT,
    "metadata" JSONB,
    "last_message_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sessions_platform_user_id_key" ON "sessions"("platform", "platform_user_id");

-- CreateTable
CREATE TABLE "session_memories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "session_id" UUID NOT NULL,
    "role" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "content" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "session_memories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_session_memories_session_created" ON "session_memories"("session_id", "created_at");

-- AlterTable
ALTER TABLE "jobs"
  ADD COLUMN "session_id" UUID,
  ADD COLUMN "parent_job_id" UUID;

-- CreateIndex
CREATE INDEX "idx_jobs_session_created" ON "jobs"("session_id", "created_at");

-- AddForeignKey
ALTER TABLE "session_memories"
  ADD CONSTRAINT "session_memories_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs"
  ADD CONSTRAINT "jobs_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs"
  ADD CONSTRAINT "jobs_parent_job_id_fkey" FOREIGN KEY ("parent_job_id") REFERENCES "jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
