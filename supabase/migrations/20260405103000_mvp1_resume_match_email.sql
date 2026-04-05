alter table public.engineer_submissions
add column if not exists extracted_profile jsonb,
add column if not exists profile_source text default 'resume_llm';

alter table public.generated_emails
add column if not exists target_type text default 'startup',
add column if not exists target_metadata jsonb,
add column if not exists fit_summary text,
add column if not exists subject_options text[] default '{}';

update public.generated_emails
set target_type = 'startup'
where target_type is null;

alter table public.generated_emails
alter column target_type set default 'startup';

alter table public.generated_emails
drop constraint if exists generated_emails_target_type_check;

alter table public.generated_emails
add constraint generated_emails_target_type_check
check (target_type in ('job', 'startup'));
