-- =============================================================================
-- 0002_rls.sql — Row Level Security (authoritative authorization boundary)
-- Pattern: hq_admin sees all; country_manager scoped to own country via site.
-- Deny-by-default: RLS enabled on every table, no permissive fallback.
-- Source: finalize.md Part E
-- =============================================================================

-- ---- Helper functions (SECURITY DEFINER, stable) ----------------------------
create or replace function current_role_is_hq()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from profiles
    where user_id = auth.uid() and role = 'hq_admin'
  );
$$;

create or replace function current_country()
returns country_code
language sql stable security definer set search_path = public
as $$
  select country_code from profiles where user_id = auth.uid();
$$;

-- Country of a site, for child-table scoping.
create or replace function site_country(p_site_id uuid)
returns country_code
language sql stable security definer set search_path = public
as $$
  select country_code from sites where id = p_site_id;
$$;

-- ---- Enable RLS on all tables -----------------------------------------------
alter table profiles         enable row level security;
alter table country_settings enable row level security;
alter table sites            enable row level security;
alter table isp_circuits     enable row level security;
alter table network_devices  enable row level security;
alter table ip_schemes       enable row level security;
alter table vlans            enable row level security;
alter table vpn_links        enable row level security;
alter table cctv_recorders   enable row level security;
alter table cctv_cameras     enable row level security;
alter table maintenance_logs enable row level security;
alter table audit_log        enable row level security;

-- ---- profiles ---------------------------------------------------------------
-- A user reads their own profile; HQ admins read/manage all profiles.
create policy profiles_select_self on profiles for select
  using (user_id = auth.uid() or current_role_is_hq());
create policy profiles_hq_write on profiles for all
  using (current_role_is_hq()) with check (current_role_is_hq());

-- ---- country_settings -------------------------------------------------------
-- Everyone authenticated may read; only HQ admins may change.
create policy country_settings_select on country_settings for select
  using (auth.uid() is not null);
create policy country_settings_hq_write on country_settings for all
  using (current_role_is_hq()) with check (current_role_is_hq());

-- ---- sites ------------------------------------------------------------------
create policy sites_select on sites for select
  using (current_role_is_hq() or country_code = current_country());
create policy sites_write on sites for all
  using (current_role_is_hq() or country_code = current_country())
  with check (current_role_is_hq() or country_code = current_country());

-- ---- child tables scoped via parent site ------------------------------------
-- Reusable predicate: the row's site is visible to the caller.
--   exists (select 1 from sites s where s.id = <fk>
--     and (current_role_is_hq() or s.country_code = current_country()))

do $$
declare t text;
begin
  foreach t in array array[
    'isp_circuits','network_devices','ip_schemes','vlans','vpn_links','cctv_recorders'
  ] loop
    execute format($f$
      create policy %1$s_select on %1$s for select using (
        exists (select 1 from sites s where s.id = %1$s.site_id
          and (current_role_is_hq() or s.country_code = current_country())));
      create policy %1$s_write on %1$s for all using (
        exists (select 1 from sites s where s.id = %1$s.site_id
          and (current_role_is_hq() or s.country_code = current_country())))
      with check (
        exists (select 1 from sites s where s.id = %1$s.site_id
          and (current_role_is_hq() or s.country_code = current_country())));
    $f$, t);
  end loop;
end $$;

-- ---- cctv_cameras: scope via recorder -> site -------------------------------
create policy cctv_cameras_select on cctv_cameras for select using (
  exists (
    select 1 from cctv_recorders r
    join sites s on s.id = r.site_id
    where r.id = cctv_cameras.recorder_id
      and (current_role_is_hq() or s.country_code = current_country())
  )
);
create policy cctv_cameras_write on cctv_cameras for all using (
  exists (
    select 1 from cctv_recorders r
    join sites s on s.id = r.site_id
    where r.id = cctv_cameras.recorder_id
      and (current_role_is_hq() or s.country_code = current_country())
  )
) with check (
  exists (
    select 1 from cctv_recorders r
    join sites s on s.id = r.site_id
    where r.id = cctv_cameras.recorder_id
      and (current_role_is_hq() or s.country_code = current_country())
  )
);

-- ---- maintenance_logs: readable/writable when caller can see the target -----
-- Visibility resolved dynamically against the polymorphic target.
create or replace function can_access_maintenance_target(p_table text, p_id uuid)
returns boolean
language plpgsql stable security definer set search_path = public
as $$
declare v_country country_code;
begin
  if current_role_is_hq() then
    return true;
  end if;
  if p_table = 'network_devices' then
    select s.country_code into v_country
      from network_devices d join sites s on s.id = d.site_id where d.id = p_id;
  elsif p_table = 'cctv_recorders' then
    select s.country_code into v_country
      from cctv_recorders r join sites s on s.id = r.site_id where r.id = p_id;
  elsif p_table = 'cctv_cameras' then
    select s.country_code into v_country
      from cctv_cameras c
      join cctv_recorders r on r.id = c.recorder_id
      join sites s on s.id = r.site_id where c.id = p_id;
  else
    return false;
  end if;
  return v_country = current_country();
end;
$$;

create policy maintenance_logs_select on maintenance_logs for select
  using (can_access_maintenance_target(target_table, target_id));
create policy maintenance_logs_write on maintenance_logs for all
  using (can_access_maintenance_target(target_table, target_id))
  with check (can_access_maintenance_target(target_table, target_id));

-- ---- audit_log: HQ read only; no insert/update/delete policies (immutable) --
-- Writes happen via SECURITY DEFINER trigger (0003), which bypasses RLS.
create policy audit_log_hq_select on audit_log for select
  using (current_role_is_hq());
