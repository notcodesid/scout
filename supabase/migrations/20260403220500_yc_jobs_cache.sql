create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

create table if not exists public.yc_job_categories (
  slug text primary key,
  label text not null,
  path text not null,
  sort_order integer not null default 0,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table if not exists public.yc_jobs (
  id text primary key,
  title text not null,
  job_type text not null,
  location text not null,
  role_type text not null,
  company_name text not null,
  company_slug text not null,
  company_batch text not null default '',
  company_one_liner text not null default '',
  company_logo_url text,
  company_last_active_at text,
  apply_url text not null,
  job_url text not null,
  is_active boolean not null default true,
  first_seen_at timestamp with time zone not null default now(),
  last_seen_at timestamp with time zone not null default now(),
  synced_at timestamp with time zone not null default now()
);

create table if not exists public.yc_job_category_memberships (
  job_id text not null references public.yc_jobs(id) on delete cascade,
  category_slug text not null references public.yc_job_categories(slug) on delete cascade,
  rank integer not null,
  source_url text not null,
  is_active boolean not null default true,
  first_seen_at timestamp with time zone not null default now(),
  last_seen_at timestamp with time zone not null default now(),
  synced_at timestamp with time zone not null default now(),
  primary key (job_id, category_slug)
);

create table if not exists public.yc_job_sync_state (
  sync_key text primary key,
  status text not null default 'idle' check (status in ('idle', 'running', 'error')),
  stale_after_minutes integer not null default 360,
  last_attempt_at timestamp with time zone,
  current_started_at timestamp with time zone,
  last_success_at timestamp with time zone,
  last_completed_at timestamp with time zone,
  last_duration_ms integer,
  total_active_jobs integer not null default 0,
  total_active_memberships integer not null default 0,
  total_categories integer not null default 0,
  last_reason text,
  last_error text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create index if not exists idx_yc_jobs_is_active on public.yc_jobs (is_active);
create index if not exists idx_yc_jobs_company_slug on public.yc_jobs (company_slug);
create index if not exists idx_yc_jobs_last_seen_at on public.yc_jobs (last_seen_at desc);
create index if not exists idx_yc_job_memberships_category_rank on public.yc_job_category_memberships (category_slug, is_active, rank);
create index if not exists idx_yc_job_memberships_last_seen_at on public.yc_job_category_memberships (last_seen_at desc);

alter table public.yc_job_categories enable row level security;
alter table public.yc_jobs enable row level security;
alter table public.yc_job_category_memberships enable row level security;
alter table public.yc_job_sync_state enable row level security;

drop policy if exists "YC job categories are publicly readable" on public.yc_job_categories;
create policy "YC job categories are publicly readable"
on public.yc_job_categories
for select
using (true);

drop policy if exists "YC jobs are publicly readable" on public.yc_jobs;
create policy "YC jobs are publicly readable"
on public.yc_jobs
for select
using (true);

drop policy if exists "YC job memberships are publicly readable" on public.yc_job_category_memberships;
create policy "YC job memberships are publicly readable"
on public.yc_job_category_memberships
for select
using (true);

drop policy if exists "YC job sync state is publicly readable" on public.yc_job_sync_state;
create policy "YC job sync state is publicly readable"
on public.yc_job_sync_state
for select
using (true);

create or replace function public.finalize_yc_job_sync(p_seen_at timestamp with time zone)
returns table (
  deactivated_jobs integer,
  deactivated_memberships integer,
  active_jobs integer,
  active_memberships integer
)
language plpgsql
as $$
declare
  v_deactivated_memberships integer := 0;
  v_deactivated_jobs integer := 0;
begin
  update public.yc_job_category_memberships
  set is_active = false
  where is_active = true
    and last_seen_at < p_seen_at;

  get diagnostics v_deactivated_memberships = row_count;

  update public.yc_jobs
  set is_active = false
  where is_active = true
    and last_seen_at < p_seen_at;

  get diagnostics v_deactivated_jobs = row_count;

  update public.yc_jobs as jobs
  set is_active = false
  where jobs.is_active = true
    and not exists (
      select 1
      from public.yc_job_category_memberships as memberships
      where memberships.job_id = jobs.id
        and memberships.is_active = true
    );

  return query
  select
    v_deactivated_jobs,
    v_deactivated_memberships,
    (select count(*)::integer from public.yc_jobs where is_active = true),
    (select count(*)::integer from public.yc_job_category_memberships where is_active = true);
end;
$$;

create or replace view public.yc_job_listings as
select
  memberships.category_slug,
  categories.label as category_label,
  categories.path as category_path,
  categories.sort_order as category_sort_order,
  memberships.rank,
  jobs.id,
  jobs.title,
  jobs.job_type,
  jobs.location,
  jobs.role_type,
  jobs.company_name,
  jobs.company_slug,
  jobs.company_batch,
  jobs.company_one_liner,
  jobs.company_logo_url,
  jobs.company_last_active_at,
  jobs.apply_url,
  jobs.job_url,
  jobs.last_seen_at,
  jobs.synced_at
from public.yc_job_category_memberships as memberships
join public.yc_job_categories as categories
  on categories.slug = memberships.category_slug
join public.yc_jobs as jobs
  on jobs.id = memberships.job_id
where memberships.is_active = true
  and jobs.is_active = true;

insert into public.yc_job_categories (slug, label, path, sort_order)
values
  ('software-engineer', 'Engineering', '/jobs', 0),
  ('designer', 'Design', '/jobs/l/designer', 1),
  ('recruiting', 'Recruiting', '/jobs/l/recruiting', 2),
  ('science', 'Science', '/jobs/l/science', 3),
  ('product-manager', 'Product', '/jobs/l/product-manager', 4),
  ('operations', 'Operations', '/jobs/l/operations', 5),
  ('sales-manager', 'Sales', '/jobs/l/sales-manager', 6),
  ('marketing', 'Marketing', '/jobs/l/marketing', 7),
  ('legal', 'Legal', '/jobs/l/legal', 8),
  ('finance', 'Finance', '/jobs/l/finance', 9)
on conflict (slug) do update
set
  label = excluded.label,
  path = excluded.path,
  sort_order = excluded.sort_order,
  updated_at = now();

insert into public.yc_job_sync_state (sync_key, status, stale_after_minutes, total_categories, last_reason)
values ('yc_jobs', 'idle', 360, 10, 'initial-setup')
on conflict (sync_key) do update
set
  stale_after_minutes = excluded.stale_after_minutes,
  total_categories = excluded.total_categories,
  updated_at = now();

select cron.schedule(
  'sync-yc-jobs-every-6-hours',
  '17 */6 * * *',
  $$
    select net.http_post(
      url := 'https://vxyharefikvmssmzzexe.supabase.co/functions/v1/sync-yc-jobs',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := jsonb_build_object('reason', 'scheduled-cron')
    ) as request_id;
  $$
);
