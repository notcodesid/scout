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
- Local-first: everything (profile + company pipeline) lives in Postgres (Docker).
- AI via any OpenAI-compatible provider, defaulting to Google's free Gemini tier.
- Prisma ORM with a full user-domain schema (links, skills, projects, experience, education).

## Database

```bash
docker compose up -d          # starts Postgres on localhost:5433
npx prisma migrate dev        # applies migrations
npx prisma generate           # generates the client into generated/prisma
```

The connection string is `DATABASE_URL` in `.env` / `.env.local`
(`postgresql://scout:scout@localhost:5433/scout`). Port 5433 avoids clashes
with a system Postgres on 5432. `generated/` is gitignored; fresh clones run
`npx prisma generate`.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## AI setup

Scout works in mock mode with no key (you get sample output to try the flow). To go live:

1. Get a free key at https://aistudio.google.com/apikey
2. Copy `.env.local.example` to `.env.local` and set `AI_API_KEY`
3. Restart the dev server

Or paste base URL / model / key into the **AI settings** panel in the app header (stored in your
browser only).

The same OpenAI-compatible protocol supports Groq, OpenRouter, DeepSeek, and OpenAI — just change
`AI_BASE_URL` and `AI_MODEL`. Examples are in `.env.local.example`.

## Design notes

- The product optimizes for *better* applications, never *more*.
- "Skip" is a feature: fit analysis protects your time.
- Drafts are written to pass the quality check before you see them, and you edit them into
  something only you could write.
