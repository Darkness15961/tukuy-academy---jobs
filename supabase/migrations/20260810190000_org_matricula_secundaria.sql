-- Portal organización · Matrícula institucional en la secundaria
-- Resuelve y autoriza al estudiante que un gestor quiere matricular.
-- Ejecutar en el SQL Editor del proyecto PRINCIPAL.

begin;

create or replace function public.org_resolver_estudiante_secundaria(
  p_instalacion_id uuid,
  p_identidad_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_resultado jsonb;
begin
  if p_instalacion_id is null or p_identidad_id is null then
    raise exception 'Instalacion y estudiante requeridos';
  end if;

  -- Mismo guard que la gestión de accesos del portal organización.
  if not public.org_tiene_permiso(p_instalacion_id, 'usuarios.administrar') then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'ok', true,
    'identidadId', identidad.id,
    'authRef', coalesce(identidad.auth_usuario_ref, identidad.id),
    'membresiaId', membresia.id,
    'correo', identidad.correo,
    'nombre', identidad.nombre_mostrar,
    'versionAutorizacion', membresia.version_autorizacion,
    'perfiles', coalesce((
      select jsonb_agg(distinct funcion.codigo)
      from public.funcion_principal funcion
      where funcion.membresia_principal_id = membresia.id
        and funcion.estado = 'ACTIVA'
        and (funcion.vigente_hasta is null or funcion.vigente_hasta > now())
    ), '[]'::jsonb),
    'permisos', coalesce((
      select jsonb_agg(distinct permiso.codigo)
      from public.funcion_principal funcion
      cross join lateral unnest(public.permisos_efectivos_funcion(funcion.id))
        as permiso(codigo)
      where funcion.membresia_principal_id = membresia.id
        and funcion.estado = 'ACTIVA'
        and (funcion.vigente_hasta is null or funcion.vigente_hasta > now())
    ), '[]'::jsonb)
  )
  into v_resultado
  from public.identidad_principal identidad
  join public.membresia_principal membresia
    on membresia.identidad_principal_id = identidad.id
  where identidad.id = p_identidad_id
    and identidad.estado = 'ACTIVO'
    and membresia.estado = 'ACTIVA'
    and membresia.alcance_tipo = 'ORGANIZACION'
    and membresia.instalacion_organizacion_ref = p_instalacion_id
    and (membresia.vigente_hasta is null or membresia.vigente_hasta > now())
  limit 1;

  if v_resultado is null then
    return jsonb_build_object(
      'ok', false,
      'error', 'La persona no es miembro activo de la organizacion'
    );
  end if;

  return v_resultado;
end;
$$;

revoke all on function public.org_resolver_estudiante_secundaria(uuid, uuid) from public;
grant execute on function public.org_resolver_estudiante_secundaria(uuid, uuid) to authenticated;

commit;
