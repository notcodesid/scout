-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "headline" TEXT NOT NULL DEFAULT '',
    "about" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "location" TEXT NOT NULL DEFAULT '',
    "timezone" TEXT NOT NULL DEFAULT '',
    "githubUsername" TEXT NOT NULL DEFAULT '',
    "availability" TEXT NOT NULL DEFAULT '',
    "remote" BOOLEAN NOT NULL DEFAULT false,
    "openToRelocate" BOOLEAN NOT NULL DEFAULT false,
    "targetRoles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfileLink" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProfileLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Skill" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "years" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "problem" TEXT NOT NULL DEFAULT '',
    "work" TEXT NOT NULL DEFAULT '',
    "outcome" TEXT NOT NULL DEFAULT '',
    "users" TEXT NOT NULL DEFAULT '',
    "links" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "startDate" TEXT NOT NULL DEFAULT '',
    "endDate" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Education" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "school" TEXT NOT NULL,
    "degree" TEXT NOT NULL DEFAULT '',
    "field" TEXT NOT NULL DEFAULT '',
    "startDate" TEXT NOT NULL DEFAULT '',
    "endDate" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Education_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Experience" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "startDate" TEXT NOT NULL DEFAULT '',
    "endDate" TEXT NOT NULL DEFAULT '',
    "current" BOOLEAN NOT NULL DEFAULT false,
    "summary" TEXT NOT NULL DEFAULT '',
    "bullets" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Experience_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProfileLink_userId_idx" ON "ProfileLink"("userId");

-- CreateIndex
CREATE INDEX "Skill_userId_idx" ON "Skill"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Skill_userId_name_key" ON "Skill"("userId", "name");

-- CreateIndex
CREATE INDEX "Project_userId_idx" ON "Project"("userId");

-- CreateIndex
CREATE INDEX "Education_userId_idx" ON "Education"("userId");

-- CreateIndex
CREATE INDEX "Experience_userId_idx" ON "Experience"("userId");

-- AddForeignKey
ALTER TABLE "ProfileLink" ADD CONSTRAINT "ProfileLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Skill" ADD CONSTRAINT "Skill_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Education" ADD CONSTRAINT "Education_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Experience" ADD CONSTRAINT "Experience_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
