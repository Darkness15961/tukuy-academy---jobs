-- Listado tipado: exponer visibilidad del borrador (catálogo público vs interno).

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
      'visibilidad', coalesce((
        select nullif(trim(d.documento->>'visibilidad'), '')
        from public.documento_borrador_curso d
        where d.curso_id = c.id
      ), 'PUBLICO'),
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

commit;
