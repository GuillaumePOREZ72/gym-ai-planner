-- CreateTable
CREATE TABLE "UserProfiles" (
    "userId" UUID NOT NULL,
    "goal" VARCHAR(20) NOT NULL,
    "experience" VARCHAR(20) NOT NULL,
    "daysPerWeek" INTEGER NOT NULL,
    "sessionLength" INTEGER NOT NULL,
    "equipment" VARCHAR(20) NOT NULL,
    "preferredSplit" VARCHAR(20) NOT NULL,
    "injuries" TEXT,
    "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserProfiles_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "TrainingPlans" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "planJson" JSONB NOT NULL,
    "planText" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrainingPlans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TrainingPlans_userId_idx" ON "TrainingPlans"("userId");
