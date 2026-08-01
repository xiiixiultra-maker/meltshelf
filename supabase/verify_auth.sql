-- verify_auth.sql — prove the gate, do not assume it.
--
-- Run after any migration that touches profiles, waitlist, or grants.
-- Every row must read PASS. Safe to run any time: it only reads catalogs.
--
-- THE CATALOG TRAP THIS FILE EXISTS TO AVOID
-- The first version of this check asked role_table_grants whether anon could
-- insert into waitlist, got nothing, and reported a leak-shaped FAILURE that
-- was not real. The grant is `insert (email)`, a COLUMN grant, and column
-- grants do not appear in role_table_grants at all. Ask column_privileges.
--
-- Which is the same distinction the whole design turns on: RLS picks rows,
-- grants pick columns, and a check that confuses them is worse than none
-- because it fails in the reassuring direction.
with cp as (
  select grantee, table_name, column_name, privilege_type
    from information_schema.column_privileges
   where table_schema = 'public' and grantee in ('anon', 'authenticated')
)
select * from (values
 ('RLS on profiles', (select case when relrowsecurity then 'PASS' else 'FAIL' end
    from pg_class where relname='profiles' and relnamespace='public'::regnamespace)),
 ('RLS on waitlist', (select case when relrowsecurity then 'PASS' else 'FAIL' end
    from pg_class where relname='waitlist' and relnamespace='public'::regnamespace)),
 ('member writes handle + display_name only',
   (select case when count(*)=2 then 'PASS' else 'FAIL ('||count(*)||')' end from cp
     where table_name='profiles' and privilege_type='UPDATE' and grantee='authenticated')),
 ('member CANNOT write approved / is_admin / premium',
   (select case when count(*)=0 then 'PASS' else 'FAIL -- ESCALATION' end from cp
     where table_name='profiles' and privilege_type='UPDATE' and grantee='authenticated'
       and column_name in ('approved','is_admin','premium'))),
 ('member CAN read own approved state',
   (select case when count(*)=1 then 'PASS' else 'FAIL' end from cp
     where table_name='profiles' and privilege_type='SELECT' and grantee='authenticated'
       and column_name='approved')),
 ('anon CAN insert waitlist.email',
   (select case when count(*)=1 then 'PASS' else 'FAIL' end from cp
     where table_name='waitlist' and privilege_type='INSERT' and grantee='anon'
       and column_name='email')),
 ('anon CANNOT read waitlist',
   (select case when count(*)=0 then 'PASS' else 'FAIL -- LEAK' end from cp
     where table_name='waitlist' and privilege_type='SELECT' and grantee='anon')),
 ('anon CANNOT read profiles',
   (select case when count(*)=0 then 'PASS' else 'FAIL -- LEAK' end from cp
     where table_name='profiles' and privilege_type='SELECT' and grantee='anon')),
 ('anon CANNOT write profiles',
   (select case when count(*)=0 then 'PASS' else 'FAIL -- LEAK' end from cp
     where table_name='profiles' and privilege_type in ('INSERT','UPDATE') and grantee='anon')),
 ('policies', (select 'PASS ('||count(*)||')' from pg_policies where schemaname='public')),
 ('functions security definer',
   (select case when count(*)=7 then 'PASS (7/7)' else 'FAIL ('||count(*)||'/7)' end
      from pg_proc p join pg_namespace n on n.oid=p.pronamespace
     where n.nspname='public' and p.prosecdef and p.proname in
       ('is_admin','is_approved','approve_member','revoke_member','claim_handle',
        'handle_available','handle_new_user')))
) as v(property, verdict);
