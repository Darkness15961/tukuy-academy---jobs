-- Duración total del curso (suma de actividades) en listados tipados.
begin;

create or replace function public._servicio_duracion_minutos_curso(p_curso_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(greatest(a.duracion_minutos, 1)), 0)::int
  from public.actividad_curso a
  join public.modulo_curso m on m.id = a.modulo_curso_id
  join public.version_curso v on v.id = m.version_curso_id
  where v.curso_id = p_curso_id
    and v.id = (
      select v2.id
      from public.version_curso v2
      where v2.curso_id = p_curso_id
      order by v2.numero desc
      limit 1
    )
    and coalesce(a.activa, true)
    and coalesce(m.activo, true);
$$;

create or replace function public.servicio_listar_cursos_tipados(
  p_limite integer default 100
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_limite integer := greatest(1, least(coalesce(p_limite, 100), 500));
  v_cursos jsonb;
begin
  select coalesce(jsonb_agg(item order by item->>'actualizadoEn' desc), '[]'::jsonb)
  into v_cursos
  from (
    select jsonb_build_object(
      'id', c.id,
      'codigo', c.codigo,
      'titulo', c.titulo,
      'resumen', c.resumen,
      'categoria', c.categoria,
      'modalidad', c.modalidad::text,
      'estado', c.estado::text,
      'autorIdentidadRef', c.autor_identidad_ref,
      'portadaClave', c.portada_clave_almacenamiento,
      'imagenPosicion', coalesce(
        nullif(trim((
          select d.documento->>'imagenPosicion'
          from public.documento_borrador_curso d
          where d.curso_id = c.id
        )), ''),
        '50% 50%'
      ),
      'precio', coalesce((
        select nullif(d.documento->>'precio', '')::numeric
        from public.documento_borrador_curso d
        where d.curso_id = c.id
      ), 0),
      'gratuito', coalesce((
        select case
          when d.documento ? 'gratuito' then (d.documento->>'gratuito')::boolean
          when nullif(d.documento->>'precio', '')::numeric > 0 then false
          else true
        end
        from public.documento_borrador_curso d
        where d.curso_id = c.id
      ), true),
      'moneda', coalesce((
        select nullif(trim(d.documento->>'moneda'), '')
        from public.documento_borrador_curso d
        where d.curso_id = c.id
      ), 'PEN'),
      'duracionMinutosTotal', public._servicio_duracion_minutos_curso(c.id),
      'creadoEn', c.creado_en,
      'actualizadoEn', c.actualizado_en,
      'versionRegistro', c.version_registro,
      'versionActual', (
        select jsonb_build_object(
          'id', v.id,
          'numero', v.numero,
          'tituloHistorico', v.titulo_historico,
          'horas', v.horas,
          'notaMinima', v.nota_minima,
          'notaMaxima', v.nota_maxima,
          'estado', v.estado
        )
        from public.version_curso v
        where v.curso_id = c.id
        order by v.numero desc
        limit 1
      ),
      'totalVersiones', (
        select count(*)::int from public.version_curso v where v.curso_id = c.id
      ),
      'totalModulos', (
        select count(*)::int
        from public.modulo_curso m
        join public.version_curso v on v.id = m.version_curso_id
        where v.curso_id = c.id
      ),
      'totalEdiciones', (
        select count(*)::int
        from public.edicion_curso e
        join public.version_curso v on v.id = e.version_curso_id
        where v.curso_id = c.id
      )
    ) as item
    from public.curso c
    order by c.actualizado_en desc
    limit v_limite
  ) listado;

  return jsonb_build_object(
    'ok', true,
    'total', jsonb_array_length(v_cursos),
    'cursos', v_cursos,
    'generadoEn', now()
  );
end;
$$;

create or replace function public.servicio_obtener_curso_tipado(
  p_curso_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_curso public.curso%rowtype;
  v_versiones jsonb;
  v_doc jsonb;
begin
  if p_curso_id is null then
    raise exception 'Curso requerido';
  end if;

  select * into v_curso
  from public.curso
  where id = p_curso_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Curso no encontrado');
  end if;

  select d.documento into v_doc
  from public.documento_borrador_curso d
  where d.curso_id = v_curso.id;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', v.id,
      'numero', v.numero,
      'tituloHistorico', v.titulo_historico,
      'horas', v.horas,
      'notaMinima', v.nota_minima,
      'notaMaxima', v.nota_maxima,
      'estado', v.estado,
      'totalModulos', (
        select count(*)::int from public.modulo_curso m where m.version_curso_id = v.id
      ),
      'totalEdiciones', (
        select count(*)::int from public.edicion_curso e where e.version_curso_id = v.id
      )
    )
    order by v.numero desc
  ), '[]'::jsonb)
  into v_versiones
  from public.version_curso v
  where v.curso_id = v_curso.id;

  return jsonb_build_object(
    'ok', true,
    'curso', jsonb_build_object(
      'id', v_curso.id,
      'codigo', v_curso.codigo,
      'titulo', v_curso.titulo,
      'resumen', v_curso.resumen,
      'categoria', v_curso.categoria,
      'modalidad', v_curso.modalidad::text,
      'estado', v_curso.estado::text,
      'autorIdentidadRef', v_curso.autor_identidad_ref,
      'portadaClave', v_curso.portada_clave_almacenamiento,
      'imagenPosicion', coalesce(nullif(trim(v_doc->>'imagenPosicion'), ''), '50% 50%'),
      'precio', coalesce(nullif(v_doc->>'precio', '')::numeric, 0),
      'gratuito', coalesce(
        case
          when v_doc ? 'gratuito' then (v_doc->>'gratuito')::boolean
          when coalesce(nullif(v_doc->>'precio', '')::numeric, 0) > 0 then false
          else true
        end,
        true
      ),
      'moneda', coalesce(nullif(trim(v_doc->>'moneda'), ''), 'PEN'),
      'duracionMinutosTotal', public._servicio_duracion_minutos_curso(v_curso.id),
      'creadoEn', v_curso.creado_en,
      'actualizadoEn', v_curso.actualizado_en,
      'versionRegistro', v_curso.version_registro,
      'versiones', v_versiones
    )
  );
end;
$$;

-- Recalcular horas certificables desde duración real de actividades.
update public.version_curso v
set horas = greatest(1, ceil(sub.total_minutos::numeric / 60))
from (
  select
    m.version_curso_id,
    coalesce(sum(greatest(a.duracion_minutos, 1)), 0) as total_minutos
  from public.actividad_curso a
  join public.modulo_curso m on m.id = a.modulo_curso_id
  where coalesce(a.activa, true)
    and coalesce(m.activo, true)
  group by m.version_curso_id
) sub
where v.id = sub.version_curso_id
  and sub.total_minutos > 0;

revoke all on function public._servicio_duracion_minutos_curso(uuid)
  from public, anon, authenticated;
revoke all on function public.servicio_listar_cursos_tipados(integer)
  from public, anon, authenticated;
revoke all on function public.servicio_obtener_curso_tipado(uuid)
  from public, anon, authenticated;

grant execute on function public._servicio_duracion_minutos_curso(uuid) to service_role;
grant execute on function public.servicio_listar_cursos_tipados(integer) to service_role;
grant execute on function public.servicio_obtener_curso_tipado(uuid) to service_role;

commit;
