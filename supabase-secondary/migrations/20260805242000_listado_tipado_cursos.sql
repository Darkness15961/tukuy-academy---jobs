-- Fase 2 · listado tipado de cursos (curso + version_curso).
-- Ejecutar en el SQL Editor del proyecto SECUNDARIO.
begin;

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
begin
  if p_curso_id is null then
    raise exception 'Curso requerido';
  end if;

  select * into v_curso
  from public.curso
  where id = p_curso_id;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'error', 'Curso no encontrado'
    );
  end if;

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
      'creadoEn', v_curso.creado_en,
      'actualizadoEn', v_curso.actualizado_en,
      'versionRegistro', v_curso.version_registro,
      'versiones', v_versiones
    )
  );
end;
$$;

-- Seed opcional: 1 curso demo si la tabla está vacía y ya hay membresía sincronizada.
do $$
declare
  v_autor uuid;
  v_curso_id uuid := 'a1000000-0000-4000-8000-000000000001';
  v_version_id uuid := 'a1000000-0000-4000-8000-000000000002';
  v_modalidad public.curso;
  v_estado public.curso;
begin
  if exists (select 1 from public.curso) then
    return;
  end if;

  select identidad_usuario_ref
    into v_autor
  from public.membresia_organizacion
  order by actualizada_en desc
  limit 1;

  if v_autor is null then
    return;
  end if;

  begin
    select * into v_modalidad
    from jsonb_populate_record(
      null::public.curso,
      jsonb_build_object('modalidad', 'VIRTUAL')
    );
  exception
    when others then
      begin
        select * into v_modalidad
        from jsonb_populate_record(
          null::public.curso,
          jsonb_build_object('modalidad', 'EN_VIVO')
        );
      exception
        when others then
          return;
      end;
  end;

  begin
    select * into v_estado
    from jsonb_populate_record(
      null::public.curso,
      jsonb_build_object('estado', 'BORRADOR')
    );
  exception
    when others then
      return;
  end;

  insert into public.curso (
    id, autor_identidad_ref, codigo, titulo, resumen, categoria,
    modalidad, estado, creado_en, actualizado_en, version_registro
  ) values (
    v_curso_id,
    v_autor,
    'DEMO-001',
    'Curso demo Tukuy (secundaria)',
    'Curso semilla para validar el listado tipado vía gateway.',
    'Integración',
    v_modalidad.modalidad,
    v_estado.estado,
    now(),
    now(),
    1
  )
  on conflict (id) do nothing;

  insert into public.version_curso (
    id, curso_id, numero, titulo_historico, horas, nota_minima, nota_maxima, estado
  ) values (
    v_version_id,
    v_curso_id,
    1,
    'Curso demo Tukuy (secundaria)',
    4,
    11,
    20,
    'BORRADOR'
  )
  on conflict (id) do nothing;
end;
$$;

revoke all on function public.servicio_listar_cursos_tipados(integer) from public, anon, authenticated;
revoke all on function public.servicio_obtener_curso_tipado(uuid) from public, anon, authenticated;
grant execute on function public.servicio_listar_cursos_tipados(integer) to service_role;
grant execute on function public.servicio_obtener_curso_tipado(uuid) to service_role;

commit;
