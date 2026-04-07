create table if not exists public.job_sources (
  slug text primary key,
  label text not null,
  base_url text not null default '',
  description text not null default '',
  logo_url text,
  is_active boolean not null default true,
  default_stale_after_minutes integer not null default 360,
  sort_order integer not null default 0,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table if not exists public.jobs (
  id text not null,
  source_slug text not null references public.job_sources(slug) on delete cascade,
  title text not null,
  company_name text not null,
  company_slug text not null default '',
  company_one_liner text not null default '',
  company_logo_url text,
  company_website_url text,
  job_type text not null default 'Full-time',
  location text not null default '',
  salary_min integer,
  salary_max integer,
  salary_currency text default 'USD',
  remote text not null default 'Unknown',
  skills text[] not null default '{}',
  description text not null default '',
  apply_url text not null,
  job_url text not null,
  seniority text not null default '',
  category text not null default '',
  is_active boolean not null default true,
  first_seen_at timestamp with time zone not null default now(),
  last_seen_at timestamp with time zone not null default now(),
  synced_at timestamp with time zone not null default now(),
  primary key (source_slug, id)
);

create table if not exists public.job_sync_states (
  source_slug text primary key references public.job_sources(slug) on delete cascade,
  status text not null default 'idle' check (status in ('idle', 'running', 'error')),
  stale_after_minutes integer not null default 360,
  last_attempt_at timestamp with time zone,
  current_started_at timestamp with time zone,
  last_success_at timestamp with time zone,
  last_completed_at timestamp with time zone,
  last_duration_ms integer,
  total_active_jobs integer not null default 0,
  last_reason text,
  last_error text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create index if not exists idx_jobs_is_active on public.jobs (is_active);
create index if not exists idx_jobs_last_seen_at on public.jobs (last_seen_at desc);
create index if not exists idx_jobs_source on public.jobs (source_slug, is_active);
create index if not exists idx_jobs_location on public.jobs (location);
create index if not exists idx_jobs_job_type on public.jobs (job_type);

alter table public.job_sources enable row level security;
alter table public.jobs enable row level security;
alter table public.job_sync_states enable row level security;

drop policy if exists "Job sources are publicly readable" on public.job_sources;
create policy "Job sources are publicly readable"
on public.job_sources for select using (true);

drop policy if exists "Jobs are publicly readable" on public.jobs;
create policy "Jobs are publicly readable"
on public.jobs for select using (true);

drop policy if exists "Job sync states are publicly readable" on public.job_sync_states;
create policy "Job sync states are publicly readable"
on public.job_sync_states for select using (true);

insert into public.job_sources (slug, label, base_url, description, sort_order)
values
  ('yc', 'YC Work at a Startup', 'https://www.workatastartup.com', 'Y Combinator startup jobs — curated high-signal early-stage roles', 0),
  ('wellfound', 'Wellfound', 'https://wellfound.com', 'Startup jobs with funding data and equity info', 1),
  ('indeed', 'Indeed', 'https://www.indeed.com', 'Massive volume of job listings across all industries', 2),
  ('naukri', 'Naukri', 'https://www.naukri.com', 'India''s largest job board — tech and beyond', 3),
  ('glassdoor', 'Glassdoor', 'https://www.glassdoor.com', 'Jobs with salary insights and company reviews', 4),
  ('hn', 'HN Who is Hiring', 'https://news.ycombinator.com', 'Monthly startup hiring threads — direct founder access', 5),
  ('remoteok', 'Remote OK', 'https://remoteok.com', 'Fully remote roles — global opportunities', 6),
  ('internshala', 'Internshala', 'https://internshala.com', 'Internships and entry-level roles', 7),
  ('cutshort', 'Cutshort', 'https://cutshort.io', 'Tech-focused hiring in India with smart matching', 8)
on conflict (slug) do update
set
  label = excluded.label,
  base_url = excluded.base_url,
  description = excluded.description,
  sort_order = excluded.sort_order,
  updated_at = now();

insert into public.job_sync_states (source_slug, status, stale_after_minutes, last_reason)
values
  ('yc', 'idle', 360, 'initial-multi-source-setup'),
  ('wellfound', 'idle', 360, 'initial-multi-source-setup'),
  ('indeed', 'idle', 360, 'initial-multi-source-setup'),
  ('naukri', 'idle', 360, 'initial-multi-source-setup'),
  ('glassdoor', 'idle', 360, 'initial-multi-source-setup'),
  ('hn', 'idle', 360, 'initial-multi-source-setup'),
  ('remoteok', 'idle', 360, 'initial-multi-source-setup'),
  ('internshala', 'idle', 360, 'initial-multi-source-setup'),
  ('cutshort', 'idle', 360, 'initial-multi-source-setup')
on conflict (source_slug) do update
set
  stale_after_minutes = excluded.stale_after_minutes,
  updated_at = now();

create or replace function public.finalize_job_sync(p_source_slug text, p_seen_at timestamp with time zone)
returns table (deactivated_jobs integer, active_jobs integer)
language plpgsql
as $$
declare v_deactivated integer := 0;
begin
  update public.jobs
  set is_active = false
  where source_slug = p_source_slug
    and is_active = true
    and last_seen_at < p_seen_at;

  get diagnostics v_deactivated = row_count;

  return query
  select
    v_deactivated,
    (select count(*)::integer from public.jobs where source_slug = p_source_slug and is_active = true);
end;
$$;

create or replace view public.job_listings as
select
  jobs.source_slug,
  sources.label as source_label,
  sources.base_url as source_base_url,
  jobs.id,
  jobs.title,
  jobs.company_name,
  jobs.company_slug,
  jobs.company_one_liner,
  jobs.company_logo_url,
  jobs.company_website_url,
  jobs.job_type,
  jobs.location,
  jobs.salary_min,
  jobs.salary_max,
  jobs.salary_currency,
  jobs.remote,
  jobs.skills,
  jobs.description,
  jobs.apply_url,
  jobs.job_url,
  jobs.seniority,
  jobs.category,
  jobs.is_active,
  jobs.first_seen_at,
  jobs.last_seen_at,
  jobs.synced_at
from public.jobs
join public.job_sources as sources on sources.slug = jobs.source_slug
where jobs.is_active = true;

select cron.schedule(
  'sync-all-jobs-every-6-hours',
  '47 */6 * * *',
  $$
    select net.http_post(
      url := 'https://vxyharefikvmssmzzexe.supabase.co/functions/v1/sync-all',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := jsonb_build_object('reason', 'scheduled-cron')
    ) as request_id;
  $$
);

select cron.schedule(
  'sync-high-quality-jobs-every-12-hours',
  '0 */12 * * *',
  $$
    select net.http_post(
      url := 'https://vxyharefikvmssmzzexe.supabase.co/functions/v1/sync-all',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := jsonb_build_object('targets', 'high-quality', 'reason', 'scheduled-cron')
    ) as request_id;
  $$
);
