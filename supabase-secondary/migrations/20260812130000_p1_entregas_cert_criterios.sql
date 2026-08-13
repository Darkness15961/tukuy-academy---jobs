-- P1 LMS: entregas en versión de matrícula, recálculo al calificar, auto-cert cerrado.
-- Ejecutar en el SQL Editor del proyecto SECUNDARIO (después de 12120000).

begin;

-- ---------------------------------------------------------------------------
-- Recalcular % + auto-cert con criterios cerrados
-- ---------------------------------------------------------------------------

create or replace function public._servicio_recalcular_progreso_y_cert(
  p_matricula_id uuid,
  p_emisor_identidad_ref uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_total integer := 0;
  v_hechas integer := 0;
  v_porcentaje numeric := 0;
  v_nota_minima numeric := 14;
  v_calificables integer := 0;
  v_calificadas integer := 0;
  v_avg numeric;
  v_cert jsonb := null;
  v_estudiante uuid;
  v_emisor uuid;
begin
  if p_matricula_id is null then
    raise exception 'Matricula requerida';
  end if;

  select count(*)::int into v_total
  from public.actividad_curso a
  join public.modulo_curso mo on mo.id = a.modulo_curso_id
  join public.edicion_curso e on e.version_curso_id = mo.version_curso_id
  join public.matricula_curso m on m.edicion_curso_id = e.id
  where m.id = p_matricula_id;

  select count(*)::int into v_hechas
  from public.progreso_actividad p
  join public.actividad_curso a on a.id = p.actividad_ref
  join public.modulo_curso mo on mo.id = a.modulo_curso_id
  join public.edicion_curso e on e.version_curso_id = mo.version_curso_id
  join public.matricula_curso m on m.edicion_curso_id = e.id and m.id = p.matricula_curso_id
  where p.matricula_curso_id = p_matricula_id
    and upper(p.estado) in ('COMPLETADA', 'COMPLETADO', 'DONE');

  v_porcentaje := case
    when v_total = 0 then 0
    else round((v_hechas::numeric / v_total::numeric) * 100, 2)
  end;

  update public.matricula_curso
  set progreso_porcentaje = v_porcentaje
  where id = p_matricula_id;

  select coalesce(v.nota_minima, 14), m.estudiante_identidad_ref
    into v_nota_minima, v_estudiante
  from public.matricula_curso m
  join public.edicion_curso e on e.id = m.edicion_curso_id
  join public.version_curso v on v.id = e.version_curso_id
  where m.id = p_matricula_id;

  v_emisor := coalesce(p_emisor_identidad_ref, v_estudiante);

  if v_porcentaje >= 100 then
    select count(*)::int into v_calificables
    from public.actividad_curso a
    join public.modulo_curso mo on mo.id = a.modulo_curso_id
    join public.edicion_curso e on e.version_curso_id = mo.version_curso_id
    join public.matricula_curso m on m.edicion_curso_id = e.id
    where m.id = p_matricula_id
      and lower(a.tipo::text) in ('quiz', 'cuestionario', 'assignment', 'entrega_pdf');

    if v_calificables = 0 then
      -- Solo video/lectura: 100% basta.
      begin
        v_cert := public.servicio_emitir_certificado(p_matricula_id, v_emisor);
      exception when others then
        v_cert := jsonb_build_object('ok', false, 'auto', true, 'error', SQLERRM);
      end;
    else
      select count(*)::int, avg(p.mejor_nota)
        into v_calificadas, v_avg
      from public.progreso_actividad p
      join public.actividad_curso a on a.id = p.actividad_ref
      join public.modulo_curso mo on mo.id = a.modulo_curso_id
      join public.edicion_curso e on e.version_curso_id = mo.version_curso_id
      join public.matricula_curso m on m.edicion_curso_id = e.id and m.id = p.matricula_curso_id
      where p.matricula_curso_id = p_matricula_id
        and lower(a.tipo::text) in ('quiz', 'cuestionario', 'assignment', 'entrega_pdf')
        and p.mejor_nota is not null
        and upper(p.estado) in ('COMPLETADA', 'COMPLETADO', 'DONE');

      -- Cerrado: todas las calificables con nota y promedio >= nota mínima.
      if v_calificadas >= v_calificables
        and coalesce(v_avg, 0) >= v_nota_minima
      then
        begin
          v_cert := public.servicio_emitir_certificado(p_matricula_id, v_emisor);
        exception when others then
          v_cert := jsonb_build_object('ok', false, 'auto', true, 'error', SQLERRM);
        end;
      end if;
    end if;
  end if;

  return jsonb_build_object(
    'ok', true,
    'progresoPorcentaje', v_porcentaje,
    'notaMinima', v_nota_minima,
    'certificado', v_cert
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Completar actividad: reusa helper de cert
-- ---------------------------------------------------------------------------

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
  v_nota numeric := p_nota;
  v_estado text;
  v_tipo_act text;
  v_marcar boolean;
  v_nota_existente numeric;
  v_nota_minima numeric := 14;
  v_recalc jsonb;
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

  select lower(a.tipo::text), coalesce(v.nota_minima, 14)
    into v_tipo_act, v_nota_minima
  from public.actividad_curso a
  join public.modulo_curso mo on mo.id = a.modulo_curso_id
  join public.edicion_curso e on e.version_curso_id = mo.version_curso_id
  join public.matricula_curso m on m.edicion_curso_id = e.id
  join public.version_curso v on v.id = e.version_curso_id
  where a.id = p_actividad_id
    and m.id = v_matricula_id;

  if not found then
    raise exception 'Actividad no pertenece a la version de la matricula';
  end if;

  if v_tipo_act in ('cuestionario') then
    v_tipo_act := 'quiz';
  elsif v_tipo_act in ('entrega_pdf') then
    v_tipo_act := 'assignment';
  end if;

  v_marcar := coalesce(p_marcar_completada, true);

  if v_marcar and v_tipo_act = 'quiz' then
    select p.mejor_nota into v_nota_existente
    from public.progreso_actividad p
    where p.matricula_curso_id = v_matricula_id
      and p.actividad_ref = p_actividad_id;
    if coalesce(v_nota, v_nota_existente) is null
      or coalesce(v_nota, v_nota_existente) < v_nota_minima
    then
      raise exception 'El quiz solo se completa aprobando via calificar-quiz';
    end if;
  end if;

  if v_marcar and v_tipo_act = 'assignment' then
    if not exists (
      select 1
      from public.entrega_actividad ea
      where ea.matricula_curso_id = v_matricula_id
        and ea.actividad_curso_id = p_actividad_id
    ) then
      raise exception 'La tarea solo se completa con una entrega registrada';
    end if;
  end if;

  v_estado := case when v_marcar then 'COMPLETADA' else 'EN_PROGRESO' end;

  insert into public.progreso_actividad (
    id, matricula_curso_id, actividad_ref, estado, mejor_nota, completada_en
  ) values (
    gen_random_uuid(),
    v_matricula_id,
    p_actividad_id,
    v_estado,
    v_nota,
    case when v_marcar then now() else null end
  )
  on conflict (matricula_curso_id, actividad_ref) do update set
    estado = v_estado,
    mejor_nota = case
      when v_nota is null then public.progreso_actividad.mejor_nota
      when public.progreso_actividad.mejor_nota is null then v_nota
      else greatest(public.progreso_actividad.mejor_nota, v_nota)
    end,
    completada_en = case
      when v_marcar then coalesce(public.progreso_actividad.completada_en, now())
      else null
    end;

  v_recalc := public._servicio_recalcular_progreso_y_cert(
    v_matricula_id,
    p_estudiante_identidad_ref
  );

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
      join public.actividad_curso a on a.id = p.actividad_ref
      join public.modulo_curso mo on mo.id = a.modulo_curso_id
      join public.edicion_curso e on e.version_curso_id = mo.version_curso_id
      join public.matricula_curso m on m.edicion_curso_id = e.id and m.id = p.matricula_curso_id
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
    'progresoPorcentaje', v_recalc->>'progresoPorcentaje',
    'estado', case
      when (v_recalc->>'progresoPorcentaje')::numeric >= 100 then 'Completado'
      else 'En curso'
    end,
    'notaMinima', v_recalc->'notaMinima',
    'certificado', v_recalc->'certificado'
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Enviar entrega: versión de la matrícula (o publicada), luego completar
-- ---------------------------------------------------------------------------

create or replace function public.servicio_enviar_entrega(
  p_curso_id uuid,
  p_actividad_id uuid,
  p_estudiante_identidad_ref uuid,
  p_archivo_nombre text,
  p_archivo_tipo text default 'application/pdf',
  p_archivo_tamanio integer default 0,
  p_archivo_contenido text default null,
  p_archivo_referencia text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_matricula_id uuid;
  v_version_id uuid;
  v_tipo text;
  v_entrega public.entrega_actividad%rowtype;
  v_intento integer := 1;
  v_ref text;
  v_progreso jsonb;
begin
  if p_curso_id is null or p_actividad_id is null or p_estudiante_identidad_ref is null then
    raise exception 'Curso, actividad y estudiante son requeridos';
  end if;
  if coalesce(trim(p_archivo_nombre), '') = '' then
    raise exception 'Archivo requerido';
  end if;
  if coalesce(p_archivo_tamanio, 0) > 12_000_000 then
    raise exception 'El PDF debe pesar menos de 12 MB';
  end if;

  v_ref := nullif(trim(coalesce(p_archivo_referencia, '')), '');
  if v_ref is null and coalesce(trim(coalesce(p_archivo_contenido, '')), '') = '' then
    raise exception 'Se requiere archivo_referencia (S3) o archivo_contenido';
  end if;

  -- Preferir la versión de la matrícula del alumno (no el borrador N+1).
  select e.version_curso_id, m.id
    into v_version_id, v_matricula_id
  from public.matricula_curso m
  join public.edicion_curso e on e.id = m.edicion_curso_id
  join public.version_curso v on v.id = e.version_curso_id
  where v.curso_id = p_curso_id
    and m.estudiante_identidad_ref = p_estudiante_identidad_ref
  order by m.matriculado_en desc nulls last
  limit 1;

  if v_version_id is null then
    v_version_id := public._servicio_version_publicada(p_curso_id);
  end if;

  if v_version_id is null then
    raise exception 'Curso sin versión';
  end if;

  if not exists (
    select 1
    from public.actividad_curso a
    join public.modulo_curso m on m.id = a.modulo_curso_id
    where a.id = p_actividad_id
      and m.version_curso_id = v_version_id
  ) then
    raise exception 'La actividad no pertenece a la version del alumno';
  end if;

  select lower(a.tipo::text) into v_tipo
  from public.actividad_curso a
  where a.id = p_actividad_id;

  if v_matricula_id is null then
    perform public.servicio_matricular_estudiante(
      p_curso_id,
      p_estudiante_identidad_ref,
      'INSCRIPCION_DIRECTA'
    );
    select m.id into v_matricula_id
    from public.matricula_curso m
    join public.edicion_curso e on e.id = m.edicion_curso_id
    join public.version_curso v on v.id = e.version_curso_id
    where v.curso_id = p_curso_id
      and m.estudiante_identidad_ref = p_estudiante_identidad_ref
    order by m.matriculado_en desc nulls last
    limit 1;
  end if;

  if v_matricula_id is null then
    raise exception 'No se pudo resolver la matrícula';
  end if;

  select coalesce(intento, 0) + 1 into v_intento
  from public.entrega_actividad
  where matricula_curso_id = v_matricula_id
    and actividad_curso_id = p_actividad_id;

  insert into public.entrega_actividad (
    matricula_curso_id,
    actividad_curso_id,
    intento,
    estado,
    archivo_nombre,
    archivo_tipo,
    archivo_tamanio,
    archivo_contenido,
    archivo_referencia,
    entregada_en
  ) values (
    v_matricula_id,
    p_actividad_id,
    coalesce(v_intento, 1),
    'EN_REVISION',
    p_archivo_nombre,
    coalesce(nullif(trim(p_archivo_tipo), ''), 'application/pdf'),
    coalesce(p_archivo_tamanio, 0),
    case when v_ref is not null then null else p_archivo_contenido end,
    coalesce(v_ref, 'secundaria/pendiente'),
    now()
  )
  on conflict (matricula_curso_id, actividad_curso_id) do update set
    intento = public.entrega_actividad.intento + 1,
    estado = 'EN_REVISION',
    archivo_nombre = excluded.archivo_nombre,
    archivo_tipo = excluded.archivo_tipo,
    archivo_tamanio = excluded.archivo_tamanio,
    archivo_contenido = excluded.archivo_contenido,
    archivo_referencia = excluded.archivo_referencia,
    entregada_en = now(),
    nota = null,
    retroalimentacion = null,
    calificada_en = null
  returning * into v_entrega;

  -- Completar actividad de tarea (enviado cuenta como hecho; nota llega al calificar).
  begin
    v_progreso := public.servicio_completar_actividad(
      p_curso_id,
      p_estudiante_identidad_ref,
      p_actividad_id,
      null,
      true
    );
  exception when others then
    v_progreso := jsonb_build_object('ok', false, 'error', SQLERRM);
  end;

  return jsonb_build_object(
    'ok', true,
    'entrega', public._servicio_mapear_entrega(v_entrega),
    'progreso', v_progreso
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Calificar entrega: actualizar nota + recalcular %/cert
-- ---------------------------------------------------------------------------

create or replace function public.servicio_calificar_entrega(
  p_entrega_id uuid,
  p_nota numeric,
  p_retroalimentacion text default null,
  p_docente_identidad_ref uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_entrega public.entrega_actividad%rowtype;
  v_matricula_id uuid;
  v_actividad_id uuid;
  v_recalc jsonb;
begin
  if p_entrega_id is null then
    raise exception 'Entrega requerida';
  end if;
  if p_nota is null or p_nota < 0 or p_nota > 20 then
    raise exception 'La nota debe estar entre 0 y 20';
  end if;

  update public.entrega_actividad
  set
    estado = 'CALIFICADA',
    nota = p_nota,
    retroalimentacion = nullif(trim(coalesce(p_retroalimentacion, '')), ''),
    calificada_en = now(),
    docente_calificador_ref = p_docente_identidad_ref,
    actualizado_en = now()
  where id = p_entrega_id
    and archivo_nombre is not null
  returning * into v_entrega;

  if not found then
    raise exception 'La actividad aún no tiene una entrega';
  end if;

  v_matricula_id := v_entrega.matricula_curso_id;
  v_actividad_id := v_entrega.actividad_curso_id;

  insert into public.progreso_actividad (
    id, matricula_curso_id, actividad_ref, estado, mejor_nota, completada_en
  ) values (
    gen_random_uuid(),
    v_matricula_id,
    v_actividad_id,
    'COMPLETADA',
    p_nota,
    now()
  )
  on conflict (matricula_curso_id, actividad_ref) do update set
    estado = 'COMPLETADA',
    mejor_nota = excluded.mejor_nota,
    completada_en = coalesce(public.progreso_actividad.completada_en, now());

  v_recalc := public._servicio_recalcular_progreso_y_cert(
    v_matricula_id,
    coalesce(p_docente_identidad_ref, (
      select m.estudiante_identidad_ref
      from public.matricula_curso m
      where m.id = v_matricula_id
    ))
  );

  return jsonb_build_object(
    'ok', true,
    'entrega', public._servicio_mapear_entrega(v_entrega),
    'progresoPorcentaje', v_recalc->>'progresoPorcentaje',
    'certificado', v_recalc->'certificado'
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Contenido aprendizaje: exponer notaMinima de la versión
-- ---------------------------------------------------------------------------

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
begin
  if p_curso_id is null then
    raise exception 'Curso requerido';
  end if;

  v_curso := (public.servicio_obtener_curso_tipado(p_curso_id))->'curso';
  if v_curso is null then
    return jsonb_build_object('ok', false, 'error', 'Curso no encontrado');
  end if;

  if p_estudiante_identidad_ref is not null then
    select m.id, m.progreso_porcentaje, e.version_curso_id
      into v_matricula_id, v_progreso, v_version_id
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

revoke all on function public._servicio_recalcular_progreso_y_cert(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.servicio_completar_actividad(uuid, uuid, uuid, numeric, boolean)
  from public, anon, authenticated;
revoke all on function public.servicio_enviar_entrega(uuid, uuid, uuid, text, text, integer, text, text)
  from public, anon, authenticated;
revoke all on function public.servicio_calificar_entrega(uuid, numeric, text, uuid)
  from public, anon, authenticated;
revoke all on function public.servicio_obtener_contenido_aprendizaje(uuid, uuid)
  from public, anon, authenticated;

grant execute on function public._servicio_recalcular_progreso_y_cert(uuid, uuid) to service_role;
grant execute on function public.servicio_completar_actividad(uuid, uuid, uuid, numeric, boolean)
  to service_role;
grant execute on function public.servicio_enviar_entrega(uuid, uuid, uuid, text, text, integer, text, text)
  to service_role;
grant execute on function public.servicio_calificar_entrega(uuid, numeric, text, uuid)
  to service_role;
grant execute on function public.servicio_obtener_contenido_aprendizaje(uuid, uuid)
  to service_role;

commit;
