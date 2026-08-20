-- PRINCIPAL: directorio paginado de alumnos (rol STUDENT).
-- No exige nodo ni matrícula. Sin nodo = alumno externo en la UI.
-- Incluye alumnos de la instalación actual y los de Tukuy Academy
-- (alta automática al registrarse).
-- SQL Editor del proyecto PRINCIPAL (nidkyztqapeqdplzvnkc).

begin;

create index if not exists membresia_principal_instalacion_estado_idx
  on public.membresia_principal (instalacion_organizacion_ref, estado)
  where alcance_tipo = 'ORGANIZACION';

create or replace function public.org_listar_alumnos(
  p_instalacion_id uuid,
  p_busqueda text default null,
  p_limite integer default 24,
  p_offset integer default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_tukuy uuid := '30000000-0000-4000-8000-000000000001';
  v_limite integer := greatest(1, least(coalesce(p_limite, 24), 100));
  v_offset integer := greatest(0, coalesce(p_offset, 0));
  v_busqueda text := nullif(trim(coalesce(p_busqueda, '')), '');
  v_total integer := 0;
  v_alumnos jsonb := '[]'::jsonb;
begin
  if p_instalacion_id is null
    or not (
      public.org_tiene_permiso(p_instalacion_id, 'estudiantes.ver')
      or public.org_tiene_permiso(p_instalacion_id, 'alumnos.ver')
      or public.org_tiene_permiso(p_instalacion_id, 'usuarios.ver')
    )
  then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  with base as (
    select distinct on (identidad.id)
      identidad.id as alumno_id,
      coalesce(
        nullif(identidad.nombre_mostrar, ''),
        nullif(trim(concat_ws(' ', identidad.nombres, identidad.apellidos)), ''),
        identidad.correo,
        'Estudiante'
      ) as nombre,
      coalesce(identidad.correo, '') as correo,
      identidad.ultimo_acceso_en,
      membresia.creada_en as fecha_alta
    from public.membresia_principal membresia
    join public.identidad_principal identidad
      on identidad.id = membresia.identidad_principal_id
    join public.funcion_principal funcion
      on funcion.membresia_principal_id = membresia.id
    join public.perfil_principal perfil
      on perfil.id = funcion.perfil_principal_id
    where membresia.alcance_tipo = 'ORGANIZACION'
      and membresia.estado in ('PENDIENTE', 'ACTIVA', 'SUSPENDIDA')
      and identidad.estado = 'ACTIVO'
      and funcion.estado = 'ACTIVA'
      and perfil.codigo = 'STUDENT'
      and membresia.instalacion_organizacion_ref in (p_instalacion_id, v_tukuy)
    order by identidad.id, membresia.creada_en
  ),
  filtrado as (
    select
      alumno_id,
      nombre,
      correo,
      upper(left(coalesce(nombre, 'ES'), 2)) as iniciales,
      ultimo_acceso_en,
      fecha_alta
    from base
    where v_busqueda is null
      or nombre ilike '%' || v_busqueda || '%'
      or correo ilike '%' || v_busqueda || '%'
  )
  select count(*)::integer into v_total from filtrado;

  select coalesce(jsonb_agg(item order by item->>'nombre'), '[]'::jsonb)
  into v_alumnos
  from (
    select jsonb_build_object(
      'alumnoId', f.alumno_id,
      'nombre', f.nombre,
      'iniciales', f.iniciales,
      'correo', f.correo,
      'cursos', 0,
      'cursosResumen', '',
      'progreso', 0,
      'estado', 'ACTIVO',
      'fechaInscripcion', f.fecha_alta,
      'ultimoAcceso', coalesce(f.ultimo_acceso_en::text, ''),
      'ultimoAccesoFecha', coalesce(f.ultimo_acceso_en::text, ''),
      'pendientes', 0,
      'matriculasPendientes', '[]'::jsonb
    ) as item
    from filtrado f
    order by f.nombre
    limit v_limite
    offset v_offset
  ) pagina;

  return jsonb_build_object(
    'ok', true,
    'total', v_total,
    'limite', v_limite,
    'offset', v_offset,
    'alumnos', v_alumnos
  );
end;
$$;

revoke all on function public.org_listar_alumnos(uuid, text, integer, integer)
  from public, anon;
grant execute on function public.org_listar_alumnos(uuid, text, integer, integer)
  to authenticated;

commit;
