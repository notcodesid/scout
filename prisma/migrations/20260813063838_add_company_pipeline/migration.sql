-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL DEFAULT '',
    "jobUrl" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "contacts" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "followUpDate" TEXT NOT NULL DEFAULT '',
    "dossier" JSONB,
    "fit" JSONB,
    "outreach" JSONB,
    "quality" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProofTask" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'other',
    "effort" TEXT NOT NULL DEFAULT '1-2 hrs',
    "why" TEXT NOT NULL DEFAULT '',
    "output" TEXT NOT NULL DEFAULT '',
    "done" BOOLEAN NOT NULL DEFAULT false,
    "evidenceLink" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProofTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProofTask_companyId_idx" ON "ProofTask"("companyId");

-- AddForeignKey
ALTER TABLE "ProofTask" ADD CONSTRAINT "ProofTask_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
