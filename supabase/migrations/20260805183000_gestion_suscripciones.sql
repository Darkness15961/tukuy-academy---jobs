-- Asignacion y renovacion de suscripciones para organizaciones cliente.

create or replace function public.admin_guardar_suscripcion(p_datos jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_instalacion uuid := (p_datos->>'instalacionId')::uuid;
  v_plan uuid := (p_datos->>'planId')::uuid;
  v_suscripcion uuid := nullif(p_datos->>'suscripcionId', '')::uuid;
  v_tipado public.suscripcion_organizacion;
  v_clasificacion text;
  v_desde timestamptz := (p_datos->>'vigenteDesde')::timestamptz;
  v_hasta timestamptz := nullif(p_datos->>'vigenteHasta', '')::timestamptz;
begin
  if not public.es_super_admin_actual() then raise exception 'No autorizado' using errcode = '42501'; end if;
  select clasificacion into v_clasificacion from public.instalacion_organizacion where id = v_instalacion for update;
  if not found then raise exception 'Organizacion inexistente'; end if;
  if v_clasificacion = 'INTERNA' then raise exception 'Una organizacion interna no requiere suscripcion comercial'; end if;
  if not exists(select 1 from public.plan_saas where id = v_plan and estado::text = 'ACTIVO') then raise exception 'El plan no esta activo'; end if;
  if v_hasta is not null and v_hasta <= v_desde then raise exception 'La fecha final debe ser posterior a la inicial'; end if;
  select * into v_tipado from jsonb_populate_record(null::public.suscripcion_organizacion, jsonb_build_object('estado', upper(coalesce(p_datos->>'estado','ACTIVA'))));

  if v_suscripcion is null then
    select id into v_suscripcion from public.suscripcion_organizacion where instalacion_organizacion_id = v_instalacion order by creada_en desc limit 1;
  end if;
  if v_suscripcion is null then
    insert into public.suscripcion_organizacion(instalacion_organizacion_id, plan_saas_ref, estado, vigente_desde, vigente_hasta, renovacion_automatica)
    values(v_instalacion, v_plan, v_tipado.estado, v_desde, v_hasta, coalesce((p_datos->>'renovacionAutomatica')::boolean,false)) returning id into v_suscripcion;
  else
    update public.suscripcion_organizacion set plan_saas_ref = v_plan, estado = v_tipado.estado,
      vigente_desde = v_desde, vigente_hasta = v_hasta,
      renovacion_automatica = coalesce((p_datos->>'renovacionAutomatica')::boolean,false),
      actualizada_en = now(), version_registro = version_registro + 1
    where id = v_suscripcion and instalacion_organizacion_id = v_instalacion;
    if not found then raise exception 'Suscripcion inexistente'; end if;
  end if;
  return v_suscripcion;
end;
$$;

revoke all on function public.admin_guardar_suscripcion(jsonb) from public;
grant execute on function public.admin_guardar_suscripcion(jsonb) to authenticated;
