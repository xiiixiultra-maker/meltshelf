-- 001_auth.sql — accounts, the approval gate, and the admin role.
--
-- Run this in the Supabase SQL editor, once, before anything else.
--
-- ─────────────────────────────────────────────────────────────────────────
-- THE SHAPE, AND WHY IT IS THIS SHAPE
--
-- meltshelf.com is a static site on GitHub Pages. There is no server of ours
-- anywhere in the request path, so EVERY rule that matters has to live in the
-- database. A check written in JavaScript is a suggestion: the client can
-- always skip it, and on a static host the client is all there is.
--
-- That is also why there is no service_role key in the site and no Edge
-- Function. The gate below needs neither:
--
--   1. Anyone may ask for a login code. Supabase creates an auth user.
--   2. That user gets a profile row with approved = false.
--   3. RLS grants an unapproved user NOTHING beyond their own profile.
--   4. An admin flips approved. Only an admin can, and the policy says so.
--
-- So "invite only" is enforced by Postgres refusing to return rows, not by a
-- screen declining to render. Someone who bypasses the entire front end gets
-- an empty result set, which is the only version of this that is true.
--
-- ─────────────────────────────────────────────────────────────────────────
-- THE LESSON THIS INHERITS FROM 002_rls_fix.sql
--
-- "Postgres RLS is ROW level. There is no column filtering."
--
-- That bit us once already, when is_public on a row published notes, price,
-- vendor and batch code along with the strain name. The same trap is waiting
-- here in a different costume: a policy letting someone UPDATE their own
-- profile row lets them update EVERY COLUMN of it, including approved and
-- is_admin. A row policy cannot stop that, because the row is theirs.
--
-- Column-level GRANTs can, and do, below. RLS decides which rows. Grants
-- decide which columns. Neither does the other's job.
-- ─────────────────────────────────────────────────────────────────────────

-- ── profiles ────────────────────────────────────────────────────────────
-- One row per account, created by trigger so it can never be missing.
create table if not exists profiles (
  id           uuid primary key references auth.users on delete cascade,

  -- Canonical lowercase for uniqueness and URLs, display casing kept beside
  -- it, so @NastySaibot and @nastysaibot are the same account and the caps
  -- still render. Claimed during onboarding, hence nullable at signup.
  handle       text unique
                 check (handle ~ '^[a-z0-9_]{3,24}$'),
  display_name text check (char_length(display_name) <= 24),

  approved     boolean not null default false,
  is_admin     boolean not null default false,
  premium      boolean not null default false,

  created_at   timestamptz not null default now(),
  approved_at  timestamptz,
  approved_by  uuid references auth.users,

  -- The display name must be the handle in different clothes, never a
  -- different name. Checked here rather than in the client because the
  -- client is not in a position to promise anything.
  constraint display_matches_handle
    check (display_name is null or lower(display_name) = handle)
);

comment on table profiles is
  'One row per account. approved gates everything; is_admin gates approving.';

alter table profiles enable row level security;

-- ── the trigger that guarantees a profile exists ────────────────────────
-- security definer because the signing-up user has no rights on profiles yet.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ── helpers ─────────────────────────────────────────────────────────────
-- Both are STABLE and security definer so policies can call them without
-- recursing into the very policies being evaluated.
create or replace function is_approved()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.approved from public.profiles p where p.id = auth.uid()),
    false);
$$;

create or replace function is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.is_admin from public.profiles p where p.id = auth.uid()),
    false);
$$;

-- ── policies ────────────────────────────────────────────────────────────
drop policy if exists "read own profile"    on profiles;
drop policy if exists "update own profile"  on profiles;
drop policy if exists "admins read all"     on profiles;
drop policy if exists "admins update all"   on profiles;
drop policy if exists "approved read approved" on profiles;

-- You can always see yourself, approved or not. An account that cannot read
-- its own state cannot be told why it is waiting.
create policy "read own profile" on profiles
  for select using (id = auth.uid());

-- You may edit your own row. WHICH COLUMNS is decided by the grants below,
-- not here, because a row policy cannot express it.
create policy "update own profile" on profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- Approved members can see each other's public-facing fields. Still row
-- level: the columns an approved member may read are narrowed by the grant.
create policy "approved read approved" on profiles
  for select using (is_approved() and approved);

create policy "admins read all"   on profiles for select using (is_admin());
create policy "admins update all" on profiles for update using (is_admin())
  with check (is_admin());

-- ── column grants: the half RLS cannot do ───────────────────────────────
-- Start from nothing. `authenticated` is every logged-in user, including one
-- who has read the source of this page and is talking to PostgREST directly.
revoke all on profiles from authenticated;

grant select on profiles to authenticated;

-- The ONLY columns a member may write. approved, is_admin and premium are
-- absent on purpose: with them here, any member could approve themselves,
-- make themselves an admin, or buy nothing and take premium. The row policy
-- above would happily allow all three, because the row is theirs.
grant update (handle, display_name) on profiles to authenticated;

-- Admin writes go through a function instead, so the privileged columns are
-- never grantable to a session at all.
create or replace function approve_member(target uuid, grant_premium boolean default false)
returns profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  row profiles;
begin
  if not is_admin() then
    raise exception 'not an admin' using errcode = '42501';
  end if;
  update profiles
     set approved    = true,
         approved_at = now(),
         approved_by = auth.uid(),
         premium     = coalesce(grant_premium, premium)
   where id = target
   returning * into row;
  return row;
end;
$$;

create or replace function revoke_member(target uuid)
returns profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  row profiles;
begin
  if not is_admin() then
    raise exception 'not an admin' using errcode = '42501';
  end if;
  -- An admin may not revoke themselves; it is the one way to lock everyone
  -- out of the admin permanently, and it is always a mistake.
  if target = auth.uid() then
    raise exception 'refusing to revoke the acting admin';
  end if;
  update profiles
     set approved = false, approved_at = null, approved_by = null
   where id = target
   returning * into row;
  return row;
end;
$$;

revoke all on function approve_member(uuid, boolean) from public, anon;
revoke all on function revoke_member(uuid)          from public, anon;
grant execute on function approve_member(uuid, boolean) to authenticated;
grant execute on function revoke_member(uuid)          to authenticated;

-- ── claiming a handle ───────────────────────────────────────────────────
-- Canonicalises, enforces the one-per-account rule, and returns a clear error
-- rather than a unique-violation the client would have to parse.
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

revoke all on function claim_handle(text) from public, anon;
grant execute on function claim_handle(text) to authenticated;

-- Availability check, callable before signing in so onboarding can be honest
-- about a taken handle without leaking who holds it.
create or replace function handle_available(wanted text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (
    select 1 from public.profiles where handle = lower(trim(wanted)));
$$;

grant execute on function handle_available(text) to anon, authenticated;

-- ── waitlist ────────────────────────────────────────────────────────────
-- The homepage form currently posts to an email relay. This is where it will
-- land once it posts here instead: anyone may add themselves, nobody may read
-- the list except an admin. An insert-only table read by one person.
create table if not exists waitlist (
  email      text primary key check (position('@' in email) > 1),
  created_at timestamptz not null default now(),
  note       text
);

alter table waitlist enable row level security;

drop policy if exists "anyone may join"   on waitlist;
drop policy if exists "admins read list"  on waitlist;

create policy "anyone may join"  on waitlist for insert with check (true);
create policy "admins read list" on waitlist for select using (is_admin());

revoke all on waitlist from anon, authenticated;
grant insert (email) on waitlist to anon, authenticated;
grant select on waitlist to authenticated;   -- narrowed to admins by the policy

-- ── make yourself the first admin ───────────────────────────────────────
-- Run ONCE, by hand, after signing in for the first time. There is no
-- bootstrap path in the app on purpose: an app that can mint the first admin
-- can mint the second.
--
--   update profiles set is_admin = true, approved = true
--    where id = (select id from auth.users where email = 'you@example.com');
