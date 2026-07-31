with seeded_sources as (
  select id
  from public.ats_job_sources
  where metadata ->> 'seed' = 'starter'
)
delete from public.public_jobs
where source_id in (select id from seeded_sources);

delete from public.ats_job_sources
where metadata ->> 'seed' = 'starter';

update public.public_job_sync_state
set total_active_jobs = (
      select count(*)::integer
      from public.public_jobs
      where is_active = true
    ),
    total_sources = (
      select count(*)::integer
      from public.ats_job_sources
      where is_active = true
    ),
    updated_at = now()
where sync_key = 'public_jobs';
