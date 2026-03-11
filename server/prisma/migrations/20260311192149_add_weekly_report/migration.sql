-- CreateTable
CREATE TABLE "WeeklyReport" (
    "userId" UUID NOT NULL,
    "reportText" TEXT NOT NULL,
    "weekStart" VARCHAR(10) NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeeklyReport_pkey" PRIMARY KEY ("userId")
);
