-- PRINCIPAL: buscar cualquier cuenta registrada (alumno u otro) para incorporar/vincular.
-- Por nombre o correo (no DNI). Puede devolver varias coincidencias.

begin;

create or replace function public.org_buscar_cuenta_registrada(
  p_instalacion_id uuid,
  p_criterio text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_criterio text := lower(trim(coalesce(p_criterio, '')));
  v_es_correo boolean;
  v_items jsonb := '[]'::jsonb;
begin
  if p_instalacion_id is null
    or (
      not public.org_tiene_permiso(p_instalacion_id, 'usuarios.ver')
      and not public.org_tiene_permiso(p_instalacion_id, 'usuarios.administrar')
      and not public.org_tiene_permiso(p_instalacion_id, 'usuarios.invitar')
      and not public.org_tiene_permiso(p_instalacion_id, 'equipos.administrar')
    )
  then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  if v_criterio = '' then
    return jsonb_build_object('ok', true, 'coincidencias', '[]'::jsonb);
  end if;

  v_es_correo := position('@' in v_criterio) > 0;

  with candidatas as (
    select i.*
    from public.identidad_principal i
    where i.estado <> 'BLOQUEADO'
      and (
        case
          when v_es_correo then
            lower(coalesce(i.correo, '')) = v_criterio
            or lower(coalesce(i.correo, '')) like v_criterio || '%'
          else
            lower(coalesce(i.correo, '')) like '%' || v_criterio || '%'
            or lower(coalesce(i.nombre_mostrar, '')) like '%' || v_criterio || '%'
            or lower(coalesce(i.nombres, '')) like '%' || v_criterio || '%'
            or lower(coalesce(i.apellidos, '')) like '%' || v_criterio || '%'
            or lower(trim(concat_ws(' ', i.nombres, i.apellidos))) like '%' || v_criterio || '%'
        end
      )
    order by
      case when lower(coalesce(i.correo, '')) = v_criterio then 0 else 1 end,
      coalesce(nullif(i.nombre_mostrar, ''), i.correo)
    limit 12
  ),
  enriquecidas as (
    select
      c.id as identidad_id,
      coalesce(
        nullif(c.nombre_mostrar, ''),
        nullif(trim(concat_ws(' ', c.nombres, c.apellidos)), ''),
        c.correo,
        'Usuario'
      ) as nombre,
      coalesce(c.correo, '') as correo,
      c.avatar_url,
      c.estado as estado_identidad,
      coalesce((
        select jsonb_agg(jsonb_build_object(
          'codigo', p.codigo,
          'nombre', p.nombre,
          'estado', f.estado
        ) order by p.nombre)
        from public.membresia_principal m
        join public.funcion_principal f on f.membresia_principal_id = m.id
        join public.perfil_principal p on p.id = f.perfil_principal_id
        where m.identidad_principal_id = c.id
          and m.instalacion_organizacion_ref = p_instalacion_id
          and m.alcance_tipo = 'ORGANIZACION'
          and m.estado in ('PENDIENTE', 'ACTIVA', 'SUSPENDIDA')
          and f.estado in ('ACTIVA', 'SUSPENDIDA', 'PENDIENTE')
      ), '[]'::jsonb) as roles
    from candidatas c
  )
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'identidadId', e.identidad_id,
      'nombre', e.nombre,
      'correo', e.correo,
      'avatarUrl', e.avatar_url,
      'estadoIdentidad', e.estado_identidad,
      'enDirectorioStaff', exists (
        select 1
        from jsonb_array_elements(e.roles) r
        where upper(r->>'codigo') <> 'STUDENT'
          and upper(coalesce(r->>'estado', '')) in ('ACTIVA', 'SUSPENDIDA', 'PENDIENTE')
      ),
      'esAlumno', exists (
        select 1
        from jsonb_array_elements(e.roles) r
        where upper(r->>'codigo') = 'STUDENT'
      ),
      'roles', e.roles
    )
    order by e.nombre
  ), '[]'::jsonb)
  into v_items
  from enriquecidas e;

  return jsonb_build_object(
    'ok', true,
    'coincidencias', coalesce(v_items, '[]'::jsonb)
  );
end;
$$;

revoke all on function public.org_buscar_cuenta_registrada(uuid, text)
  from public, anon;

grant execute on function public.org_buscar_cuenta_registrada(uuid, text)
  to authenticated;

comment on function public.org_buscar_cuenta_registrada(uuid, text) is
  'Busca cuentas Tukuy por nombre o correo (parcial). No usa DNI.';

commit;
