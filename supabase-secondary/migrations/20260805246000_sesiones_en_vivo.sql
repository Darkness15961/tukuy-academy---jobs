-- Fase 6 · sesiones en vivo mínimas (listar / crear).
-- Ejecutar en el SQL Editor del proyecto SECUNDARIO.
begin;

create or replace function public.servicio_listar_sesiones_en_vivo(
  p_curso_id uuid default null,
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
  v_sesiones jsonb;
begin
  select coalesce(jsonb_agg(item order by item->>'iniciaEn' asc), '[]'::jsonb)
  into v_sesiones
  from (
    select jsonb_build_object(
      'id', s.id,
      'edicionId', s.edicion_curso_id,
      'cursoId', c.id,
      'cursoTitulo', c.titulo,
      'titulo', s.titulo,
      'urlAcceso', s.url_acceso,
      'iniciaEn', s.inicia_en,
      'terminaEn', s.termina_en,
      'inscritos', (
        select count(*)::int
        from public.asistencia_sesion a
        where a.sesion_en_vivo_id = s.id
      )
    ) as item
    from public.sesion_en_vivo s
    join public.edicion_curso e on e.id = s.edicion_curso_id
    join public.version_curso v on v.id = e.version_curso_id
    join public.curso c on c.id = v.curso_id
    where p_curso_id is null or c.id = p_curso_id
    order by s.inicia_en asc
    limit v_limite
  ) listado;

  return jsonb_build_object(
    'ok', true,
    'total', jsonb_array_length(v_sesiones),
    'sesiones', v_sesiones
  );
end;
$$;

create or replace function public.servicio_crear_sesion_en_vivo(
  p_curso_id uuid,
  p_titulo text,
  p_inicia_en timestamptz,
  p_termina_en timestamptz,
  p_url_acceso text default null,
  p_docente_identidad_ref uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_edicion jsonb;
  v_edicion_id uuid;
  v_sesion_id uuid;
  v_curso_titulo text;
begin
  if p_curso_id is null then
    raise exception 'Curso requerido';
  end if;
  if nullif(trim(coalesce(p_titulo, '')), '') is null then
    raise exception 'Titulo requerido';
  end if;
  if p_inicia_en is null or p_termina_en is null then
    raise exception 'Horario requerido';
  end if;
  if p_termina_en <= p_inicia_en then
    raise exception 'La hora de fin debe ser posterior al inicio';
  end if;

  select c.titulo into v_curso_titulo
  from public.curso c
  where c.id = p_curso_id;
  if v_curso_titulo is null then
    raise exception 'Curso no encontrado';
  end if;

  v_edicion := public.servicio_asegurar_edicion_curso(
    p_curso_id,
    p_docente_identidad_ref
  );
  v_edicion_id := (v_edicion->>'edicionId')::uuid;
  v_sesion_id := gen_random_uuid();

  insert into public.sesion_en_vivo (
    id, edicion_curso_id, titulo, url_acceso, inicia_en, termina_en
  ) values (
    v_sesion_id,
    v_edicion_id,
    trim(p_titulo),
    nullif(trim(coalesce(p_url_acceso, '')), ''),
    p_inicia_en,
    p_termina_en
  );

  return jsonb_build_object(
    'ok', true,
    'sesion', jsonb_build_object(
      'id', v_sesion_id,
      'edicionId', v_edicion_id,
      'cursoId', p_curso_id,
      'cursoTitulo', v_curso_titulo,
      'titulo', trim(p_titulo),
      'urlAcceso', nullif(trim(coalesce(p_url_acceso, '')), ''),
      'iniciaEn', p_inicia_en,
      'terminaEn', p_termina_en,
      'inscritos', 0
    )
  );
end;
$$;

revoke all on function public.servicio_listar_sesiones_en_vivo(uuid, integer)
  from public, anon, authenticated;
revoke all on function public.servicio_crear_sesion_en_vivo(uuid, text, timestamptz, timestamptz, text, uuid)
  from public, anon, authenticated;
grant execute on function public.servicio_listar_sesiones_en_vivo(uuid, integer) to service_role;
grant execute on function public.servicio_crear_sesion_en_vivo(uuid, text, timestamptz, timestamptz, text, uuid)
  to service_role;

commit;
