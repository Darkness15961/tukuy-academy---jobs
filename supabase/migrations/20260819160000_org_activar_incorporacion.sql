-- PRINCIPAL: aceptar ingreso de persona con membresía PENDIENTE y vinculaciones en espera.

begin;

create or replace function public.org_activar_incorporacion(
  p_instalacion_id uuid,
  p_identidad_id uuid,
  p_aprobada_por text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_membresia public.membresia_principal%rowtype;
  v_vinculaciones int := 0;
  v_asignaciones int := 0;
  v_asig record;
begin
  if p_instalacion_id is null
    or not (
      public.org_tiene_permiso(p_instalacion_id, 'usuarios.administrar')
      or public.org_tiene_permiso(p_instalacion_id, 'equipos.administrar')
    )
  then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  select * into v_membresia
  from public.membresia_principal m
  where m.instalacion_organizacion_ref = p_instalacion_id
    and m.identidad_principal_id = p_identidad_id
    and m.alcance_tipo = 'ORGANIZACION'
    and m.estado in ('PENDIENTE', 'ACTIVA', 'SUSPENDIDA')
  order by
    case m.estado
      when 'PENDIENTE' then 0
      when 'ACTIVA' then 1
      else 2
    end
  limit 1;

  if not found then
    raise exception 'La persona no tiene membresía en esta organización.';
  end if;

  if v_membresia.estado = 'PENDIENTE' then
    update public.membresia_principal
    set
      estado = 'ACTIVA',
      version_autorizacion = version_autorizacion + 1,
      actualizada_en = now()
    where id = v_membresia.id;
  end if;

  update public.org_vinculacion_unidad v
  set
    estado = 'ACTIVA',
    fecha_inicio = coalesce(v.fecha_inicio, current_date),
    aprobada_por = coalesce(nullif(trim(p_aprobada_por), ''), v.aprobada_por),
    actualizado_en = now()
  where v.instalacion_organizacion_id = p_instalacion_id
    and v.identidad_ref = p_identidad_id::text
    and v.estado = 'PENDIENTE';
  get diagnostics v_vinculaciones = row_count;

  for v_asig in
    select a.id
    from public.org_asignacion_perfil a
    where a.instalacion_organizacion_id = p_instalacion_id
      and a.identidad_ref = p_identidad_id::text
      and a.estado = 'INACTIVA'
  loop
    update public.org_asignacion_perfil
    set estado = 'ACTIVA', actualizado_en = now()
    where instalacion_organizacion_id = p_instalacion_id
      and id = v_asig.id;

    perform public.org_sincronizar_funcion_desde_asignacion(
      p_instalacion_id,
      v_asig.id
    );
    v_asignaciones := v_asignaciones + 1;
  end loop;

  return jsonb_build_object(
    'identidadId', p_identidad_id,
    'membresiaId', v_membresia.id,
    'vinculacionesActivadas', v_vinculaciones,
    'asignacionesActivadas', v_asignaciones
  );
end;
$$;

revoke all on function public.org_activar_incorporacion(uuid, uuid, text) from public;
grant execute on function public.org_activar_incorporacion(uuid, uuid, text) to authenticated;

commit;
