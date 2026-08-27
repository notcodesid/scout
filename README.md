# Scout

**Manual Job Application Copilot.** Apply to fewer companies, but apply like someone who
actually understands the company and can prove they can help.

Scout turns Aditya Thakur's essay
[*A Guide to Getting Hired at Early-Stage Startups*](https://adityathakurgg.substack.com/p/a-guide-to-getting-hired)
into an executable workflow:

1. **Evidence profile** — every project stored as work + context + outcome, plus "did anyone care?"
   (users, feedback, distribution).
2. **Research dossier** — paste a company URL and job post; get a sourced brief. You verify it
   before moving on.
3. **Fit analysis** — strong matches, weak matches, missing proof, and an honest
   apply / wait / skip verdict.
4. **Proof task** — one small, company-specific piece of work that produces a linkable outcome.
   Outreach stays locked until it's done.
5. **Outreach** — short email / LinkedIn / X drafts with placeholders only you can fill.
6. **Quality check** — scores the draft against the article's red flags: no links, buzzwords,
   AI-slop, generic praise, length.

The pipeline is gated on purpose. You cannot reach outreach without verified research, a fit
verdict, and at least one completed proof task. That gate *is* the product. AI generation runs
server-side against your DB profile, using the key from `.env.local` (no browser config needed).

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS v4
- Everything (profile + company pipeline) lives in Postgres, hosted on Supabase.
- AI via any OpenAI-compatible provider, defaulting to Groq's free tier.
- Prisma ORM with a full user-domain schema (links, skills, projects, experience, education).

## Database

Scout runs on a hosted **Supabase** Postgres. Two connection strings are needed,
both from Project Settings → Database → Connection string:

| Var | Pooler | Port | Used by |
| --- | --- | --- | --- |
| `DATABASE_URL` | Transaction | 6543 | the app at runtime |
| `DIRECT_URL` | Session | 5432 | `prisma migrate` |

They are split because the transaction pooler multiplexes statements across
backends, which breaks the advisory locks migrations rely on. Both pooler hosts
are IPv4; the `db.<ref>.supabase.co` direct host is **IPv6-only** and will fail
from Vercel and most CI runners.

Keep `?uselibpqcompat=true&sslmode=require` on both strings. It means "encrypt,
don't verify the certificate". Without `uselibpqcompat`, node-postgres v8 reads
`sslmode=require` as `verify-full` and rejects Supabase's self-signed chain —
and with no `sslmode` at all the connection is silently **unencrypted**.

```bash
npx prisma generate           # generates the client into generated/prisma
npx prisma migrate deploy     # applies existing migrations to Supabase
```

`generated/` is gitignored; fresh clones run `npx prisma generate`.

### Writing new migrations

Supabase won't let Prisma create the shadow database that `migrate dev` needs,
so author migrations against the local Docker Postgres, then deploy them:

```bash
docker compose up -d                                             # localhost:5433
DATABASE_URL=$LOCAL DIRECT_URL=$LOCAL npx prisma migrate dev      # author
npx prisma migrate deploy                                         # ship to Supabase
```

where `LOCAL=postgresql://scout:scout@localhost:5433/scout`. That is the only
remaining use for `docker-compose.yml`.

**Any new table needs RLS.** Supabase exposes everything in the `public` schema
over PostgREST, where the `anon` role — reachable by anyone holding the
publishable key — gets SELECT/INSERT/UPDATE/DELETE by default. Prisma connects
as `postgres`, which has `BYPASSRLS`, so enabling row-level security with **no
policies** is a deny-all for the public API and a no-op for the app. Every
migration that adds a table must end with:

```sql
ALTER TABLE "NewTable" ENABLE ROW LEVEL SECURITY;
```

Verify with `select relname, relrowsecurity from pg_class where
relnamespace='public'::regnamespace and relkind='r'` — every row must be `true`.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Auth (Google sign-in)

Scout is a single-person tool, so auth is a **gate**, not multi-tenancy: there is
still one profile and one pipeline. Any Google account can complete the OAuth
flow, so the account must also appear in `AUTH_ALLOWED_EMAILS` — that allowlist
is the real gate, and it **fails closed** (empty means nobody gets in).

One-time setup:

1. **Google Cloud** → APIs & Services → Credentials → *Create OAuth client ID*
   (Web application). Set the authorized redirect URI to the callback Supabase
   gives you: `https://<project-ref>.supabase.co/auth/v1/callback`.
2. **Supabase** → Authentication → Providers → **Google**: enable it and paste
   the client ID and secret. They live in Supabase, never in this repo.
3. **Supabase** → Authentication → URL Configuration → add your redirect URLs:
   `http://localhost:3000/auth/callback` and the deployed equivalent.
4. Set `AUTH_ALLOWED_EMAILS` in `.env.local` to your Google address
   (comma-separated for more than one), then restart the dev server.

### How it is enforced

Three layers, because the outer one is not a security boundary:

| Layer | File | Role |
| --- | --- | --- |
| Optimistic redirect | [`proxy.ts`](proxy.ts) | Bounces signed-out browsers to `/login` and refreshes the Supabase token. Convenience only. |
| Data Access Layer | [`lib/auth.ts`](lib/auth.ts) | `requireUser()` — the real gate. Called by every page, server action, and route handler. |
| Allowlist | `AUTH_ALLOWED_EMAILS` | Checked in the OAuth callback *and* on every request, so revoking access takes effect immediately. |

Server actions are public HTTP endpoints — `proxy.ts` only redirects browsers,
so **every new server action must call `requireUser()` itself**. JSON routes
call `requireUserJson()` and return 401 instead of redirecting. `lib/auth.ts`
uses `getUser()` rather than `getSession()`: `getSession()` only decodes a
client-controlled cookie and must never drive an authorization decision.

## Onboarding

First sign-in lands on `/onboarding`, a three-step flow. Every page except
`/onboarding` itself calls `requireOnboardedUser()`, so an unfinished profile
cannot reach the pipeline.

1. **How can we reach you?** — name, optional phone with a dial-code picker,
   LinkedIn, and an "I don't have a LinkedIn account" escape hatch.
2. **Add your resume** — PDF or `.docx`, 10MB max. The file is parsed to text
   server-side ([`lib/resume.ts`](lib/resume.ts): `unpdf` for PDF, `mammoth` for
   Word), then an AI pass ([`parseResumeServer`](lib/ai.ts)) extracts projects,
   experience, education, skills, links, and what they're looking for. Step 2's
   copy adapts based on whether LinkedIn was given, and the resume becomes
   **required** when it wasn't.
3. **Show us your work** — GitHub, site, research, X, plus arbitrary extra
   links. Pre-filled from whatever the resume revealed, so this is a
   confirmation step rather than retyping. "Continue" stamps `onboardedAt`.

Notes on behaviour worth knowing:

- **Hand-typed values win.** Re-uploading a resume replaces the parsed
  relations (projects, skills, education, experience) but never overwrites a
  field the user filled in themselves.
- **The binary is not stored.** Only the extracted text (`resumeText`) and the
  filename are kept — there is no storage bucket to configure.
- **Scanned PDFs fail loudly.** A PDF with no text layer produces a clear error
  rather than a silently empty profile, as does a missing AI key.

## Intake conversation

After the three-step form, `/onboarding/intake` runs a chat-style intake that
fills the **same evidence profile** `/profile` edits. `/profile` remains the
place to review and correct; the conversation is how it gets populated.

The questions are **derived from gaps, not a fixed list**.
[`computeGaps()`](lib/intake.ts) diffs the profile after the resume pass and asks
only for what is still missing, so the conversation stays short and never makes
you retype what the resume already gave. In testing, a full resume left just six
questions.

The gap set mirrors the `/profile` sections — Basics, Position, Skills,
Projects, Experience, Wrap up — and the highest-value ones are per-project:

- **`project:<id>:users`** — "did anyone actually use it?" A resume states what
  you built and almost never who used it, and Scout's fit and outreach stages
  lean on exactly that. This is the question the conversation exists for.
- **`project:<id>:outcome`** — only when the resume gave no visible result..
