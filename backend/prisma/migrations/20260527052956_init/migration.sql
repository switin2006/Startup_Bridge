-- CreateEnum
CREATE TYPE "Role" AS ENUM ('admin', 'investor', 'startup');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('pending', 'approved', 'suspended');

-- CreateEnum
CREATE TYPE "Domain" AS ENUM ('FinTech', 'EdTech', 'HealthTech', 'D2C', 'SaaS', 'Other');

-- CreateEnum
CREATE TYPE "PitchStatus" AS ENUM ('draft', 'published', 'in_negotiation', 'closed', 'withdrawn');

-- CreateEnum
CREATE TYPE "InterestStatus" AS ENUM ('pending', 'accepted', 'denied');

-- CreateEnum
CREATE TYPE "NegotiationStatus" AS ENUM ('open', 'pending_admin_close', 'concluded', 'failed');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('user_approved', 'interest_new', 'interest_accepted', 'interest_denied', 'message_new', 'negotiation_concluded');

-- CreateEnum
CREATE TYPE "FileScope" AS ENUM ('pitch_deck', 'proof_of_funds', 'misc');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'pending',
    "contact_phone" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pitches" (
    "id" TEXT NOT NULL,
    "startup_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "problem" TEXT NOT NULL,
    "solution" TEXT NOT NULL,
    "funding_amount" BIGINT NOT NULL,
    "equity_percent" DECIMAL(5,2) NOT NULL,
    "domain" "Domain" NOT NULL,
    "status" "PitchStatus" NOT NULL DEFAULT 'draft',
    "deck_file_id" TEXT,
    "published_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pitches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interests" (
    "id" TEXT NOT NULL,
    "investor_id" TEXT NOT NULL,
    "pitch_id" TEXT NOT NULL,
    "negotiation_id" TEXT,
    "proposed_amount" BIGINT NOT NULL,
    "proposed_equity_pct" DECIMAL(5,2) NOT NULL,
    "message" TEXT NOT NULL,
    "status" "InterestStatus" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responded_at" TIMESTAMP(3),

    CONSTRAINT "interests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "negotiations" (
    "id" TEXT NOT NULL,
    "pitch_id" TEXT NOT NULL,
    "startup_id" TEXT NOT NULL,
    "accepted_investor_id" TEXT,
    "status" "NegotiationStatus" NOT NULL DEFAULT 'open',
    "final_amount" BIGINT,
    "final_equity_pct" DECIMAL(5,2),
    "final_terms_note" TEXT,
    "opened_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "concluded_at" TIMESTAMP(3),

    CONSTRAINT "negotiations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "negotiation_id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "link_url" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "files" (
    "id" TEXT NOT NULL,
    "owner_user_id" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "size_bytes" BIGINT NOT NULL,
    "scope" "FileScope" NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_status_role_idx" ON "users"("status", "role");

-- CreateIndex
CREATE INDEX "pitches_startup_id_idx" ON "pitches"("startup_id");

-- CreateIndex
CREATE INDEX "pitches_status_published_at_idx" ON "pitches"("status", "published_at" DESC);

-- CreateIndex
CREATE INDEX "pitches_domain_status_idx" ON "pitches"("domain", "status");

-- CreateIndex
CREATE INDEX "interests_pitch_id_status_idx" ON "interests"("pitch_id", "status");

-- CreateIndex
CREATE INDEX "interests_investor_id_status_idx" ON "interests"("investor_id", "status");

-- CreateIndex
CREATE INDEX "interests_negotiation_id_idx" ON "interests"("negotiation_id");

-- CreateIndex
CREATE UNIQUE INDEX "interests_pitch_id_investor_id_key" ON "interests"("pitch_id", "investor_id");

-- CreateIndex
CREATE UNIQUE INDEX "negotiations_pitch_id_key" ON "negotiations"("pitch_id");

-- CreateIndex
CREATE INDEX "negotiations_status_idx" ON "negotiations"("status");

-- CreateIndex
CREATE INDEX "messages_negotiation_id_created_at_idx" ON "messages"("negotiation_id", "created_at" ASC);

-- CreateIndex
CREATE INDEX "notifications_user_id_is_read_created_at_idx" ON "notifications"("user_id", "is_read", "created_at" DESC);

-- CreateIndex
CREATE INDEX "files_owner_user_id_idx" ON "files"("owner_user_id");

-- AddForeignKey
ALTER TABLE "pitches" ADD CONSTRAINT "pitches_startup_id_fkey" FOREIGN KEY ("startup_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pitches" ADD CONSTRAINT "pitches_deck_file_id_fkey" FOREIGN KEY ("deck_file_id") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interests" ADD CONSTRAINT "interests_investor_id_fkey" FOREIGN KEY ("investor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interests" ADD CONSTRAINT "interests_pitch_id_fkey" FOREIGN KEY ("pitch_id") REFERENCES "pitches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interests" ADD CONSTRAINT "interests_negotiation_id_fkey" FOREIGN KEY ("negotiation_id") REFERENCES "negotiations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "negotiations" ADD CONSTRAINT "negotiations_pitch_id_fkey" FOREIGN KEY ("pitch_id") REFERENCES "pitches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "negotiations" ADD CONSTRAINT "negotiations_startup_id_fkey" FOREIGN KEY ("startup_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "negotiations" ADD CONSTRAINT "negotiations_accepted_investor_id_fkey" FOREIGN KEY ("accepted_investor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_negotiation_id_fkey" FOREIGN KEY ("negotiation_id") REFERENCES "negotiations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
