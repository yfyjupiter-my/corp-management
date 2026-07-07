-- =============================================================================
-- seed.sql — reference data + Malaysia pilot sample (finalize.md Q3)
-- All four countries exist so RLS + nav are complete; only MY is populated.
-- =============================================================================

-- ---- country_settings: seed all four at company defaults --------------------
insert into country_settings (country_code, min_retention_days, review_cycle_months)
values ('VN', 30, 6), ('TH', 30, 6), ('ID', 30, 6), ('MY', 30, 6)
on conflict (country_code) do nothing;

-- ---- Malaysia pilot: one site with sample network + CCTV --------------------
do $$
declare
  v_site uuid;
  v_recorder uuid;
  v_device uuid;
begin
  insert into sites (country_code, name, address, timezone, currency,
                     contact_name, contact_phone, contact_email, last_verified_at)
  values ('MY', 'Kuala Lumpur HQ', 'Level 12, Menara XYZ, Jalan Ampang, KL',
          'Asia/Kuala_Lumpur', 'MYR',
          'Nadia Rahman', '+60 3-1234 5678', 'nadia.r@example.com', now())
  returning id into v_site;

  insert into isp_circuits (site_id, provider, circuit_id, bandwidth, type,
                            static_ips, contract_start, contract_end,
                            monthly_cost, support_phone, last_verified_at)
  values (v_site, 'TM Unifi', 'TM-KL-004821', '1 Gbps', 'fiber',
          array['203.0.113.10', '203.0.113.11'], '2025-01-01', '2026-12-31',
          899.00, '100', now());

  insert into network_devices (site_id, device_type, brand, model, hostname,
                               mgmt_ip, firmware, serial, install_date,
                               warranty_end, credential_ref, last_verified_at)
  values (v_site, 'firewall', 'Fortinet', 'FortiGate 60F', 'kl-fw-01',
          '10.10.0.1', '7.4.3', 'FG60F-KL-0001', '2025-01-05', '2028-01-05',
          'vault://it/kl-fw-01', now())
  returning id into v_device;

  insert into network_devices (site_id, device_type, brand, model, hostname,
                               mgmt_ip, firmware, last_verified_at)
  values (v_site, 'switch', 'Cisco', 'Catalyst 9200', 'kl-sw-core',
          '10.10.0.2', '17.9', now());

  insert into ip_schemes (site_id, subnet, gateway, dns, dhcp_range)
  values (v_site, '10.10.0.0/24', '10.10.0.1', '10.10.0.1, 1.1.1.1',
          '10.10.0.100-10.10.0.200');

  insert into vlans (site_id, vlan_id, name, subnet, purpose)
  values (v_site, 10, 'CORP', '10.10.10.0/24', 'Staff workstations'),
         (v_site, 20, 'CCTV', '10.10.20.0/24', 'Camera network'),
         (v_site, 99, 'MGMT', '10.10.99.0/24', 'Device management');

  insert into cctv_recorders (site_id, brand, model, channels, storage_tb,
                              retention_days, firmware, mgmt_ip, location,
                              last_verified_at)
  values (v_site, 'Hikvision', 'DS-7616NI', 16, 8.0, 45, '4.61.0',
          '10.10.20.5', 'Server room, Level 12', now())
  returning id into v_recorder;

  insert into cctv_cameras (recorder_id, label, location_desc, camera_type,
                            resolution, outdoor, status)
  values
    (v_recorder, 'CAM-01', 'Main entrance', 'dome', '4MP', false, 'active'),
    (v_recorder, 'CAM-02', 'Reception', 'dome', '4MP', false, 'active'),
    (v_recorder, 'CAM-03', 'Loading bay', 'bullet', '4MP', true, 'faulty'),
    (v_recorder, 'CAM-04', 'Car park entry', 'ptz', '8MP', true, 'active');

  insert into maintenance_logs (target_table, target_id, date, action,
                                performed_by, next_due)
  values ('cctv_recorders', v_recorder, '2026-05-10',
          'Replaced HDD bay 2 (4TB WD Purple)', 'Nadia Rahman', '2026-11-10');
end $$;
