-- Scout talks to Postgres only through Prisma, as a role with BYPASSRLS
-- (`postgres` on Supabase, the table owner locally). Supabase, however, also
-- exposes every table in `public` over PostgREST, where the `anon` role holds
-- default SELECT/INSERT/UPDATE/DELETE grants — so anyone with the publishable
-- key could read and delete the pipeline and the profile.
--
-- Enabling RLS with NO policies makes that a deny-all for PostgREST while
-- leaving Prisma untouched. Re-run this for any table added by a later
-- migration. To deliberately expose a table (e.g. after adding Supabase Auth),
-- add an explicit policy rather than disabling RLS.
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProfileLink" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Skill" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Project" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Education" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Experience" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Company" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProofTask" ENABLE ROW LEVEL SECURITY;
