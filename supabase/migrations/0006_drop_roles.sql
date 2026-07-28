-- =============================================================================
-- 0006_drop_roles.sql — remove the role system entirely
--
-- Replaces the two-role model (hq_admin / country_manager) from 0002_rls.sql
-- with a single flat tier: **any authenticated user may CRUD everything**.
--
-- ⚠️ SECURITY NOTE — read before extending this schema.
-- RLS stays ENABLED on every table, but after this migration it is only an
-- AUTHENTICATION boundary (anon gets nothing), no longer an AUTHORIZATION one.
-- Cross-country isolation is gone: every signed-in user reads and writes all
-- four countries' data and the audit log. That is the requested model. If
-- per-country scoping is ever wanted again, it has to be rebuilt here — the
-- application layer does not enforce it and must never be relied on to.
-- =============================================================================

-- ---- drop every role-dependent policy ---------------------------------------
drop policy if exists profiles_select_self         on profiles;
drop policy if exists profiles_hq_write            on profiles;
drop policy if exists country_settings_select      on country_settings;
drop policy if exists country_settings_hq_write    on country_settings;
drop policy if exists sites_select                 on sites;
drop policy if exists sites_write                  on sites;
drop policy if exists cctv_cameras_select          on cctv_cameras;
drop policy if exists cctv_cameras_write           on cctv_cameras;
drop policy if exists maintenance_logs_select      on maintenance_logs;
drop policy if exists maintenance_logs_write       on maintenance_logs;
drop policy if exists audit_log_hq_select          on audit_log;

do $$
declare t text;
begin
  foreach t in array array[
    'isp_circuits','network_devices','ip_schemes','vlans','vpn_links','cctv_recorders'
  ] loop
    execute format('drop policy if exists %1$s_select on %1$s;', t);
    execute format('drop policy if exists %1$s_write  on %1$s;', t);
  end loop;
end $$;

-- ---- drop the role helper functions -----------------------------------------
-- Nothing may reference these after the policy drops above.
drop function if exists current_role_is_hq();
drop function if exists current_country();
drop function if exists can_access_maintenance_target(text, uuid);
-- `site_country(uuid)` is kept: it is role-free and may be useful for reporting.

-- ---- flat policies: authenticated = full CRUD -------------------------------
-- auth.uid() is null for the anon key, so deny-by-default still holds for
-- unauthenticated callers.
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','country_settings','sites','isp_circuits','network_devices',
    'ip_schemes','vlans','vpn_links','cctv_recorders','cctv_cameras',
    'maintenance_logs'
  ] loop
    execute format($f$
      create policy %1$s_authenticated_select on %1$s for select
        using (auth.uid() is not null);
      create policy %1$s_authenticated_write on %1$s for all
        using (auth.uid() is not null)
        with check (auth.uid() is not null);
    $f$, t);
  end loop;
end $$;

-- ℹ️ Knock-on for 0005_locale.sql: `profiles` now HAS a write policy, so its
-- header comment ("no self-update policy, because RLS cannot restrict columns
-- and a manager could set role='hq_admin'") describes a hazard that no longer
-- exists — there is no `role` column left to escalate into. `set_my_locale()`
-- keeps working and stays the app's write path, but it is no longer the *only*
-- one: a direct `update profiles set locale = …` now succeeds. That reverses
-- assertion 4 of the 13.34 security run. 0005 is left unedited as an applied
-- historical migration.

-- audit_log stays immutable: SELECT only, no insert/update/delete policy.
-- Writes continue to arrive through the SECURITY DEFINER trigger in 0003.
create policy audit_log_authenticated_select on audit_log for select
  using (auth.uid() is not null);

-- ---- drop the role columns and the enum -------------------------------------
-- `profiles` keeps user_id / full_name / locale / created_at.
-- `sites.country_code` is untouched — that is data (where a site is), not
-- authorization. Only the *profile's* country, which existed solely to scope
-- RLS, goes away.
alter table profiles drop column if exists role;
alter table profiles drop column if exists country_code;

drop type if exists user_role;
