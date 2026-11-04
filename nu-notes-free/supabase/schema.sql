-- NU Notes connection schema
-- Run this once in the Supabase SQL Editor for a new project.

create table if not exists public.student_checkins (
  usn text primary key check (usn ~ '^[A-Z0-9-]{3,24}$'),
  name text not null check (char_length(name) between 2 and 80),
  login_count bigint not null default 1 check (login_count >= 1),
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now()
);

create table if not exists public.ai_daily_usage (
  usage_date date primary key,
  request_count integer not null default 0 check (request_count >= 0)
);

create index if not exists student_checkins_rank_idx
  on public.student_checkins (login_count desc, last_seen desc);

alter table public.student_checkins enable row level security;
alter table public.ai_daily_usage enable row level security;
revoke all on table public.student_checkins from anon, authenticated;
revoke all on table public.ai_daily_usage from anon, authenticated;

create or replace function public.record_checkin(p_usn text, p_name text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  normalized_usn text := upper(regexp_replace(coalesce(p_usn, ''), '\s', '', 'g'));
  normalized_name text := regexp_replace(btrim(coalesce(p_name, '')), '\s+', ' ', 'g');
begin
  if normalized_usn !~ '^[A-Z0-9-]{3,24}$' then
    raise exception 'Invalid USN';
  end if;
  if char_length(normalized_name) < 2 or char_length(normalized_name) > 80 then
    raise exception 'Invalid name';
  end if;

  insert into public.student_checkins (usn, name, login_count, first_seen, last_seen)
  values (normalized_usn, normalized_name, 1, now(), now())
  on conflict (usn) do update
    set name = excluded.name,
        login_count = public.student_checkins.login_count + 1,
        last_seen = now();

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.admin_checkin_stats()
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  checkin_total bigint;
  student_total bigint;
  student_rows jsonb;
begin
  select coalesce(sum(login_count), 0), count(*)
    into checkin_total, student_total
    from public.student_checkins;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'name', ranked.name,
      'usn', ranked.usn,
      'login_count', ranked.login_count,
      'last_seen', ranked.last_seen
    ) order by ranked.login_count desc, ranked.last_seen desc
  ), '[]'::jsonb)
    into student_rows
    from (
      select name, usn, login_count, last_seen
        from public.student_checkins
        order by login_count desc, last_seen desc
        limit 200
    ) as ranked;

  return jsonb_build_object(
    'total_checkins', checkin_total,
    'unique_students', student_total,
    'students', student_rows
  );
end;
$$;

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

revoke all on function public.record_checkin(text, text) from public, anon, authenticated;
revoke all on function public.admin_checkin_stats() from public, anon, authenticated;
revoke all on function public.claim_ai_request(integer) from public, anon, authenticated;
grant execute on function public.record_checkin(text, text) to service_role;
grant execute on function public.admin_checkin_stats() to service_role;
grant execute on function public.claim_ai_request(integer) to service_role;
