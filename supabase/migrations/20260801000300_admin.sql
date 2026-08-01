-- 003_admin.sql — how an admin sees who is asking to get in.
--
-- Run after 002_entries.sql.
--
-- ─────────────────────────────────────────────────────────────────────────
-- THE PROBLEM THIS SOLVES, AND THE OBVIOUS FIX THAT WAS WRONG
--
-- A brand new account has no handle yet: the handle is claimed during
-- onboarding, which happens AFTER approval. So the admin screen was being
-- asked to approve rows that identified nobody. The only identifying thing an
-- account has at that moment is its email, and email lives in auth.users,
-- which PostgREST does not expose.
--
-- The obvious fix is to copy email onto profiles and let the admin read it.
-- That is a leak. `profiles` carries a policy letting approved members read
-- each other's rows, because Discover needs handles and display names. RLS is
-- ROW level: adding an email column to a row that other members can read
-- hands every member every member's email address. The policy would not stop
-- it, and nothing in the schema would look wrong.
--
-- So email never lands on profiles at all. It is read through this function,
-- which checks the admin role itself and joins auth.users as its owner. The
-- email is returned to exactly one kind of caller and stored nowhere new.
-- ─────────────────────────────────────────────────────────────────────────

create or replace function admin_list_accounts()
returns table (
  id           uuid,
  email        text,
  handle       text,
  display_name text,
  approved     boolean,
  is_admin     boolean,
  premium      boolean,
  created_at   timestamptz,
  approved_at  timestamptz,
  entry_count  bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'not an admin' using errcode = '42501';
  end if;
  return query
    select p.id,
           u.email::text,
           p.handle,
           p.display_name,
           p.approved,
           p.is_admin,
           p.premium,
           p.created_at,
           p.approved_at,
           (select count(*) from entries e where e.user_id = p.id)
      from profiles p
      join auth.users u on u.id = p.id
     order by p.approved asc, p.created_at desc;   -- pending first, newest first
end;
$$;

revoke all on function admin_list_accounts() from public, anon;
grant execute on function admin_list_accounts() to authenticated;

comment on function admin_list_accounts is
  'Admin-only account list including email. Email is deliberately NOT a column '
  'on profiles: approved members can read each other''s profile rows, and RLS '
  'cannot filter columns, so a column there would publish every address.';
