insert into public.job_sources (slug, label, base_url, description, sort_order)
values
  ('linkedin', 'LinkedIn', 'https://www.linkedin.com/jobs', 'Professional-network job listings with high employer coverage', 9)
on conflict (slug) do update
set
  label = excluded.label,
  base_url = excluded.base_url,
  description = excluded.description,
  sort_order = excluded.sort_order,
  updated_at = now();

insert into public.job_sync_states (source_slug, status, stale_after_minutes, last_reason)
values
  ('linkedin', 'idle', 360, 'mvp1-alignment')
on conflict (source_slug) do update
set
  stale_after_minutes = excluded.stale_after_minutes,
  updated_at = now();

create or replace view public.canonical_job_listings as
with normalized as (
  select
    jobs.source_slug,
    sources.label as source_label,
    sources.base_url as source_base_url,
    sources.sort_order as source_sort_order,
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
    jobs.synced_at,
    nullif(
      regexp_replace(
        lower(regexp_replace(split_part(trim(jobs.apply_url), '?', 1), '/+$', '')),
        '^https?://(www\.)?',
        ''
      ),
      ''
    ) as normalized_apply_url,
    nullif(regexp_replace(lower(jobs.company_name), '[^a-z0-9]+', '', 'g'), '') as normalized_company_name,
    nullif(regexp_replace(lower(jobs.title), '[^a-z0-9]+', '', 'g'), '') as normalized_title,
    nullif(regexp_replace(lower(jobs.location), '[^a-z0-9]+', '', 'g'), '') as normalized_location
  from public.jobs
  join public.job_sources as sources on sources.slug = jobs.source_slug
  where jobs.is_active = true
    and sources.is_active = true
),
ranked as (
  select
    normalized.*,
    coalesce(
      normalized_apply_url,
      nullif(concat_ws('|', normalized_company_name, normalized_title, normalized_location), ''),
      concat_ws('|', source_slug, id)
    ) as canonical_job_key,
    row_number() over (
      partition by coalesce(
        normalized_apply_url,
        nullif(concat_ws('|', normalized_company_name, normalized_title, normalized_location), ''),
        concat_ws('|', source_slug, id)
      )
      order by last_seen_at desc, synced_at desc, source_sort_order asc, source_slug asc, id asc
    ) as canonical_rank
  from normalized
)
select
  source_slug,
  source_label,
  source_base_url,
  id,
  title,
  company_name,
  company_slug,
  company_one_liner,
  company_logo_url,
  company_website_url,
  job_type,
  location,
  salary_min,
  salary_max,
  salary_currency,
  remote,
  skills,
  description,
  apply_url,
  job_url,
  seniority,
  category,
  is_active,
  first_seen_at,
  last_seen_at,
  synced_at,
  canonical_job_key
from ranked
where canonical_rank = 1;

alter table public.generated_emails
add column if not exists target_id text,
add column if not exists company_name text;

update public.generated_emails
set
  target_id = coalesce(target_id, startup_id),
  company_name = coalesce(company_name, startup_name)
where target_id is null
   or company_name is null;

alter table public.generated_emails
alter column target_id set not null,
alter column company_name set not null,
alter column target_type set default 'job';

create index if not exists idx_generated_emails_target_id on public.generated_emails (target_id);

create or replace function public.sync_generated_email_target_fields()
returns trigger
language plpgsql
as $$
begin
  new.target_id := coalesce(nullif(new.target_id, ''), new.startup_id);
  new.company_name := coalesce(nullif(new.company_name, ''), new.startup_name);
  new.startup_id := coalesce(nullif(new.startup_id, ''), new.target_id);
  new.startup_name := coalesce(nullif(new.startup_name, ''), new.company_name);
  new.target_type := coalesce(new.target_type, 'job');
  return new;
end;
$$;

drop trigger if exists trg_sync_generated_email_target_fields on public.generated_emails;
create trigger trg_sync_generated_email_target_fields
before insert or update on public.generated_emails
for each row
execute function public.sync_generated_email_target_fields();

create table if not exists public.mvp1_flow_events (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid references public.engineer_submissions(id) on delete set null,
  event_type text not null check (event_type in ('profile_extract', 'job_match', 'email_generate')),
  status text not null check (status in ('success', 'failure')),
  fallback_used boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now()
);

create index if not exists idx_mvp1_flow_events_type_created_at
  on public.mvp1_flow_events (event_type, created_at desc);

create index if not exists idx_mvp1_flow_events_submission_id
  on public.mvp1_flow_events (submission_id);

alter table public.mvp1_flow_events enable row level security;
