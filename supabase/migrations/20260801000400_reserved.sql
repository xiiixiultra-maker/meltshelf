-- 004_reserved.sql — handles nobody gets to claim.
--
-- Run after 003_admin.sql.
--
-- The mock onboarding screen had a reserved list. The database did not, so
-- wiring the screen to the database quietly REMOVED a rule: @meltshelf came
-- back available on the first live check. @admin and @support are the ones
-- that matter, because a handle is displayed beside a person's jars and
-- @support saying something in a comment reads as the product saying it.
--
-- In the table rather than in a constant, so adding one later is an insert
-- and not a migration.

create table if not exists reserved_handles (
  handle text primary key check (handle = lower(handle)),
  reason text
);

insert into reserved_handles (handle, reason) values
  ('meltshelf',  'the product'),
  ('melt',       'the product'),
  ('shelf',      'the product'),
  ('admin',      'reads as staff'),
  ('administrator', 'reads as staff'),
  ('support',    'reads as staff'),
  ('help',       'reads as staff'),
  ('staff',      'reads as staff'),
  ('team',       'reads as staff'),
  ('official',   'reads as staff'),
  ('mod',        'reads as staff'),
  ('moderator',  'reads as staff'),
  ('system',     'reads as staff'),
  ('security',   'reads as staff'),
  ('billing',    'invites a payment scam'),
  ('payments',   'invites a payment scam'),
  ('api',        'route collision'),
  ('www',        'route collision'),
  ('app',        'route collision'),
  ('discover',   'route collision'),
  ('capture',    'route collision'),
  ('studio',     'route collision'),
  ('login',      'route collision'),
  ('onboard',    'route collision'),
  ('waiting',    'route collision'),
  ('shelf_',     'route collision'),
  ('saibot',     'the author'),
  ('nastysaibot','the author')
on conflict (handle) do nothing;

alter table reserved_handles enable row level security;
-- Nobody reads this table directly. The two functions below consult it as
-- their owner, so the list is not a menu of names to go and squat.
revoke all on reserved_handles from anon, authenticated;

-- ── both entry points learn the rule ────────────────────────────────────
-- handle_available and claim_handle have to agree. If only the check knew,
-- the screen would say taken and the claim would succeed; if only the claim
-- knew, the screen would say available and then fail on submit. Same rule,
-- both doors.

create or replace function handle_available(wanted text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (select 1 from public.profiles
                      where handle = lower(trim(wanted)))
     and not exists (select 1 from public.reserved_handles
                      where handle = lower(trim(wanted)));
$$;

create or replace function claim_handle(wanted text)
returns profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  canon text := lower(trim(wanted));
  row   profiles;
begin
  if auth.uid() is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  if canon !~ '^[a-z0-9_]{3,24}$' then
    raise exception 'A handle is 3 to 24 characters, letters numbers and underscore.';
  end if;
  -- Reserved names are held FOR somebody, and an admin is who they are held
  -- for, so an admin may take one. Without this, reserving 'nastysaibot' to
  -- stop it being squatted would have locked its owner out of it.
  --
  -- The message is deliberately identical to a taken handle. Saying
  -- "reserved" tells a stranger a list exists and invites them to go and find
  -- the rest of it.
  if exists (select 1 from reserved_handles where handle = canon)
     and not is_admin() then
    raise exception 'That handle is taken.';
  end if;
  if exists (select 1 from profiles where handle = canon and id <> auth.uid()) then
    raise exception 'That handle is taken.';
  end if;
  update profiles
     set handle = canon, display_name = trim(wanted)
   where id = auth.uid()
   returning * into row;
  return row;
end;
$$;

grant execute on function handle_available(text) to anon, authenticated;
grant execute on function claim_handle(text) to authenticated;
revoke all on function claim_handle(text) from public, anon;
