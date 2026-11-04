-- NU Notes database schema
-- This schema is used only to enforce a shared daily AI question limit.
-- Older versions also created student_checkins. This script does not create,
-- read, or delete that table or any records that may already be stored there.

create table if not exists public.ai_daily_usage (
  usage_date date primary key,
  request_count integer not null default 0 check (request_count >= 0)
);

alter table public.ai_daily_usage enable row level security;
revoke all on table public.ai_daily_usage from anon, authenticated;

create or replace function public.claim_ai_request(p_daily_limit integer)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  claimed_count integer;
  today_utc date := (now() at time zone 'UTC')::date;
begin
  insert into public.ai_daily_usage (usage_date, request_count)
  values (today_utc, 1)
  on conflict (usage_date) do update
    set request_count = public.ai_daily_usage.request_count + 1
    where public.ai_daily_usage.request_count < greatest(1, least(p_daily_limit, 10000))
  returning request_count into claimed_count;

  return claimed_count is not null;
end;
$$;

revoke all on function public.claim_ai_request(integer) from public, anon, authenticated;
grant execute on function public.claim_ai_request(integer) to service_role;
