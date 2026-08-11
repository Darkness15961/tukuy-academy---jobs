-- Ejecutar en el SQL Editor del proyecto PRINCIPAL.
-- Corrige admin_confirmar_conexion_secundaria: estado_instalacion no incluye HABILITADA.
begin;

create or replace function public.admin_confirmar_conexion_secundaria(
  p_instalacion_id uuid,
  p_version_esquema integer default null,
  p_detalle jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_conexion public.conexion_organizacion;
  v_estado_instalacion text;
  v_estado_conexion text;
  v_estado_conexion_tipado public.conexion_organizacion;
begin
  if not public.es_super_admin_actual() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.instalacion_organizacion where id = p_instalacion_id
  ) then
    raise exception 'Organizacion inexistente';
  end if;

  select * into v_conexion
  from public.conexion_organizacion
  where instalacion_organizacion_id = p_instalacion_id;
  if not found then
    raise exception 'La organizacion no tiene una conexion secundaria registrada';
  end if;

  select e.enumlabel
    into v_estado_instalacion
  from pg_catalog.pg_type t
  join pg_catalog.pg_enum e on e.enumtypid = t.oid
  join pg_catalog.pg_namespace n on n.oid = t.typnamespace
  where n.nspname = 'public'
    and t.typname = 'estado_instalacion'
    and e.enumlabel in ('ACTIVA', 'ACTIVO', 'HABILITADA', 'VERIFICADA', 'PENDIENTE')
  order by case e.enumlabel
    when 'ACTIVA' then 0
    when 'ACTIVO' then 1
    when 'HABILITADA' then 2
    when 'VERIFICADA' then 3
    else 9
  end
  limit 1;

  if v_estado_instalacion is null then
    v_estado_instalacion := 'ACTIVA';
  end if;

  begin
    select * into v_estado_conexion_tipado
    from jsonb_populate_record(
      null::public.conexion_organizacion,
      jsonb_build_object('estado', 'VERIFICADA')
    );
    v_estado_conexion := v_estado_conexion_tipado.estado::text;
  exception
    when others then
      begin
        select * into v_estado_conexion_tipado
        from jsonb_populate_record(
          null::public.conexion_organizacion,
          jsonb_build_object('estado', 'ACTIVA')
        );
        v_estado_conexion := v_estado_conexion_tipado.estado::text;
      exception
        when others then
          v_estado_conexion_tipado := null;
          v_estado_conexion := v_conexion.estado::text;
      end;
  end;

  update public.conexion_organizacion
  set
    estado = coalesce(v_estado_conexion_tipado.estado, estado),
    version_esquema = greatest(coalesce(p_version_esquema, version_esquema), 1),
    verificada_en = now(),
    ultimo_error = null,
    actualizada_en = now()
  where id = v_conexion.id;

  update public.instalacion_organizacion
  set
    estado = v_estado_instalacion::public.estado_instalacion,
    habilitada_en = coalesce(habilitada_en, now()),
    actualizada_en = now(),
    version_registro = version_registro + 1
  where id = p_instalacion_id;

  return jsonb_build_object(
    'ok', true,
    'instalacionId', p_instalacion_id,
    'estadoConexion', coalesce(v_estado_conexion, v_conexion.estado::text),
    'estadoInstalacion', v_estado_instalacion,
    'detalle', coalesce(p_detalle, '{}'::jsonb)
  );
end;
$$;

revoke all on function public.admin_confirmar_conexion_secundaria(uuid, integer, jsonb) from public;
grant execute on function public.admin_confirmar_conexion_secundaria(uuid, integer, jsonb) to authenticated;

commit;
