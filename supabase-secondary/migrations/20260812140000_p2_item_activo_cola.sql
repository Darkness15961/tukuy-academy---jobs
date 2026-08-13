-- P2 LMS: item activo persistido en matrícula + contenido lo expone.
-- Ejecutar en secundaria después de 12130000.

begin;

alter table public.matricula_curso
  add column if not exists item_activo_ref uuid;

create or replace function public.servicio_guardar_item_activo(
  p_curso_id uuid,
  p_estudiante_identidad_ref uuid,
  p_actividad_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_mat jsonb;
  v_matricula_id uuid;
begin
  if p_curso_id is null or p_estudiante_identidad_ref is null then
    raise exception 'Curso y estudiante requeridos';
  end if;

  v_mat := public.servicio_matricular_estudiante(
    p_curso_id,
    p_estudiante_identidad_ref,
    'PROGRESO_ACTIVIDAD'
  );
  v_matricula_id := (v_mat->>'matriculaId')::uuid;

  if p_actividad_id is not null then
    if not exists (
      select 1
      from public.actividad_curso a
      join public.modulo_curso mo on mo.id = a.modulo_curso_id
      join public.edicion_curso e on e.version_curso_id = mo.version_curso_id
      join public.matricula_curso m on m.edicion_curso_id = e.id
      where a.id = p_actividad_id
        and m.id = v_matricula_id
    ) then
      raise exception 'Actividad no pertenece a la version de la matricula';
    end if;
  end if;

  update public.matricula_curso
  set item_activo_ref = p_actividad_id
  where id = v_matricula_id;

  return jsonb_build_object(
    'ok', true,
    'matriculaId', v_matricula_id,
    'itemActivoId', p_actividad_id
  );
end;
$$;

create or replace function public.servicio_obtener_contenido_aprendizaje(
  p_curso_id uuid,
  p_estudiante_identidad_ref uuid default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_curso jsonb;
  v_version_id uuid;
  v_matricula_id uuid;
  v_modulos jsonb;
  v_quizzes jsonb := '{}'::jsonb;
  v_notas jsonb := '{}'::jsonb;
  v_completadas text[];
  v_progreso numeric := 0;
  v_apuntes text := '';
  v_item record;
  v_banco jsonb;
  v_nota_minima numeric := 14;
  v_item_activo uuid;
begin
  if p_curso_id is null then
    raise exception 'Curso requerido';
  end if;

  v_curso := (public.servicio_obtener_curso_tipado(p_curso_id))->'curso';
  if v_curso is null then
    return jsonb_build_object('ok', false, 'error', 'Curso no encontrado');
  end if;

  if p_estudiante_identidad_ref is not null then
    select m.id, m.progreso_porcentaje, e.version_curso_id, m.item_activo_ref
      into v_matricula_id, v_progreso, v_version_id, v_item_activo
    from public.matricula_curso m
    join public.edicion_curso e on e.id = m.edicion_curso_id
    join public.version_curso v on v.id = e.version_curso_id
    where v.curso_id = p_curso_id
      and m.estudiante_identidad_ref = p_estudiante_identidad_ref
    order by m.matriculado_en desc nulls last
    limit 1;
  end if;

  if v_version_id is null then
    v_version_id := public._servicio_version_publicada(p_curso_id);
  end if;

  if v_version_id is null then
    return jsonb_build_object('ok', false, 'error', 'Curso sin versión');
  end if;

  select coalesce(v.nota_minima, 14) into v_nota_minima
  from public.version_curso v
  where v.id = v_version_id;

  perform public._servicio_asegurar_actividad_quiz(v_version_id);

  if v_matricula_id is not null then
    select coalesce(array_agg(p.actividad_ref::text), '{}')
      into v_completadas
    from public.progreso_actividad p
    join public.actividad_curso a on a.id = p.actividad_ref
    join public.modulo_curso mo on mo.id = a.modulo_curso_id
    where p.matricula_curso_id = v_matricula_id
      and mo.version_curso_id = v_version_id
      and upper(p.estado) in ('COMPLETADA', 'COMPLETADO', 'DONE');

    select coalesce(
      jsonb_object_agg(p.actividad_ref::text, p.mejor_nota),
      '{}'::jsonb
    )
      into v_notas
    from public.progreso_actividad p
    where p.matricula_curso_id = v_matricula_id
      and p.mejor_nota is not null;

    select coalesce(a.texto, '') into v_apuntes
    from public.apuntes_matricula a
    where a.matricula_curso_id = v_matricula_id;
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', mo.id,
      'title', mo.titulo,
      'orden', mo.orden,
      'items', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'id', a.id,
            'title', a.titulo,
            'type', case lower(a.tipo::text)
              when 'video' then 'video'
              when 'quiz' then 'quiz'
              when 'cuestionario' then 'quiz'
              when 'assignment' then 'assignment'
              when 'entrega_pdf' then 'assignment'
              else 'reading'
            end,
            'duration', case
              when a.duracion_minutos is null then null
              else a.duracion_minutos::text || ' min'
            end,
            'description', coalesce(a.instrucciones, a.titulo),
            'questions', case
              when a.banco_preguntas is not null
                and jsonb_typeof(a.banco_preguntas) = 'array'
              then jsonb_array_length(a.banco_preguntas)
              else null
            end,
            'videoUrl', a.url_contenido
          )
          order by a.orden
        )
        from public.actividad_curso a
        where a.modulo_curso_id = mo.id
      ), '[]'::jsonb)
    )
    order by mo.orden
  ), '[]'::jsonb)
  into v_modulos
  from public.modulo_curso mo
  where mo.version_curso_id = v_version_id;

  for v_item in
    select a.id, a.banco_preguntas
    from public.actividad_curso a
    join public.modulo_curso mo on mo.id = a.modulo_curso_id
    where mo.version_curso_id = v_version_id
      and lower(a.tipo::text) in ('quiz', 'cuestionario')
  loop
    v_banco := coalesce(
      case
        when v_item.banco_preguntas is not null
          and jsonb_typeof(v_item.banco_preguntas) = 'array'
          and jsonb_array_length(v_item.banco_preguntas) > 0
        then v_item.banco_preguntas
        else null
      end,
      public._servicio_banco_preguntas_demo()
    );
    v_quizzes := v_quizzes || jsonb_build_object(
      v_item.id::text,
      public._servicio_quiz_sin_respuestas(v_banco)
    );
  end loop;

  return jsonb_build_object(
    'ok', true,
    'curso', v_curso,
    'matriculaId', v_matricula_id,
    'versionId', v_version_id,
    'notaMinima', v_nota_minima,
    'itemActivoId', v_item_activo,
    'progresoPorcentaje', coalesce(v_progreso, 0),
    'itemsCompletados', to_jsonb(coalesce(v_completadas, '{}'::text[])),
    'notas', coalesce(v_notas, '{}'::jsonb),
    'apuntes', coalesce(v_apuntes, ''),
    'contenido', jsonb_build_object(
      'id', p_curso_id,
      'modulos', coalesce(v_modulos, '[]'::jsonb),
      'quizzes', coalesce(v_quizzes, '{}'::jsonb)
    )
  );
end;
$$;

revoke all on function public.servicio_guardar_item_activo(uuid, uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.servicio_obtener_contenido_aprendizaje(uuid, uuid)
  from public, anon, authenticated;

grant execute on function public.servicio_guardar_item_activo(uuid, uuid, uuid)
  to service_role;
grant execute on function public.servicio_obtener_contenido_aprendizaje(uuid, uuid)
  to service_role;

commit;
