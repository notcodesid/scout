ALTER TABLE "User" ADD COLUMN "intakeDoneAt" TIMESTAMP(3);

CREATE TABLE "IntakeAnswer" (
    "id"        TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "field"     TEXT NOT NULL,
    "section"   TEXT NOT NULL,
    "question"  TEXT NOT NULL,
    "value"     JSONB NOT NULL,
    "display"   TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "IntakeAnswer_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "IntakeAnswer_userId_field_key" ON "IntakeAnswer"("userId","field");
CREATE INDEX "IntakeAnswer_userId_idx" ON "IntakeAnswer"("userId");
ALTER TABLE "IntakeAnswer" ADD CONSTRAINT "IntakeAnswer_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Same deny-all posture as every other table: Prisma bypasses RLS, PostgREST does not.
ALTER TABLE "IntakeAnswer" ENABLE ROW LEVEL SECURITY;
