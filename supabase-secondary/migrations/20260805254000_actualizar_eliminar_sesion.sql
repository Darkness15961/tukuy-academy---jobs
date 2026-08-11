-- Academia 100% secundaria · actualizar / eliminar sesión en vivo.
-- Ejecutar en el SQL Editor del proyecto SECUNDARIO.
begin;

create or replace function public._servicio_json_sesion_en_vivo(p_sesion_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  return (
    select jsonb_build_object(
      'id', s.id,
      'edicionId', s.edicion_curso_id,
      'cursoId', c.id,
      'cursoTitulo', c.titulo,
      'titulo', s.titulo,
      'urlAcceso', s.url_acceso,
      'iniciaEn', s.inicia_en,
      'terminaEn', s.termina_en,
      'estado', coalesce(s.estado, 'PROGRAMADA'),
      'inscritos', (
        select count(*)::int
        from public.asistencia_sesion a
        where a.sesion_en_vivo_id = s.id
      )
    )
    from public.sesion_en_vivo s
    join public.edicion_curso e on e.id = s.edicion_curso_id
    join public.version_curso v on v.id = e.version_curso_id
    join public.curso c on c.id = v.curso_id
    where s.id = p_sesion_id
  );
end;
$$;

create or replace function public.servicio_actualizar_sesion_en_vivo(
  p_sesion_id uuid,
  p_titulo text default null,
  p_inicia_en timestamptz default null,
  p_termina_en timestamptz default null,
  p_url_acceso text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sesion public.sesion_en_vivo%rowtype;
  v_titulo text;
  v_inicia timestamptz;
  v_termina timestamptz;
begin
  if p_sesion_id is null then
    raise exception 'Sesion requerida';
  end if;

  select * into v_sesion
  from public.sesion_en_vivo
  where id = p_sesion_id;
  if not found then
    raise exception 'Sesion no encontrada';
  end if;

  v_titulo := coalesce(nullif(trim(p_titulo), ''), v_sesion.titulo);
  v_inicia := coalesce(p_inicia_en, v_sesion.inicia_en);
  v_termina := coalesce(p_termina_en, v_sesion.termina_en);

  if v_termina <= v_inicia then
    raise exception 'La hora de fin debe ser posterior al inicio';
  end if;

  update public.sesion_en_vivo
  set
    titulo = v_titulo,
    inicia_en = v_inicia,
    termina_en = v_termina,
    url_acceso = case
      when p_url_acceso is null then url_acceso
      else nullif(trim(p_url_acceso), '')
    end
  where id = p_sesion_id;

  return jsonb_build_object(
    'ok', true,
    'sesion', public._servicio_json_sesion_en_vivo(p_sesion_id)
  );
end;
$$;

create or replace function public.servicio_eliminar_sesion_en_vivo(
  p_sesion_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_sesion_id is null then
    raise exception 'Sesion requerida';
  end if;

  if not exists (
    select 1 from public.sesion_en_vivo where id = p_sesion_id
  ) then
    raise exception 'Sesion no encontrada';
  end if;

  delete from public.asistencia_sesion
  where sesion_en_vivo_id = p_sesion_id;

  delete from public.sesion_en_vivo
  where id = p_sesion_id;

  return jsonb_build_object('ok', true, 'sesionId', p_sesion_id);
end;
$$;

revoke all on function public._servicio_json_sesion_en_vivo(uuid)
  from public, anon, authenticated;
revoke all on function public.servicio_actualizar_sesion_en_vivo(uuid, text, timestamptz, timestamptz, text)
  from public, anon, authenticated;
revoke all on function public.servicio_eliminar_sesion_en_vivo(uuid)
  from public, anon, authenticated;

grant execute on function public._servicio_json_sesion_en_vivo(uuid) to service_role;
grant execute on function public.servicio_actualizar_sesion_en_vivo(uuid, text, timestamptz, timestamptz, text)
  to service_role;
grant execute on function public.servicio_eliminar_sesion_en_vivo(uuid) to service_role;

commit;
