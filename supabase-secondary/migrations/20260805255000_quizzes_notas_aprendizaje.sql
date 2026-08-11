-- Quizzes + notas de calificación + apuntes del alumno.
-- Ejecutar en el SQL Editor del proyecto SECUNDARIO.
-- Requiere 20260805245000 (contenido/progreso) y preferible 20260805252200.
begin;

alter table public.actividad_curso
  add column if not exists banco_preguntas jsonb;

create table if not exists public.apuntes_matricula (
  matricula_curso_id uuid primary key
    references public.matricula_curso(id) on delete cascade,
  texto text not null default '',
  actualizado_en timestamptz not null default now()
);

create or replace function public._servicio_banco_preguntas_demo()
returns jsonb
language sql
immutable
as $$
  select jsonb_build_array(
    jsonb_build_object(
      'question', '¿Cuál es la función principal de una plataforma académica como Tukuy Academy?',
      'options', jsonb_build_array(
        'Solo almacenar PDFs sin seguimiento.',
        'Organizar cursos, progreso, evaluaciones y certificados de forma trazable.',
        'Reemplazar por completo la supervisión humana en obra.',
        'Eliminar la necesidad de docentes.'
      ),
      'correctIndex', 1
    ),
    jsonb_build_object(
      'question', '¿Qué indica una nota mínima de 14 sobre 20 en un cuestionario?',
      'options', jsonb_build_array(
        'Que el intento no se guarda.',
        'Que se aprueba el módulo al alcanzar o superar ese puntaje.',
        'Que el curso queda automáticamente certificado.',
        'Que solo el docente puede ver el resultado.'
      ),
      'correctIndex', 1
    ),
    jsonb_build_object(
      'question', '¿Por qué conviene marcar actividades completadas en el reproductor?',
      'options', jsonb_build_array(
        'Para inflar métricas sin aprender.',
        'Para reflejar el avance real y habilitar certificados cuando corresponda.',
        'Porque es obligatorio para iniciar sesión.',
        'Porque reemplaza la entrega de PDF.'
      ),
      'correctIndex', 1
    )
  );
$$;

create or replace function public._servicio_asegurar_actividad_quiz(
  p_version_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_modulo_id uuid;
  v_quiz_id uuid := 'b1000000-0000-4000-8000-000000000201';
begin
  if p_version_id is null then
    return;
  end if;

  if exists (
    select 1
    from public.actividad_curso a
    join public.modulo_curso m on m.id = a.modulo_curso_id
    where m.version_curso_id = p_version_id
      and (
        lower(a.tipo::text) in ('quiz', 'cuestionario')
        or a.banco_preguntas is not null
      )
  ) then
    -- Asegura banco en quizzes existentes sin preguntas.
    update public.actividad_curso a
    set banco_preguntas = public._servicio_banco_preguntas_demo()
    from public.modulo_curso m
    where m.id = a.modulo_curso_id
      and m.version_curso_id = p_version_id
      and lower(a.tipo::text) in ('quiz', 'cuestionario')
      and (a.banco_preguntas is null or jsonb_typeof(a.banco_preguntas) <> 'array'
           or jsonb_array_length(a.banco_preguntas) = 0);
    return;
  end if;

  select m.id into v_modulo_id
  from public.modulo_curso m
  where m.version_curso_id = p_version_id
  order by m.orden
  limit 1;

  if v_modulo_id is null then
    v_modulo_id := gen_random_uuid();
    insert into public.modulo_curso (id, version_curso_id, codigo, titulo, descripcion, orden)
    values (
      v_modulo_id,
      p_version_id,
      'MOD-QUIZ',
      'Evaluación formativa',
      'Módulo semilla de cuestionarios',
      50
    );
  end if;

  insert into public.actividad_curso (
    id, modulo_curso_id, codigo, tipo, titulo, instrucciones, duracion_minutos, orden, banco_preguntas
  ) values (
    v_quiz_id,
    v_modulo_id,
    'ACT-QUIZ-1',
    'quiz',
    'Cuestionario · conocimientos clave',
    'Responde el cuestionario. Nota mínima 14/20 para marcarlo como completado.',
    15,
    80,
    public._servicio_banco_preguntas_demo()
  )
  on conflict (id) do update set
    banco_preguntas = coalesce(
      nullif(public.actividad_curso.banco_preguntas, 'null'::jsonb),
      excluded.banco_preguntas
    ),
    tipo = excluded.tipo,
    titulo = excluded.titulo;
end;
$$;

create or replace function public.servicio_obtener_contenido_aprendizaje(
  p_curso_id uuid,
  p_estudiante_identidad_ref uuid default null
)
returns jsonb
language plpgsql
stable
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
begin
  if p_curso_id is null then
    raise exception 'Curso requerido';
  end if;

  v_curso := (public.servicio_obtener_curso_tipado(p_curso_id))->'curso';
  if v_curso is null then
    return jsonb_build_object('ok', false, 'error', 'Curso no encontrado');
  end if;

  select v.id into v_version_id
  from public.version_curso v
  where v.curso_id = p_curso_id
  order by v.numero desc
  limit 1;

  perform public._servicio_asegurar_actividad_quiz(v_version_id);

  if p_estudiante_identidad_ref is not null then
    select m.id, m.progreso_porcentaje
      into v_matricula_id, v_progreso
    from public.matricula_curso m
    join public.edicion_curso e on e.id = m.edicion_curso_id
    where e.version_curso_id = v_version_id
      and m.estudiante_identidad_ref = p_estudiante_identidad_ref
    limit 1;

    if v_matricula_id is not null then
      select coalesce(array_agg(p.actividad_ref::text), '{}')
        into v_completadas
      from public.progreso_actividad p
      where p.matricula_curso_id = v_matricula_id
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
            end
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
    join public.modulo_curso m on m.id = a.modulo_curso_id
    where m.version_curso_id = v_version_id
      and (
        lower(a.tipo::text) in ('quiz', 'cuestionario')
        or (a.banco_preguntas is not null and jsonb_typeof(a.banco_preguntas) = 'array')
      )
  loop
    v_quizzes := v_quizzes || jsonb_build_object(
      v_item.id::text,
      coalesce(
        case
          when v_item.banco_preguntas is not null
            and jsonb_typeof(v_item.banco_preguntas) = 'array'
            and jsonb_array_length(v_item.banco_preguntas) > 0
          then v_item.banco_preguntas
          else null
        end,
        public._servicio_banco_preguntas_demo()
      )
    );
  end loop;

  return jsonb_build_object(
    'ok', true,
    'curso', v_curso,
    'matriculaId', v_matricula_id,
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

create or replace function public.servicio_completar_actividad(
  p_curso_id uuid,
  p_estudiante_identidad_ref uuid,
  p_actividad_id uuid,
  p_nota numeric default null,
  p_marcar_completada boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_mat jsonb;
  v_matricula_id uuid;
  v_total integer := 0;
  v_hechas integer := 0;
  v_porcentaje numeric := 0;
  v_nota numeric := p_nota;
  v_estado text;
begin
  if p_curso_id is null or p_estudiante_identidad_ref is null or p_actividad_id is null then
    raise exception 'Curso, estudiante y actividad requeridos';
  end if;

  if not exists (select 1 from public.actividad_curso where id = p_actividad_id) then
    raise exception 'Actividad no encontrada';
  end if;

  if v_nota is not null and (v_nota < 0 or v_nota > 20) then
    raise exception 'La nota debe estar entre 0 y 20';
  end if;

  v_mat := public.servicio_matricular_estudiante(
    p_curso_id,
    p_estudiante_identidad_ref,
    'PROGRESO_ACTIVIDAD'
  );
  v_matricula_id := (v_mat->>'matriculaId')::uuid;

  v_estado := case
    when coalesce(p_marcar_completada, true) then 'COMPLETADA'
    else 'EN_PROGRESO'
  end;

  insert into public.progreso_actividad (
    id, matricula_curso_id, actividad_ref, estado, mejor_nota, completada_en
  ) values (
    gen_random_uuid(),
    v_matricula_id,
    p_actividad_id,
    v_estado,
    v_nota,
    case when coalesce(p_marcar_completada, true) then now() else null end
  )
  on conflict (matricula_curso_id, actividad_ref) do update set
    estado = case
      when upper(public.progreso_actividad.estado) in ('COMPLETADA', 'COMPLETADO', 'DONE')
        then public.progreso_actividad.estado
      when coalesce(p_marcar_completada, true) then 'COMPLETADA'
      else public.progreso_actividad.estado
    end,
    mejor_nota = case
      when v_nota is null then public.progreso_actividad.mejor_nota
      when public.progreso_actividad.mejor_nota is null then v_nota
      else greatest(public.progreso_actividad.mejor_nota, v_nota)
    end,
    completada_en = case
      when coalesce(p_marcar_completada, true)
        then coalesce(public.progreso_actividad.completada_en, now())
      else public.progreso_actividad.completada_en
    end;

  select count(*)::int into v_total
  from public.actividad_curso a
  join public.modulo_curso mo on mo.id = a.modulo_curso_id
  join public.edicion_curso e on e.version_curso_id = mo.version_curso_id
  join public.matricula_curso m on m.edicion_curso_id = e.id
  where m.id = v_matricula_id;

  select count(*)::int into v_hechas
  from public.progreso_actividad p
  where p.matricula_curso_id = v_matricula_id
    and upper(p.estado) in ('COMPLETADA', 'COMPLETADO', 'DONE');

  v_porcentaje := case
    when v_total = 0 then 0
    else round((v_hechas::numeric / v_total::numeric) * 100, 2)
  end;

  update public.matricula_curso
  set progreso_porcentaje = v_porcentaje
  where id = v_matricula_id;

  return jsonb_build_object(
    'ok', true,
    'matriculaId', v_matricula_id,
    'actividadId', p_actividad_id,
    'nota', (
      select p.mejor_nota
      from public.progreso_actividad p
      where p.matricula_curso_id = v_matricula_id
        and p.actividad_ref = p_actividad_id
    ),
    'itemsCompletados', (
      select coalesce(jsonb_agg(p.actividad_ref::text), '[]'::jsonb)
      from public.progreso_actividad p
      where p.matricula_curso_id = v_matricula_id
        and upper(p.estado) in ('COMPLETADA', 'COMPLETADO', 'DONE')
    ),
    'notas', (
      select coalesce(
        jsonb_object_agg(p.actividad_ref::text, p.mejor_nota),
        '{}'::jsonb
      )
      from public.progreso_actividad p
      where p.matricula_curso_id = v_matricula_id
        and p.mejor_nota is not null
    ),
    'progresoPorcentaje', v_porcentaje,
    'estado', case
      when v_porcentaje >= 100 then 'Completado'
      else 'En curso'
    end
  );
end;
$$;

create or replace function public.servicio_guardar_apuntes_curso(
  p_curso_id uuid,
  p_estudiante_identidad_ref uuid,
  p_texto text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_mat jsonb;
  v_matricula_id uuid;
  v_texto text := coalesce(p_texto, '');
begin
  if p_curso_id is null or p_estudiante_identidad_ref is null then
    raise exception 'Curso y estudiante requeridos';
  end if;

  if char_length(v_texto) > 20000 then
    raise exception 'Los apuntes superan el límite permitido';
  end if;

  v_mat := public.servicio_matricular_estudiante(
    p_curso_id,
    p_estudiante_identidad_ref,
    'PROGRESO_ACTIVIDAD'
  );
  v_matricula_id := (v_mat->>'matriculaId')::uuid;

  insert into public.apuntes_matricula (matricula_curso_id, texto, actualizado_en)
  values (v_matricula_id, v_texto, now())
  on conflict (matricula_curso_id) do update set
    texto = excluded.texto,
    actualizado_en = now();

  return jsonb_build_object(
    'ok', true,
    'matriculaId', v_matricula_id,
    'apuntes', v_texto,
    'actualizadoEn', now()
  );
end;
$$;

revoke all on function public._servicio_banco_preguntas_demo()
  from public, anon, authenticated;
revoke all on function public._servicio_asegurar_actividad_quiz(uuid)
  from public, anon, authenticated;
revoke all on function public.servicio_obtener_contenido_aprendizaje(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.servicio_completar_actividad(uuid, uuid, uuid, numeric, boolean)
  from public, anon, authenticated;
revoke all on function public.servicio_guardar_apuntes_curso(uuid, uuid, text)
  from public, anon, authenticated;

-- Firma antigua (3 args) puede quedar; la reemplazamos arriba con defaults.
-- Otorga execute a service_role.
grant execute on function public._servicio_banco_preguntas_demo() to service_role;
grant execute on function public._servicio_asegurar_actividad_quiz(uuid) to service_role;
grant execute on function public.servicio_obtener_contenido_aprendizaje(uuid, uuid) to service_role;
grant execute on function public.servicio_completar_actividad(uuid, uuid, uuid, numeric, boolean) to service_role;
grant execute on function public.servicio_guardar_apuntes_curso(uuid, uuid, text) to service_role;

-- Compat: overload de 3 argumentos que delega.
create or replace function public.servicio_completar_actividad(
  p_curso_id uuid,
  p_estudiante_identidad_ref uuid,
  p_actividad_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  return public.servicio_completar_actividad(
    p_curso_id,
    p_estudiante_identidad_ref,
    p_actividad_id,
    null,
    true
  );
end;
$$;

revoke all on function public.servicio_completar_actividad(uuid, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.servicio_completar_actividad(uuid, uuid, uuid) to service_role;

commit;
