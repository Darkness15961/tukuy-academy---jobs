-- WP7 · Matrícula pendiente (solicitud) + activar (aprobación org).
-- Ejecutar en el SQL Editor del proyecto SECUNDARIO.

begin;

create or replace function public.servicio_matricular_con_estado(
  p_curso_id uuid,
  p_estudiante_identidad_ref uuid,
  p_origen text default 'SOLICITUD',
  p_estados_preferidos text[] default array['PENDIENTE', 'SOLICITADA', 'EN_REVISION']
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_edicion jsonb;
  v_edicion_id uuid;
  v_matricula_id uuid;
  v_estado_actual text;
  v_estado text;
  v_cast_estado text;
  v_origen text;
  v_cast_origen text;
begin
  if p_curso_id is null or p_estudiante_identidad_ref is null then
    raise exception 'Curso y estudiante requeridos';
  end if;

  v_edicion := public.servicio_asegurar_edicion_curso(
    p_curso_id,
    p_estudiante_identidad_ref
  );
  v_edicion_id := (v_edicion->>'edicionId')::uuid;

  select m.id, m.estado::text
    into v_matricula_id, v_estado_actual
  from public.matricula_curso m
  where m.edicion_curso_id = v_edicion_id
    and m.estudiante_identidad_ref = p_estudiante_identidad_ref;

  if v_matricula_id is not null then
    return jsonb_build_object(
      'ok', true,
      'matriculaId', v_matricula_id,
      'edicionId', v_edicion_id,
      'cursoId', p_curso_id,
      'estudianteIdentidadRef', p_estudiante_identidad_ref,
      'estado', v_estado_actual,
      'yaExistia', true
    );
  end if;

  v_matricula_id := gen_random_uuid();
  v_estado := public._servicio_resolver_enum_tabla(
    'matricula_curso',
    'estado',
    coalesce(p_estados_preferidos, array['PENDIENTE', 'SOLICITADA', 'EN_REVISION'])
  );
  v_cast_estado := public._servicio_sql_tipo_cast('matricula_curso', 'estado');
  if v_estado is null or v_cast_estado is null then
    raise exception 'No se pudo resolver estado PENDIENTE de matricula';
  end if;

  v_origen := public._servicio_resolver_enum_tabla(
    'matricula_curso',
    'origen',
    array[
      coalesce(nullif(trim(p_origen), ''), 'SOLICITUD'),
      'SOLICITUD',
      'INSCRIPCION_DIRECTA',
      'MANUAL',
      'DIRECTA',
      'AUTO'
    ]
  );
  v_cast_origen := public._servicio_sql_tipo_cast('matricula_curso', 'origen');

  execute format(
    'insert into public.matricula_curso (
       id, edicion_curso_id, estudiante_identidad_ref, origen, origen_ref,
       estado, progreso_porcentaje, nota_final, matriculado_en
     ) values (
       $1, $2, $3, $4::%s, null, $5::%s, 0, null, now()
     )',
    v_cast_origen,
    v_cast_estado
  )
  using
    v_matricula_id,
    v_edicion_id,
    p_estudiante_identidad_ref,
    v_origen,
    v_estado;

  return jsonb_build_object(
    'ok', true,
    'matriculaId', v_matricula_id,
    'edicionId', v_edicion_id,
    'cursoId', p_curso_id,
    'estudianteIdentidadRef', p_estudiante_identidad_ref,
    'estado', v_estado,
    'yaExistia', false
  );
end;
$$;

revoke all on function public.servicio_matricular_con_estado(uuid, uuid, text, text[])
  from public, anon, authenticated;
grant execute on function public.servicio_matricular_con_estado(uuid, uuid, text, text[])
  to service_role;

create or replace function public.servicio_activar_matricula(
  p_matricula_id uuid,
  p_actor_identidad_ref uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_mat public.matricula_curso%rowtype;
  v_estado text;
  v_cast text;
begin
  if p_matricula_id is null then
    raise exception 'matriculaId requerido';
  end if;

  select * into v_mat
  from public.matricula_curso m
  where m.id = p_matricula_id;
  if not found then
    raise exception 'Matricula no encontrada';
  end if;

  v_estado := public._servicio_resolver_enum_tabla(
    'matricula_curso',
    'estado',
    array['ACTIVA', 'ACTIVO', 'INSCRITO', 'MATRICULADO', 'EN_CURSO']
  );
  v_cast := public._servicio_sql_tipo_cast('matricula_curso', 'estado');
  if v_estado is null or v_cast is null then
    raise exception 'No se pudo resolver estado ACTIVO de matricula';
  end if;

  execute format(
    'update public.matricula_curso
     set estado = $1::%s,
         matriculado_en = coalesce(matriculado_en, now())
     where id = $2
     returning *',
    v_cast
  )
  into v_mat
  using v_estado, p_matricula_id;

  return jsonb_build_object(
    'ok', true,
    'matriculaId', v_mat.id,
    'estado', v_mat.estado::text,
    'estudianteId', v_mat.estudiante_identidad_ref,
    'cursoId', (
      select c.id
      from public.edicion_curso e
      join public.version_curso v on v.id = e.version_curso_id
      join public.curso c on c.id = v.curso_id
      where e.id = v_mat.edicion_curso_id
      limit 1
    ),
    'activadoPor', p_actor_identidad_ref
  );
end;
$$;

revoke all on function public.servicio_activar_matricula(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.servicio_activar_matricula(uuid, uuid)
  to service_role;

commit;
