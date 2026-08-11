-- Ejecutar una sola vez en el SQL Editor del proyecto PRINCIPAL.
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
  v_estado_tipado public.conexion_organizacion;
  v_estado_conexion text;
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

  begin
    select * into v_estado_tipado
    from jsonb_populate_record(
      null::public.conexion_organizacion,
      jsonb_build_object('estado', 'VERIFICADA')
    );
    v_estado_conexion := v_estado_tipado.estado::text;
  exception
    when others then
      begin
        select * into v_estado_tipado
        from jsonb_populate_record(
          null::public.conexion_organizacion,
          jsonb_build_object('estado', 'HABILITADA')
        );
        v_estado_conexion := v_estado_tipado.estado::text;
      exception
        when others then
          v_estado_conexion := v_conexion.estado::text;
      end;
  end;

  update public.conexion_organizacion
  set
    estado = coalesce(v_estado_tipado.estado, estado),
    version_esquema = greatest(coalesce(p_version_esquema, version_esquema), 1),
    verificada_en = now(),
    ultimo_error = null,
    actualizada_en = now()
  where id = v_conexion.id;

  update public.instalacion_organizacion
  set
    estado = 'HABILITADA',
    habilitada_en = coalesce(habilitada_en, now()),
    actualizada_en = now(),
    version_registro = version_registro + 1
  where id = p_instalacion_id;

  return jsonb_build_object(
    'ok', true,
    'instalacionId', p_instalacion_id,
    'estadoConexion', coalesce(v_estado_conexion, 'VERIFICADA'),
    'estadoInstalacion', 'HABILITADA',
    'detalle', coalesce(p_detalle, '{}'::jsonb)
  );
end;
$$;

revoke all on function public.admin_confirmar_conexion_secundaria(uuid, integer, jsonb) from public;
grant execute on function public.admin_confirmar_conexion_secundaria(uuid, integer, jsonb) to authenticated;

commit;
