-- Eliminación permanente: desvincular matrículas, borrar sesiones y ocultar del listado.

begin;

create or replace function public.servicio_eliminar_curso_permanente(
  p_curso_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_curso public.curso%rowtype;
  v_estado_cancel text;
  v_cast_estado text;
  v_sesion_id uuid;
begin
  if p_curso_id is null then
    raise exception 'Curso requerido';
  end if;

  select * into v_curso from public.curso where id = p_curso_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Curso no encontrado');
  end if;

  v_estado_cancel := public._servicio_resolver_enum_tabla(
    'matricula_curso',
    'estado',
    array['CANCELADA', 'INACTIVA', 'RETIRADA', 'BAJA']
  );
  v_cast_estado := public._servicio_sql_tipo_cast('matricula_curso', 'estado');
  if v_estado_cancel is not null and v_cast_estado is not null then
    execute format(
      'update public.matricula_curso m
       set estado = $1::%s
       from public.edicion_curso e
       join public.version_curso v on v.id = e.version_curso_id
       where m.edicion_curso_id = e.id
         and v.curso_id = $2
         and upper(trim(coalesce(m.estado::text, ''''))) not in (
           ''CANCELADA'', ''INACTIVA'', ''RETIRADA'', ''BAJA''
         )',
      v_cast_estado
    )
    using v_estado_cancel, p_curso_id;
  end if;

  for v_sesion_id in
    select s.id
    from public.sesion_en_vivo s
    join public.edicion_curso e on e.id = s.edicion_curso_id
    join public.version_curso v on v.id = e.version_curso_id
    where v.curso_id = p_curso_id
  loop
    perform public.servicio_eliminar_sesion_en_vivo(v_sesion_id);
  end loop;

  update public.curso
  set
    estado = 'ARCHIVADO',
    actualizado_en = now(),
    version_registro = coalesce(version_registro, 0) + 1
  where id = p_curso_id;

  update public.documento_borrador_curso d
  set documento = coalesce(d.documento, '{}'::jsonb)
    || jsonb_build_object(
      'eliminadoPermanente', true,
      'eliminadoEn', now()
    )
  where d.curso_id = p_curso_id;

  update public.actividad_curso a
  set activa = false
  from public.modulo_curso m
  join public.version_curso v on v.id = m.version_curso_id
  where a.modulo_curso_id = m.id
    and v.curso_id = p_curso_id;

  return public.servicio_obtener_curso_tipado(p_curso_id);
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
    where not coalesce((
      select (d.documento->>'eliminadoPermanente')::boolean
      from public.documento_borrador_curso d
      where d.curso_id = c.id
    ), false)
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
