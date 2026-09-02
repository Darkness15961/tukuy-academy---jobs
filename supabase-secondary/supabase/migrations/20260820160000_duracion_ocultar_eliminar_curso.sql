-- Duración real (sin inventar 1 min) + listado admin incluye ocultos (RETIRADO)
-- + eliminación permanente de material (solo org admin vía gateway).

begin;

-- 1) Suma real: no contar null/0 como 1 minuto
create or replace function public._servicio_duracion_minutos_curso(p_curso_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    sum(a.duracion_minutos) filter (
      where a.duracion_minutos is not null and a.duracion_minutos > 0
    ),
    0
  )::int
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

-- 2) Contar lecciones (actividades activas de la versión actual)
create or replace function public._servicio_total_lecciones_curso(p_curso_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(count(*), 0)::int
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

-- Parche listado tipado: exponer totalLecciones
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
    'total', jsonb_array_length(v_cursos),
    'cursos', v_cursos,
    'generadoEn', now()
  );
end;
$$;

-- 3) Eliminación permanente (material): archiva y marca eliminado en borrador
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
begin
  if p_curso_id is null then
    raise exception 'Curso requerido';
  end if;

  select * into v_curso from public.curso where id = p_curso_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Curso no encontrado');
  end if;

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

  -- Desactiva actividades para que no aparezcan en sumas / reproductor nuevo
  update public.actividad_curso a
  set activa = false
  from public.modulo_curso m
  join public.version_curso v on v.id = m.version_curso_id
  where a.modulo_curso_id = m.id
    and v.curso_id = p_curso_id;

  return public.servicio_obtener_curso_tipado(p_curso_id);
end;
$$;

revoke all on function public.servicio_eliminar_curso_permanente(uuid) from public;
grant execute on function public.servicio_eliminar_curso_permanente(uuid) to service_role;

commit;
