-- Listado de alumnos agregado + paginado (portal organización).
-- Ejecutar en el SQL Editor del proyecto SECUNDARIO.
--
-- Sustituye el dump completo de matrículas por 1 fila por estudiante,
-- con límite/offset y búsqueda.

begin;

create index if not exists matricula_curso_estudiante_idx
  on public.matricula_curso (estudiante_identidad_ref);

create index if not exists matricula_curso_edicion_idx
  on public.matricula_curso (edicion_curso_id);

create or replace function public.servicio_listar_alumnos_resumen(
  p_busqueda text default null,
  p_curso_id uuid default null,
  p_limite integer default 50,
  p_offset integer default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_limite integer := greatest(1, least(coalesce(p_limite, 50), 100));
  v_offset integer := greatest(0, coalesce(p_offset, 0));
  v_busqueda text := nullif(trim(coalesce(p_busqueda, '')), '');
  v_total integer := 0;
  v_alumnos jsonb := '[]'::jsonb;
  v_cursos jsonb := '[]'::jsonb;
begin
  with base as (
    select
      m.estudiante_identidad_ref as alumno_id,
      coalesce(a.nombre_mostrar, a.correo, 'Estudiante') as nombre,
      upper(left(coalesce(a.nombre_mostrar, a.correo, 'ES'), 2)) as iniciales,
      coalesce(a.correo, '') as correo,
      count(*)::integer as cursos,
      string_agg(distinct c.titulo, ' · ' order by c.titulo) as cursos_resumen,
      round(avg(coalesce(m.progreso_porcentaje, 0)))::integer as progreso,
      min(m.matriculado_en)::text as fecha_inscripcion,
      max(m.matriculado_en)::text as ultimo_acceso_fecha,
      max(m.matriculado_en)::text as ultimo_acceso,
      count(*) filter (
        where m.estado::text = 'PENDIENTE'
      )::integer as pendientes,
      coalesce(
        (
          array_agg(m.estado::text order by
            case m.estado::text
              when 'EN_RIESGO' then 1
              when 'PENDIENTE' then 2
              when 'ACTIVO' then 3
              when 'COMPLETADO' then 4
              else 5
            end
          )
        )[1],
        'ACTIVO'
      ) as estado,
      coalesce(
        jsonb_agg(
          jsonb_build_object(
            'id', m.id,
            'cursoId', c.id,
            'curso', c.titulo,
            'progreso', coalesce(m.progreso_porcentaje, 0),
            'estado', m.estado::text
          )
        ) filter (where m.estado::text = 'PENDIENTE'),
        '[]'::jsonb
      ) as matriculas_pendientes
    from public.matricula_curso m
    join public.edicion_curso e on e.id = m.edicion_curso_id
    join public.version_curso v on v.id = e.version_curso_id
    join public.curso c on c.id = v.curso_id
    left join public.acceso_identidad_principal a
      on a.identidad_principal_ref = m.estudiante_identidad_ref
    where (
      p_curso_id is null
      or exists (
        select 1
        from public.matricula_curso mx
        join public.edicion_curso ex on ex.id = mx.edicion_curso_id
        join public.version_curso vx on vx.id = ex.version_curso_id
        where mx.estudiante_identidad_ref = m.estudiante_identidad_ref
          and vx.curso_id = p_curso_id
      )
    )
    group by
      m.estudiante_identidad_ref,
      a.nombre_mostrar,
      a.correo
  ),
  filtrado as (
    select *
    from base
    where v_busqueda is null
      or nombre ilike '%' || v_busqueda || '%'
      or correo ilike '%' || v_busqueda || '%'
      or cursos_resumen ilike '%' || v_busqueda || '%'
  )
  select count(*)::integer into v_total from filtrado;

  select coalesce(
    jsonb_agg(item order by item->>'nombre'),
    '[]'::jsonb
  )
  into v_alumnos
  from (
    select jsonb_build_object(
      'alumnoId', f.alumno_id,
      'nombre', f.nombre,
      'iniciales', f.iniciales,
      'correo', f.correo,
      'cursos', f.cursos,
      'cursosResumen', f.cursos_resumen,
      'progreso', f.progreso,
      'estado', f.estado,
      'fechaInscripcion', f.fecha_inscripcion,
      'ultimoAcceso', f.ultimo_acceso,
      'ultimoAccesoFecha', f.ultimo_acceso_fecha,
      'pendientes', f.pendientes,
      'matriculasPendientes', f.matriculas_pendientes,
      'organizacion', coalesce(
        (select ci.nombre_organizacion from public.contexto_instalacion ci where ci.id = true),
        'Tukuy Academy'
      )
    ) as item
    from filtrado f
    order by f.nombre
    limit v_limite
    offset v_offset
  ) pagina;

  select coalesce(
    jsonb_agg(jsonb_build_object('id', x.id, 'titulo', x.titulo) order by x.titulo),
    '[]'::jsonb
  )
  into v_cursos
  from (
    select c.id, c.titulo
    from public.curso c
    where exists (
      select 1
      from public.version_curso v
      join public.edicion_curso e on e.version_curso_id = v.id
      join public.matricula_curso m on m.edicion_curso_id = e.id
      where v.curso_id = c.id
    )
    order by c.titulo
    limit 200
  ) x;

  return jsonb_build_object(
    'ok', true,
    'total', v_total,
    'limite', v_limite,
    'offset', v_offset,
    'alumnos', v_alumnos,
    'cursos', v_cursos
  );
end;
$$;

revoke all on function public.servicio_listar_alumnos_resumen(text, uuid, integer, integer)
  from public, anon, authenticated;
grant execute on function public.servicio_listar_alumnos_resumen(text, uuid, integer, integer)
  to service_role;

commit;
