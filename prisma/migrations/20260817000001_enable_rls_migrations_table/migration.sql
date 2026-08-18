-- `_prisma_migrations` is also in `public`, so the PostgREST `anon` role can
-- read and DELETE Prisma's migration history — enough to corrupt future
-- `migrate deploy` runs. Prisma connects with BYPASSRLS and is unaffected.
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
