-- Exponer flag certificado en listados del alumno (desde borrador del curso).

create or replace function public._servicio_certificado_habilitado_curso(p_curso_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select case
        when d.documento ? 'certificado'
          then coalesce((d.documento->>'certificado')::boolean, true)
        else true
      end
      from public.documento_borrador_curso d
      where d.curso_id = p_curso_id
      limit 1
    ),
    true
  );
$$;

create or replace function public.servicio_listar_mis_cursos(
  p_estudiante_identidad_ref uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_cursos jsonb;
begin
  if p_estudiante_identidad_ref is null then
    raise exception 'Estudiante requerido';
  end if;

  select coalesce(jsonb_agg(item order by item->>'matriculadoEn' desc), '[]'::jsonb)
  into v_cursos
  from (
    select jsonb_build_object(
      'matriculaId', m.id,
      'cursoId', c.id,
      'edicionId', e.id,
      'codigo', c.codigo,
      'titulo', c.titulo,
      'resumen', c.resumen,
      'categoria', c.categoria,
      'modalidad', c.modalidad::text,
      'estadoCurso', c.estado::text,
      'estadoMatricula', m.estado::text,
      'progresoPorcentaje', m.progreso_porcentaje,
      'matriculadoEn', m.matriculado_en,
      'certificado', public._servicio_certificado_habilitado_curso(c.id),
      'totalActividades', (
        select count(*)::int
        from public.actividad_curso a
        join public.modulo_curso mo on mo.id = a.modulo_curso_id
        where mo.version_curso_id = e.version_curso_id
      ),
      'actividadesCompletadas', (
        select count(*)::int
        from public.progreso_actividad p
        where p.matricula_curso_id = m.id
          and upper(p.estado) in ('COMPLETADA', 'COMPLETADO', 'DONE')
      )
    ) as item
    from public.matricula_curso m
    join public.edicion_curso e on e.id = m.edicion_curso_id
    join public.version_curso v on v.id = e.version_curso_id
    join public.curso c on c.id = v.curso_id
    where m.estudiante_identidad_ref = p_estudiante_identidad_ref
  ) listado;

  return jsonb_build_object(
    'ok', true,
    'total', coalesce(jsonb_array_length(v_cursos), 0),
    'cursos', v_cursos
  );
end;
$$;

-- Parche listado tipado: certificado en catálogo
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
      'certificado', public._servicio_certificado_habilitado_curso(c.id),
      'duracionMinutosTotal', public._servicio_duracion_minutos_curso(c.id),
      'totalLecciones', public._servicio_total_lecciones_curso(c.id),
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
    'total', coalesce(jsonb_array_length(v_cursos), 0),
    'cursos', v_cursos,
    'generadoEn', now()
  );
end;
$$;

revoke all on function public._servicio_certificado_habilitado_curso(uuid)
  from public, anon, authenticated;
grant execute on function public._servicio_certificado_habilitado_curso(uuid)
  to service_role;

revoke all on function public.servicio_listar_mis_cursos(uuid)
  from public, anon, authenticated;
grant execute on function public.servicio_listar_mis_cursos(uuid)
  to service_role;

revoke all on function public.servicio_listar_cursos_tipados(integer)
  from public, anon, authenticated;
grant execute on function public.servicio_listar_cursos_tipados(integer)
  to service_role;
