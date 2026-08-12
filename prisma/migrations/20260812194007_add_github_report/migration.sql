-- CreateTable
CREATE TABLE "GithubReport" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "followers" INTEGER NOT NULL DEFAULT 0,
    "publicRepos" INTEGER NOT NULL DEFAULT 0,
    "totalStars" INTEGER NOT NULL DEFAULT 0,
    "score" INTEGER NOT NULL DEFAULT 0,
    "summary" TEXT NOT NULL DEFAULT '',
    "strengths" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "redFlags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "topRepos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "activityNote" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "GithubReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GithubReport_userId_key" ON "GithubReport"("userId");

-- AddForeignKey
ALTER TABLE "GithubReport" ADD CONSTRAINT "GithubReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
