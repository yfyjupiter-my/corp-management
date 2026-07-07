-- =============================================================================
-- 0001_init.sql — extensions, enums, core schema
-- Corp Management — SEA IT Infrastructure Registry
-- Source: prd.md §Data Model + finalize.md Parts B–D
-- =============================================================================

create extension if not exists pg_trgm;

-- ---- Enums ------------------------------------------------------------------
create type user_role    as enum ('hq_admin', 'country_manager');
create type country_code as enum ('VN', 'TH', 'ID', 'MY');
create type circuit_type as enum ('fiber', 'broadband', 'lte');
create type device_type  as enum ('router', 'firewall', 'switch', 'ap', 'other');
create type camera_type  as enum ('dome', 'bullet', 'ptz', 'other');
create type camera_status as enum ('active', 'faulty', 'offline');
create type vpn_status   as enum ('up', 'down', 'unknown');

-- ---- Profiles ---------------------------------------------------------------
-- One row per auth user. Role + country drive RLS. country_code is null for HQ.
create table profiles (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  full_name    text,
  role         user_role not null,
  country_code country_code,
  created_at   timestamptz not null default now(),
  constraint hq_has_no_country
    check (role <> 'hq_admin' or country_code is null),
  constraint manager_has_country
    check (role <> 'country_manager' or country_code is not null)
);

-- ---- Per-country settings (finalize.md Q1 + review cycle) --------------------
create table country_settings (
  country_code        country_code primary key,
  min_retention_days  int not null default 30,
  review_cycle_months int not null default 6
);

-- ---- Sites (root of all inventory) ------------------------------------------
create table sites (
  id            uuid primary key default gen_random_uuid(),
  country_code  country_code not null,
  name          text not null,
  address       text,
  timezone      text not null,           -- IANA, defaulted per country on create
  currency      char(3) not null,        -- ISO 4217; per-site (finalize.md Money)
  contact_name  text,
  contact_phone text,
  contact_email text,
  notes         text,
  archived_at   timestamptz,             -- soft delete
  created_by    uuid default auth.uid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  last_verified_at timestamptz
);
create index sites_country_idx on sites (country_code);
create index sites_name_trgm on sites using gin (name gin_trgm_ops);

-- ---- ISP circuits -----------------------------------------------------------
create table isp_circuits (
  id             uuid primary key default gen_random_uuid(),
  site_id        uuid not null references sites (id) on delete cascade,
  provider       text not null,
  circuit_id     text,
  bandwidth      text,
  type           circuit_type not null default 'fiber',
  static_ips     text[],
  contract_start date,
  contract_end   date,
  monthly_cost   numeric(12, 2),
  support_phone  text,
  notes          text,
  created_by     uuid default auth.uid(),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  last_verified_at timestamptz
);
create index isp_circuits_site_idx on isp_circuits (site_id);
create index isp_circuits_provider_trgm on isp_circuits using gin (provider gin_trgm_ops);
create index isp_circuits_circuit_trgm on isp_circuits using gin (circuit_id gin_trgm_ops);
create index isp_circuits_contract_end_idx on isp_circuits (contract_end);

-- ---- Network devices --------------------------------------------------------
create table network_devices (
  id             uuid primary key default gen_random_uuid(),
  site_id        uuid not null references sites (id) on delete cascade,
  device_type    device_type not null default 'router',
  brand          text,
  model          text,
  hostname       text,
  mgmt_ip        text,
  firmware       text,
  serial         text,
  install_date   date,
  warranty_end   date,
  credential_ref text,                    -- reference/URL ONLY — never a secret
  attributes     jsonb not null default '{}'::jsonb,
  notes          text,
  created_by     uuid default auth.uid(),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  last_verified_at timestamptz
);
create index network_devices_site_idx on network_devices (site_id);
create index network_devices_hostname_trgm on network_devices using gin (hostname gin_trgm_ops);
create index network_devices_mgmt_ip_trgm on network_devices using gin (mgmt_ip gin_trgm_ops);
create index network_devices_warranty_idx on network_devices (warranty_end);

-- ---- IP schemes + VLANs -----------------------------------------------------
create table ip_schemes (
  id         uuid primary key default gen_random_uuid(),
  site_id    uuid not null references sites (id) on delete cascade,
  subnet     text not null,
  gateway    text,
  dns        text,
  dhcp_range text,
  notes      text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_verified_at timestamptz
);
create index ip_schemes_site_idx on ip_schemes (site_id);

create table vlans (
  id      uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites (id) on delete cascade,
  vlan_id int not null,
  name    text,
  subnet  text,
  purpose text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_verified_at timestamptz
);
create index vlans_site_idx on vlans (site_id);

-- ---- VPN / WAN links --------------------------------------------------------
create table vpn_links (
  id           uuid primary key default gen_random_uuid(),
  site_id      uuid not null references sites (id) on delete cascade,
  peer         text,                       -- free-text peer (HQ / external)
  peer_site_id uuid references sites (id),  -- set when peer is another site
  tunnel_type  text,
  status       vpn_status not null default 'unknown',
  notes        text,
  created_by   uuid default auth.uid(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  last_verified_at timestamptz
);
create index vpn_links_site_idx on vpn_links (site_id);

-- ---- CCTV recorders + cameras ----------------------------------------------
create table cctv_recorders (
  id             uuid primary key default gen_random_uuid(),
  site_id        uuid not null references sites (id) on delete cascade,
  brand          text,
  model          text,
  channels       int,
  storage_tb     numeric(8, 2),
  retention_days int,
  firmware       text,
  mgmt_ip        text,
  location       text,
  notes          text,
  created_by     uuid default auth.uid(),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  last_verified_at timestamptz
);
create index cctv_recorders_site_idx on cctv_recorders (site_id);

create table cctv_cameras (
  id            uuid primary key default gen_random_uuid(),
  recorder_id   uuid not null references cctv_recorders (id) on delete cascade,
  label         text not null,
  location_desc text,
  camera_type   camera_type not null default 'dome',
  resolution    text,
  outdoor       boolean not null default false,
  status        camera_status not null default 'active',
  attributes    jsonb not null default '{}'::jsonb,
  notes         text,
  created_by    uuid default auth.uid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  last_verified_at timestamptz
);
create index cctv_cameras_recorder_idx on cctv_cameras (recorder_id);
create index cctv_cameras_label_trgm on cctv_cameras using gin (label gin_trgm_ops);

-- ---- Maintenance logs (polymorphic; network + CCTV) -------------------------
create table maintenance_logs (
  id           uuid primary key default gen_random_uuid(),
  target_table text not null,
  target_id    uuid not null,
  date         date not null,
  action       text not null,
  performed_by text,
  next_due     date,
  created_by   uuid default auth.uid(),
  created_at   timestamptz not null default now(),
  constraint maintenance_target_valid
    check (target_table in ('network_devices', 'cctv_recorders', 'cctv_cameras'))
);
create index maintenance_logs_target_idx on maintenance_logs (target_table, target_id);
create index maintenance_logs_next_due_idx on maintenance_logs (next_due);

-- ---- Audit log (immutable; written by triggers) -----------------------------
create table audit_log (
  id         uuid primary key default gen_random_uuid(),
  actor      uuid,
  action     text not null check (action in ('insert', 'update', 'delete')),
  table_name text not null,
  record_id  uuid,
  diff       jsonb,
  created_at timestamptz not null default now()
);
create index audit_log_created_idx on audit_log (created_at desc);
create index audit_log_table_idx on audit_log (table_name, record_id);

-- ---- updated_at maintenance -------------------------------------------------
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'sites','isp_circuits','network_devices','ip_schemes','vlans',
    'vpn_links','cctv_recorders','cctv_cameras'
  ] loop
    execute format(
      'create trigger %I_set_updated_at before update on %I
         for each row execute function set_updated_at()', t, t);
  end loop;
end $$;
