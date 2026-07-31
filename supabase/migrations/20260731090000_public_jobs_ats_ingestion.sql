create table if not exists public.ats_job_sources (
  id uuid primary key default gen_random_uuid(),
  source_type text not null check (source_type in ('greenhouse', 'lever', 'ashby')),
  company_name text not null,
  source_key text not null,
  careers_url text,
  is_active boolean not null default true,
  last_attempt_at timestamp with time zone,
  last_success_at timestamp with time zone,
  last_error text,
  last_job_count integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  unique (source_type, source_key)
);

create table if not exists public.public_jobs (
  id text primary key,
  source_id uuid references public.ats_job_sources(id) on delete set null,
  source_type text not null check (source_type in ('greenhouse', 'lever', 'ashby', 'yc')),
  external_id text not null,
  title text not null,
  company_name text not null,
  company_slug text not null,
  location text not null default 'Unknown',
  workplace_type text,
  employment_type text,
  department text,
  description text,
  description_text text,
  apply_url text not null,
  job_url text not null,
  salary_text text,
  tags text[] not null default '{}',
  raw_payload jsonb not null default '{}'::jsonb,
  first_seen_at timestamp with time zone not null default now(),
  last_seen_at timestamp with time zone not null default now(),
  posted_at timestamp with time zone,
  updated_at timestamp with time zone,
  is_active boolean not null default true
);

create table if not exists public.public_job_sync_state (
  sync_key text primary key,
  status text not null default 'idle' check (status in ('idle', 'running', 'error')),
  stale_after_minutes integer not null default 360,
  last_attempt_at timestamp with time zone,
  current_started_at timestamp with time zone,
  last_success_at timestamp with time zone,
  last_completed_at timestamp with time zone,
  last_duration_ms integer,
  total_active_jobs integer not null default 0,
  total_sources integer not null default 0,
  last_reason text,
  last_error text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create index if not exists idx_ats_job_sources_active_type on public.ats_job_sources (is_active, source_type);
create index if not exists idx_public_jobs_active_seen on public.public_jobs (is_active, last_seen_at desc);
create index if not exists idx_public_jobs_company on public.public_jobs (company_slug);
create index if not exists idx_public_jobs_source on public.public_jobs (source_type, is_active);
create index if not exists idx_public_jobs_title_search on public.public_jobs using gin (to_tsvector('english', title || ' ' || company_name || ' ' || coalesce(description_text, '')));

alter table public.ats_job_sources enable row level security;
alter table public.public_jobs enable row level security;
alter table public.public_job_sync_state enable row level security;

drop policy if exists "ATS job sources are publicly readable" on public.ats_job_sources;
create policy "ATS job sources are publicly readable"
on public.ats_job_sources for select using (true);

drop policy if exists "Public jobs are publicly readable" on public.public_jobs;
create policy "Public jobs are publicly readable"
on public.public_jobs for select using (true);

drop policy if exists "Public job sync state is publicly readable" on public.public_job_sync_state;
create policy "Public job sync state is publicly readable"
on public.public_job_sync_state for select using (true);

create or replace function public.finalize_public_job_sync(p_seen_at timestamp with time zone)
returns table (
  deactivated_jobs integer,
  active_jobs integer
)
language plpgsql
as $$
declare
  v_deactivated_jobs integer := 0;
begin
  update public.public_jobs
  set is_active = false
  where is_active = true
    and last_seen_at < p_seen_at;

  get diagnostics v_deactivated_jobs = row_count;

  return query
  select
    v_deactivated_jobs,
    (select count(*)::integer from public.public_jobs where is_active = true);
end;
$$;

insert into public.public_job_sync_state (sync_key, status, stale_after_minutes, last_reason)
values ('public_jobs', 'idle', 360, 'initial-setup')
on conflict (sync_key) do update
set stale_after_minutes = excluded.stale_after_minutes,
    updated_at = now();
