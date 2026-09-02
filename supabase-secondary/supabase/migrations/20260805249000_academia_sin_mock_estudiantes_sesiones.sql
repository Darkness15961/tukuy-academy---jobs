-- Academia sin mock · estudiantes + estado de sesión.
-- Ejecutar en el SQL Editor del proyecto SECUNDARIO.
begin;

alter table public.sesion_en_vivo
  add column if not exists estado character varying not null default 'PROGRAMADA';

create or replace function public.servicio_listar_estudiantes_matriculas(
  p_curso_id uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_items jsonb;
begin
  select coalesce(jsonb_agg(item order by item->>'curso', item->>'nombre'), '[]'::jsonb)
  into v_items
  from (
    select jsonb_build_object(
      'id', m.id,
      'alumnoId', m.estudiante_identidad_ref,
      'cursoId', c.id,
      'nombre', coalesce(a.nombre_mostrar, a.correo, 'Estudiante'),
      'iniciales', upper(left(coalesce(a.nombre_mostrar, a.correo, 'ES'), 2)),
      'curso', c.titulo,
      'organizacion', coalesce(
        (select ci.nombre_organizacion from public.contexto_instalacion ci where ci.id = true),
        'Tukuy Academy'
      ),
      'progreso', m.progreso_porcentaje,
      'ultimoAcceso', coalesce(m.matriculado_en::text, now()::text),
      'ultimoAccesoFecha', coalesce(m.matriculado_en::text, now()::text),
      'fechaInscripcion', m.matriculado_en,
      'estado', m.estado::text
    ) as item
    from public.matricula_curso m
    join public.edicion_curso e on e.id = m.edicion_curso_id
    join public.version_curso v on v.id = e.version_curso_id
    join public.curso c on c.id = v.curso_id
    left join public.acceso_identidad_principal a
      on a.identidad_principal_ref = m.estudiante_identidad_ref
    where p_curso_id is null or c.id = p_curso_id
  ) listado;

  return jsonb_build_object(
    'ok', true,
    'total', jsonb_array_length(v_items),
    'estudiantes', v_items
  );
end;
$$;

create or replace function public.servicio_actualizar_estado_sesion(
  p_sesion_id uuid,
  p_estado text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_estado text := upper(trim(coalesce(p_estado, '')));
  v_sesion public.sesion_en_vivo%rowtype;
begin
  if p_sesion_id is null then
    raise exception 'Sesion requerida';
  end if;
  if v_estado not in ('PROGRAMADA', 'HOY', 'EN_VIVO', 'FINALIZADA', 'CANCELADA') then
    raise exception 'Estado de sesion invalido';
  end if;

  -- Solo acorta termina_en si ya empezó (evita chk_sesion_horario).
  update public.sesion_en_vivo
  set
    estado = v_estado,
    termina_en = case
      when v_estado = 'CANCELADA'
        and termina_en > now()
        and now() > inicia_en
      then now()
      else termina_en
    end
  where id = p_sesion_id
  returning * into v_sesion;

  if not found then
    raise exception 'Sesion no encontrada';
  end if;

  return jsonb_build_object(
    'ok', true,
    'sesion', (
      select jsonb_build_object(
        'id', s.id,
        'edicionId', s.edicion_curso_id,
        'cursoId', c.id,
        'cursoTitulo', c.titulo,
        'titulo', s.titulo,
        'urlAcceso', s.url_acceso,
        'iniciaEn', s.inicia_en,
        'terminaEn', s.termina_en,
        'estado', s.estado,
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
    )
  );
end;
$$;

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
      'estado', coalesce(s.estado, 'PROGRAMADA'),
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

create or replace function public.servicio_actualizar_estado_curso(
  p_curso_id uuid,
  p_estado text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_estado text;
  v_tipo text;
begin
  if p_curso_id is null then
    raise exception 'Curso requerido';
  end if;

  v_estado := public._servicio_resolver_enum_curso(
    'estado',
    array[
      upper(trim(coalesce(p_estado, 'BORRADOR'))),
      'BORRADOR',
      'EN_REVISION',
      'PUBLICADO',
      'ARCHIVADO',
      'ACTIVO'
    ]
  );

  select c.udt_name into v_tipo
  from information_schema.columns c
  where c.table_schema = 'public' and c.table_name = 'curso' and c.column_name = 'estado';

  execute format(
    'update public.curso
     set estado = $2::%I,
         actualizado_en = now(),
         version_registro = version_registro + 1
     where id = $1',
    v_tipo
  )
  using p_curso_id, v_estado;

  return jsonb_build_object(
    'ok', true,
    'curso', (public.servicio_obtener_curso_tipado(p_curso_id))->'curso'
  );
end;
$$;

revoke all on function public.servicio_listar_estudiantes_matriculas(uuid) from public, anon, authenticated;
revoke all on function public.servicio_actualizar_estado_sesion(uuid, text) from public, anon, authenticated;
revoke all on function public.servicio_actualizar_estado_curso(uuid, text) from public, anon, authenticated;

grant execute on function public.servicio_listar_estudiantes_matriculas(uuid) to service_role;
grant execute on function public.servicio_actualizar_estado_sesion(uuid, text) to service_role;
grant execute on function public.servicio_actualizar_estado_curso(uuid, text) to service_role;

commit;
