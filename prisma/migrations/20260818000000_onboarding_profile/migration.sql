-- Onboarding fields captured by the three-step /onboarding flow.
ALTER TABLE "User" ADD COLUMN "phoneCountry"   TEXT NOT NULL DEFAULT 'US';
ALTER TABLE "User" ADD COLUMN "linkedinUrl"    TEXT NOT NULL DEFAULT '';
ALTER TABLE "User" ADD COLUMN "hasLinkedin"    BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN "lookingFor"     TEXT NOT NULL DEFAULT '';
ALTER TABLE "User" ADD COLUMN "resumeFileName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "User" ADD COLUMN "resumeText"     TEXT NOT NULL DEFAULT '';
ALTER TABLE "User" ADD COLUMN "onboardedAt"    TIMESTAMP(3);
