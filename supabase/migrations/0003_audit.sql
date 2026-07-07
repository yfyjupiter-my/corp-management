-- =============================================================================
-- 0003_audit.sql — audit trigger (immutable log via SECURITY DEFINER)
-- Captures actor (auth.uid()), action, table, record_id, and a JSON diff on
-- every insert/update/delete of an inventory table.  Source: finalize.md Part B/E
-- =============================================================================

create or replace function write_audit()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_record_id uuid;
  v_diff      jsonb;
begin
  if tg_op = 'DELETE' then
    v_record_id := old.id;
    v_diff := to_jsonb(old);
  elsif tg_op = 'INSERT' then
    v_record_id := new.id;
    v_diff := to_jsonb(new);
  else -- UPDATE: store only changed keys
    v_record_id := new.id;
    select jsonb_object_agg(key, jsonb_build_object('old', o.value, 'new', n.value))
      into v_diff
      from jsonb_each(to_jsonb(old)) o
      join jsonb_each(to_jsonb(new)) n using (key)
     where o.value is distinct from n.value;
  end if;

  insert into audit_log (actor, action, table_name, record_id, diff)
  values (auth.uid(), lower(tg_op), tg_table_name, v_record_id, v_diff);

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'sites','isp_circuits','network_devices','ip_schemes','vlans',
    'vpn_links','cctv_recorders','cctv_cameras','maintenance_logs'
  ] loop
    execute format(
      'create trigger %I_audit after insert or update or delete on %I
         for each row execute function write_audit()', t, t);
  end loop;
end $$;
