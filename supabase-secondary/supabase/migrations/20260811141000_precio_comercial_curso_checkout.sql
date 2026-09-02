-- Precio comercial en borrador → listado/detalle de cursos (checkout alumno).
-- Ejecutar en el SQL Editor del proyecto SECUNDARIO.

begin;

create or replace function public.servicio_guardar_comercializacion_curso(
  p_curso_id uuid,
  p_precio numeric default null,
  p_gratuito boolean default null,
  p_moneda text default 'PEN'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_doc jsonb;
  v_precio numeric := greatest(0, coalesce(p_precio, 0));
  v_gratuito boolean := coalesce(p_gratuito, v_precio <= 0);
begin
  if p_curso_id is null then
    raise exception 'Curso requerido';
  end if;

  select d.documento into v_doc
  from public.documento_borrador_curso d
  where d.curso_id = p_curso_id;

  if v_doc is null then
    v_doc := '{}'::jsonb;
  end if;

  v_doc := v_doc || jsonb_build_object(
    'precio', v_precio,
    'gratuito', v_gratuito,
    'moneda', coalesce(nullif(trim(p_moneda), ''), 'PEN'),
    'comercializadoEn', now()
  );

  insert into public.documento_borrador_curso (curso_id, documento, actualizado_en)
  values (p_curso_id, v_doc, now())
  on conflict (curso_id) do update
    set documento = excluded.documento,
        actualizado_en = now();

  return jsonb_build_object(
    'ok', true,
    'cursoId', p_curso_id,
    'precio', v_precio,
    'gratuito', v_gratuito
  );
end;
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
      'creadoEn', v_curso.creado_en,
      'actualizadoEn', v_curso.actualizado_en,
      'versionRegistro', v_curso.version_registro,
      'versiones', v_versiones
    )
  );
end;
$$;

revoke all on function public.servicio_guardar_comercializacion_curso(uuid, numeric, boolean, text)
  from public, anon, authenticated;
revoke all on function public.servicio_listar_cursos_tipados(integer)
  from public, anon, authenticated;
revoke all on function public.servicio_obtener_curso_tipado(uuid)
  from public, anon, authenticated;

grant execute on function public.servicio_guardar_comercializacion_curso(uuid, numeric, boolean, text)
  to service_role;
grant execute on function public.servicio_listar_cursos_tipados(integer) to service_role;
grant execute on function public.servicio_obtener_curso_tipado(uuid) to service_role;

commit;
