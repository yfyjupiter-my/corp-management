-- =============================================================================
-- 0005_locale.sql — per-user UI language (TASKS.md Phase 13B)
-- Adds profiles.locale plus a column-scoped writer.
--
-- SECURITY: there is deliberately NO self-update RLS policy on `profiles`.
-- RLS cannot restrict *which columns* an update touches, so a policy permissive
-- enough to let a user set their own locale would also let a country_manager
-- run `update profiles set role = 'hq_admin' where user_id = auth.uid()` —
-- and `role` is exactly what current_role_is_hq() reads to authorize every
-- other table. The security definer function below is the only write path:
-- it updates one column, for auth.uid() only.
-- =============================================================================

alter table profiles
  add column if not exists locale text
  check (locale is null or locale in ('en', 'zh-TW'));

comment on column profiles.locale is
  'Preferred UI language. NULL = follow the app default (en). Written only via set_my_locale().';

-- ---- Column-scoped writer ---------------------------------------------------
-- security definer so it bypasses the (absent) profiles update policy, but it
-- can only ever touch `locale`, and only for the calling user's own row.
create or replace function set_my_locale(p_locale text)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
  -- Re-validate independently of the column constraint: fail loudly rather
  -- than write, and never interpolate the input anywhere.
  if p_locale is null or p_locale not in ('en', 'zh-TW') then
    raise exception 'invalid locale: %', p_locale using errcode = '22023';
  end if;

  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  update profiles
     set locale = p_locale
   where user_id = auth.uid();
end;
$$;

-- Only signed-in users may call it; anon and public get nothing.
revoke all on function set_my_locale(text) from public, anon;
grant execute on function set_my_locale(text) to authenticated;

comment on function set_my_locale(text) is
  'Sets profiles.locale for the calling user only. The single write path for locale — profiles has no self-update RLS policy by design (column-level escalation).';
