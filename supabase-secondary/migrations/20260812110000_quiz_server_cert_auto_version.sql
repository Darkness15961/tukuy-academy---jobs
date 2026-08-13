-- LMS · Quiz server-side + cert auto + versión borrador tras publicar.
-- Ejecutar en el SQL Editor del proyecto SECUNDARIO.

begin;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public._servicio_quiz_sin_respuestas(p_banco jsonb)
returns jsonb
language sql
immutable
as $$
  select coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'question', coalesce(q->>'question', ''),
          'options', coalesce(q->'options', '[]'::jsonb)
        )
        order by ordinality
      )
      from jsonb_array_elements(coalesce(p_banco, '[]'::jsonb))
        with ordinality as t(q, ordinality)
    ),
    '[]'::jsonb
  );
$$;

create or replace function public._servicio_version_publicada(p_curso_id uuid)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  select v.id into v_id
  from public.version_curso v
  where v.curso_id = p_curso_id
    and upper(coalesce(v.estado::text, '')) in (
      'PUBLICADO', 'APROBADO', 'ACTIVO', 'PUBLICADA'
    )
  order by v.numero desc
  limit 1;

  if v_id is null then
    select v.id into v_id
    from public.version_curso v
    where v.curso_id = p_curso_id
    order by v.numero desc
    limit 1;
  end if;

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Contenido aprendizaje: quizzes sin correctIndex
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
begin
  if p_curso_id is null then
    raise exception 'Curso requerido';
  end if;

  v_curso := (public.servicio_obtener_curso_tipado(p_curso_id))->'curso';
  if v_curso is null then
    return jsonb_build_object('ok', false, 'error', 'Curso no encontrado');
  end if;

  -- Alumno consume la última versión PUBLICADA (no el borrador post-edición).
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

  perform public._servicio_asegurar_actividad_quiz(v_version_id);

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
    join public.modulo_curso m on m.id = a.modulo_curso_id
    where m.version_curso_id = v_version_id
      and (
        lower(a.tipo::text) in ('quiz', 'cuestionario')
        or (a.banco_preguntas is not null and jsonb_typeof(a.banco_preguntas) = 'array')
      )
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

-- ---------------------------------------------------------------------------
-- Calificar quiz en servidor
-- ---------------------------------------------------------------------------

create or replace function public.servicio_calificar_quiz(
  p_curso_id uuid,
  p_estudiante_identidad_ref uuid,
  p_actividad_id uuid,
  p_respuestas jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_banco jsonb;
  v_total integer := 0;
  v_ok integer := 0;
  v_idx integer := 0;
  v_preg jsonb;
  v_respuesta integer;
  v_correcta integer;
  v_score numeric := 0;
  v_nota_minima numeric := 14;
  v_passed boolean := false;
  v_progreso jsonb;
  v_correct_indexes jsonb := '[]'::jsonb;
begin
  if p_curso_id is null or p_estudiante_identidad_ref is null or p_actividad_id is null then
    raise exception 'Curso, estudiante y actividad requeridos';
  end if;

  select a.banco_preguntas,
         coalesce(v.nota_minima, 14)
    into v_banco, v_nota_minima
  from public.actividad_curso a
  join public.modulo_curso m on m.id = a.modulo_curso_id
  join public.version_curso v on v.id = m.version_curso_id
  where a.id = p_actividad_id
    and v.curso_id = p_curso_id;

  if not found then
    raise exception 'Actividad de quiz no encontrada en el curso';
  end if;

  if v_banco is null
    or jsonb_typeof(v_banco) <> 'array'
    or jsonb_array_length(v_banco) = 0
  then
    v_banco := public._servicio_banco_preguntas_demo();
  end if;

  v_total := jsonb_array_length(v_banco);

  for v_idx in 0 .. v_total - 1 loop
    v_preg := v_banco -> v_idx;
    v_correcta := coalesce((v_preg->>'correctIndex')::int, 0);
    v_correct_indexes := v_correct_indexes || jsonb_build_array(v_correcta);
    v_respuesta := null;
    if jsonb_typeof(p_respuestas) = 'array'
      and jsonb_array_length(p_respuestas) > v_idx
    then
      begin
        v_respuesta := (p_respuestas ->> v_idx)::int;
      exception when others then
        v_respuesta := null;
      end;
    end if;
    if v_respuesta is not null and v_respuesta = v_correcta then
      v_ok := v_ok + 1;
    end if;
  end loop;

  v_score := case
    when v_total = 0 then 0
    else round((v_ok::numeric / v_total::numeric) * 20, 2)
  end;
  v_passed := v_score >= v_nota_minima;

  v_progreso := public.servicio_completar_actividad(
    p_curso_id,
    p_estudiante_identidad_ref,
    p_actividad_id,
    v_score,
    v_passed
  );

  return jsonb_build_object(
    'ok', true,
    'actividadId', p_actividad_id,
    'score', v_score,
    'passed', v_passed,
    'notaMinima', v_nota_minima,
    'correctas', v_ok,
    'total', v_total,
    'correctIndexes', v_correct_indexes,
    'progresoPorcentaje', v_progreso->>'progresoPorcentaje',
    'estado', v_progreso->>'estado',
    'itemsCompletados', v_progreso->'itemsCompletados',
    'notas', v_progreso->'notas',
    'matriculaId', v_progreso->>'matriculaId',
    'certificado', v_progreso->'certificado'
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Completar actividad + auto-certificado al 100%
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
  v_total integer := 0;
  v_hechas integer := 0;
  v_porcentaje numeric := 0;
  v_nota numeric := p_nota;
  v_estado text;
  v_cert jsonb := null;
  v_nota_minima numeric := 11;
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
    estado = v_estado,
    mejor_nota = case
      when v_nota is null then public.progreso_actividad.mejor_nota
      when public.progreso_actividad.mejor_nota is null then v_nota
      else greatest(public.progreso_actividad.mejor_nota, v_nota)
    end,
    completada_en = case
      when coalesce(p_marcar_completada, true)
        then coalesce(public.progreso_actividad.completada_en, now())
      else null
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

  -- Auto-certificado: 100% + promedio de notas (si hay) >= nota mínima de versión.
  if v_porcentaje >= 100 then
    select coalesce(v.nota_minima, 11) into v_nota_minima
    from public.matricula_curso m
    join public.edicion_curso e on e.id = m.edicion_curso_id
    join public.version_curso v on v.id = e.version_curso_id
    where m.id = v_matricula_id;

    if coalesce((
      select avg(p.mejor_nota)
      from public.progreso_actividad p
      where p.matricula_curso_id = v_matricula_id
        and p.mejor_nota is not null
    ), v_nota_minima) >= v_nota_minima
    then
      begin
        v_cert := public.servicio_emitir_certificado(
          v_matricula_id,
          p_estudiante_identidad_ref
        );
      exception when others then
        v_cert := jsonb_build_object(
          'ok', false,
          'auto', true,
          'error', SQLERRM
        );
      end;
    end if;
  end if;

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
        jsonb_object_agg(p.actividad_ref::text, p.mejor_nota)
          filter (where p.mejor_nota is not null),
        '{}'::jsonb
      )
      from public.progreso_actividad p
      where p.matricula_curso_id = v_matricula_id
    ),
    'progresoPorcentaje', v_porcentaje,
    'estado', case when v_porcentaje >= 100 then 'Completado' else 'En curso' end,
    'certificado', v_cert
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Asegurar edición sobre versión PUBLICADA (no sobre borrador nuevo)
-- ---------------------------------------------------------------------------

create or replace function public.servicio_asegurar_edicion_curso(
  p_curso_id uuid,
  p_docente_identidad_ref uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_version_id uuid;
  v_edicion_id uuid;
  v_titulo text;
  v_autor uuid;
  v_estado text;
  v_cast_estado text;
  v_funcion text;
  v_cast_funcion text;
begin
  if p_curso_id is null then
    raise exception 'Curso requerido';
  end if;

  select c.titulo, c.autor_identidad_ref
    into v_titulo, v_autor
  from public.curso c
  where c.id = p_curso_id;

  if v_titulo is null then
    raise exception 'Curso no encontrado';
  end if;

  v_version_id := public._servicio_version_publicada(p_curso_id);
  if v_version_id is null then
    raise exception 'El curso no tiene version';
  end if;

  select e.id into v_edicion_id
  from public.edicion_curso e
  where e.version_curso_id = v_version_id
  order by e.creada_en desc
  limit 1;

  if v_edicion_id is null then
    v_edicion_id := gen_random_uuid();
    v_estado := public._servicio_resolver_enum_tabla(
      'edicion_curso',
      'estado',
      array['ABIERTA', 'ACTIVA', 'ACTIVO', 'EN_CURSO', 'DISPONIBLE']
    );
    v_cast_estado := public._servicio_sql_tipo_cast('edicion_curso', 'estado');

    execute format(
      'insert into public.edicion_curso (
         id, version_curso_id, nombre, inicio_en, fin_en, cupos,
         estado, creada_en, actualizada_en, version_registro
       ) values (
         $1, $2, $3, now(), null, null, $4::%s, now(), now(), 1
       )',
      v_cast_estado
    )
    using
      v_edicion_id,
      v_version_id,
      coalesce(v_titulo, 'Edición') || ' · edición 1',
      v_estado;

    if exists (
      select 1
      from information_schema.tables t
      where t.table_schema = 'public' and t.table_name = 'docente_edicion'
    ) then
      v_funcion := public._servicio_resolver_enum_tabla(
        'docente_edicion',
        'funcion',
        array['TITULAR', 'PRINCIPAL', 'DOCENTE', 'INSTRUCTOR']
      );
      v_cast_funcion := public._servicio_sql_tipo_cast('docente_edicion', 'funcion');
      if v_funcion is not null and v_cast_funcion is not null then
        execute format(
          'insert into public.docente_edicion (
             id, edicion_curso_id, docente_identidad_ref, funcion, creada_en
           ) values (
             gen_random_uuid(), $1, $2, $3::%s, now()
           )
           on conflict do nothing',
          v_cast_funcion
        )
        using v_edicion_id, coalesce(p_docente_identidad_ref, v_autor), v_funcion;
      end if;
    end if;
  end if;

  return jsonb_build_object(
    'ok', true,
    'edicionId', v_edicion_id,
    'versionId', v_version_id
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Guardar borrador: si la última versión está PUBLICADA, abrir versión nueva
-- ---------------------------------------------------------------------------

create or replace function public._servicio_resolver_version_editable(
  p_curso_id uuid,
  p_titulo text,
  p_nota_minima numeric,
  p_secciones_len integer
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_version_id uuid;
  v_estado text;
  v_numero integer;
begin
  select v.id, upper(coalesce(v.estado::text, '')), v.numero
    into v_version_id, v_estado, v_numero
  from public.version_curso v
  where v.curso_id = p_curso_id
  order by v.numero desc
  limit 1;

  if v_version_id is null then
    v_version_id := gen_random_uuid();
    insert into public.version_curso (
      id, curso_id, numero, titulo_historico, horas, nota_minima, nota_maxima, estado
    ) values (
      v_version_id, p_curso_id, 1, p_titulo,
      greatest(p_secciones_len, 1),
      coalesce(p_nota_minima, 11),
      20,
      'BORRADOR'
    );
    return v_version_id;
  end if;

  if v_estado in ('PUBLICADO', 'APROBADO', 'ACTIVO', 'PUBLICADA') then
    -- Congelar publicada: ediciones nuevas van a un borrador paralelo.
    v_version_id := gen_random_uuid();
    insert into public.version_curso (
      id, curso_id, numero, titulo_historico, horas, nota_minima, nota_maxima, estado
    ) values (
      v_version_id, p_curso_id, coalesce(v_numero, 1) + 1, p_titulo,
      greatest(p_secciones_len, 1),
      coalesce(p_nota_minima, 11),
      20,
      'BORRADOR'
    );
    return v_version_id;
  end if;

  update public.version_curso set
    titulo_historico = p_titulo,
    horas = greatest(p_secciones_len, 1),
    nota_minima = coalesce(p_nota_minima, nota_minima, 11)
  where id = v_version_id;

  return v_version_id;
end;
$$;

revoke all on function public._servicio_quiz_sin_respuestas(jsonb) from public, anon, authenticated;
revoke all on function public._servicio_version_publicada(uuid) from public, anon, authenticated;
revoke all on function public._servicio_resolver_version_editable(uuid, text, numeric, integer)
  from public, anon, authenticated;
revoke all on function public.servicio_calificar_quiz(uuid, uuid, uuid, jsonb)
  from public, anon, authenticated;
revoke all on function public.servicio_obtener_contenido_aprendizaje(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.servicio_completar_actividad(uuid, uuid, uuid, numeric, boolean)
  from public, anon, authenticated;
revoke all on function public.servicio_asegurar_edicion_curso(uuid, uuid)
  from public, anon, authenticated;

grant execute on function public._servicio_quiz_sin_respuestas(jsonb) to service_role;
grant execute on function public._servicio_version_publicada(uuid) to service_role;
grant execute on function public._servicio_resolver_version_editable(uuid, text, numeric, integer)
  to service_role;
grant execute on function public.servicio_calificar_quiz(uuid, uuid, uuid, jsonb) to service_role;
grant execute on function public.servicio_obtener_contenido_aprendizaje(uuid, uuid) to service_role;
grant execute on function public.servicio_completar_actividad(uuid, uuid, uuid, numeric, boolean)
  to service_role;
grant execute on function public.servicio_asegurar_edicion_curso(uuid, uuid) to service_role;

commit;
