-- Initial Migration for Gauthmath AI Study Platform (SQLite & PostgreSQL Compatible)
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "emailVerified" DATETIME,
    "name" TEXT NOT NULL DEFAULT 'Gauth Learner',
    "image" TEXT,
    "role" TEXT NOT NULL DEFAULT 'STUDENT',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "planTier" TEXT NOT NULL DEFAULT 'FREE',
    "billingCycle" TEXT NOT NULL DEFAULT 'yearly',
    "freeQueriesRemaining" INTEGER NOT NULL DEFAULT 3,
    "aiProRemaining" INTEGER NOT NULL DEFAULT 1,
    "courseCreditsRemaining" INTEGER NOT NULL DEFAULT 3,
    "preferredAiProvider" TEXT NOT NULL DEFAULT 'auto',
    "passwordHash" TEXT,
    "revokedAt" DATETIME,
    "revokedReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
