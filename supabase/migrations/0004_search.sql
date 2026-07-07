-- =============================================================================
-- 0004_search.sql — global search across the registry (RLS-scoped)
-- Runs as the CALLER (security invoker) so RLS restricts results to what the
-- user may see. Matches sites, devices, circuits, cameras, IPs via ILIKE over
-- pg_trgm-indexed columns.  Source: finalize.md Part C — Search implementation
-- =============================================================================

create or replace function search_registry(q text)
returns table (
  type         text,
  id           uuid,
  label        text,
  country_code country_code
)
language sql
stable
security invoker
set search_path = public
as $$
  with needle as (select '%' || coalesce(nullif(trim(q), ''), '\x00') || '%' as p)
  -- Sites
  select 'site', s.id, s.name, s.country_code
    from sites s, needle
   where s.name ilike needle.p or coalesce(s.address, '') ilike needle.p
  union all
  -- Network devices
  select 'device', d.id,
         coalesce(nullif(d.hostname, ''), d.model, d.serial, 'device'), s.country_code
    from network_devices d
    join sites s on s.id = d.site_id, needle
   where d.hostname ilike needle.p or d.mgmt_ip ilike needle.p
      or coalesce(d.serial, '') ilike needle.p
  union all
  -- ISP circuits
  select 'circuit', c.id, c.provider || coalesce(' · ' || c.circuit_id, ''), s.country_code
    from isp_circuits c
    join sites s on s.id = c.site_id, needle
   where c.provider ilike needle.p or coalesce(c.circuit_id, '') ilike needle.p
  union all
  -- Cameras
  select 'camera', cam.id, cam.label, s.country_code
    from cctv_cameras cam
    join cctv_recorders r on r.id = cam.recorder_id
    join sites s on s.id = r.site_id, needle
   where cam.label ilike needle.p or coalesce(cam.location_desc, '') ilike needle.p
  limit 100;
$$;
