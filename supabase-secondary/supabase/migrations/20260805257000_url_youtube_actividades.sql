-- Videos de cursos grabados: enlaces YouTube en actividad_curso.url_contenido.
-- Requiere 20260805256000 (constructor items) y 20260805255000 (contenido aprendizaje).
-- Ejecutar en el SQL Editor del proyecto SECUNDARIO.
begin;

alter table public.actividad_curso
  add column if not exists url_contenido text;

create or replace function public.servicio_guardar_curso_borrador(
  p_autor_identidad_ref uuid,
  p_curso_id uuid default null,
  p_documento jsonb default '{}'::jsonb,
  p_estado text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_curso_id uuid := p_curso_id;
  v_version_id uuid;
  v_titulo text;
  v_codigo text;
  v_resumen text;
  v_categoria text;
  v_modalidad text;
  v_estado text;
  v_nota_minima numeric;
  v_secciones jsonb;
  v_seccion jsonb;
  v_item jsonb;
  v_clase text;
  v_orden_modulo integer := 0;
  v_orden_act integer;
  v_modulo_id uuid;
  v_tipo_modalidad text;
  v_tipo_estado text;
  v_tipo_act text;
  v_titulo_act text;
  v_banco jsonb;
  v_url text;
  v_tiene_items boolean;
begin
  if p_autor_identidad_ref is null then
    raise exception 'Autor requerido';
  end if;

  v_titulo := nullif(trim(coalesce(p_documento->>'titulo', '')), '');
  if v_titulo is null then
    v_titulo := 'Curso sin título';
  end if;

  v_resumen := nullif(trim(coalesce(
    p_documento->>'descripcion',
    p_documento->>'subtitulo',
    ''
  )), '');
  v_categoria := nullif(trim(coalesce(p_documento->>'categoria', '')), '');
  v_nota_minima := nullif(p_documento->>'notaMinima', '')::numeric;
  v_secciones := coalesce(p_documento->'secciones', '[]'::jsonb);

  v_modalidad := public._servicio_resolver_enum_curso(
    'modalidad',
    array['VIRTUAL', 'ASINCRONO', 'HIBRIDA', 'MIXTO', 'EN_VIVO', 'PRESENCIAL']
  );

  v_estado := public._servicio_resolver_enum_curso(
    'estado',
    case
      when nullif(trim(coalesce(p_estado, '')), '') is not null
        then array[upper(trim(p_estado)), 'BORRADOR', 'EN_REVISION', 'PUBLICADO', 'ACTIVO']
      else array['BORRADOR', 'EN_REVISION', 'PUBLICADO', 'ACTIVO']
    end
  );

  select c.udt_name into v_tipo_modalidad
  from information_schema.columns c
  where c.table_schema = 'public' and c.table_name = 'curso' and c.column_name = 'modalidad';

  select c.udt_name into v_tipo_estado
  from information_schema.columns c
  where c.table_schema = 'public' and c.table_name = 'curso' and c.column_name = 'estado';

  if v_curso_id is null then
    v_curso_id := gen_random_uuid();
    v_codigo := 'CUR-' || upper(substr(replace(v_curso_id::text, '-', ''), 1, 8));

    execute format(
      'insert into public.curso (
         id, autor_identidad_ref, codigo, titulo, resumen, categoria,
         modalidad, estado, creado_en, actualizado_en, version_registro
       ) values (
         $1, $2, $3, $4, $5, $6, $7::%I, $8::%I, now(), now(), 1
       )',
      v_tipo_modalidad,
      v_tipo_estado
    )
    using v_curso_id, p_autor_identidad_ref, v_codigo, v_titulo, v_resumen,
          v_categoria, v_modalidad, v_estado;
  else
    if not exists (select 1 from public.curso where id = v_curso_id) then
      raise exception 'Curso no encontrado';
    end if;

    execute format(
      'update public.curso set
         titulo = $2,
         resumen = $3,
         categoria = $4,
         estado = $5::%I,
         actualizado_en = now(),
         version_registro = version_registro + 1
       where id = $1',
      v_tipo_estado
    )
    using v_curso_id, v_titulo, v_resumen, v_categoria, v_estado;

    select codigo into v_codigo from public.curso where id = v_curso_id;
  end if;

  select v.id into v_version_id
  from public.version_curso v
  where v.curso_id = v_curso_id
  order by v.numero desc
  limit 1;

  if v_version_id is null then
    v_version_id := gen_random_uuid();
    insert into public.version_curso (
      id, curso_id, numero, titulo_historico, horas, nota_minima, nota_maxima, estado
    ) values (
      v_version_id, v_curso_id, 1, v_titulo,
      greatest(jsonb_array_length(v_secciones), 1),
      coalesce(v_nota_minima, 11),
      20,
      'BORRADOR'
    );
  else
    update public.version_curso set
      titulo_historico = v_titulo,
      horas = greatest(jsonb_array_length(v_secciones), 1),
      nota_minima = coalesce(v_nota_minima, nota_minima, 11),
      estado = case
        when upper(coalesce(p_estado, '')) in ('EN_REVISION', 'PUBLICADO', 'APROBADO')
          then upper(p_estado)
        else estado
      end
    where id = v_version_id;
  end if;

  delete from public.actividad_curso a
  using public.modulo_curso m
  where a.modulo_curso_id = m.id
    and m.version_curso_id = v_version_id;

  delete from public.modulo_curso
  where version_curso_id = v_version_id;

  for v_seccion in
    select value from jsonb_array_elements(v_secciones)
  loop
    v_orden_modulo := v_orden_modulo + 1;
    v_modulo_id := gen_random_uuid();
    insert into public.modulo_curso (
      id, version_curso_id, codigo, titulo, descripcion, orden
    ) values (
      v_modulo_id,
      v_version_id,
      'MOD-' || v_orden_modulo::text,
      coalesce(nullif(trim(v_seccion->>'titulo'), ''), 'Sección ' || v_orden_modulo::text),
      null,
      v_orden_modulo
    );

    v_orden_act := 0;
    v_tiene_items := jsonb_typeof(v_seccion->'items') = 'array'
      and jsonb_array_length(coalesce(v_seccion->'items', '[]'::jsonb)) > 0;

    if v_tiene_items then
      for v_item in
        select value from jsonb_array_elements(v_seccion->'items')
      loop
        v_titulo_act := nullif(trim(coalesce(v_item->>'titulo', '')), '');
        if v_titulo_act is null then
          continue;
        end if;
        v_orden_act := v_orden_act + 1;
        v_tipo_act := lower(trim(coalesce(v_item->>'tipo', 'lectura')));
        if v_tipo_act not in ('lectura', 'video', 'quiz', 'assignment', 'cuestionario', 'entrega_pdf') then
          v_tipo_act := 'lectura';
        end if;
        if v_tipo_act = 'cuestionario' then
          v_tipo_act := 'quiz';
        end if;
        if v_tipo_act = 'entrega_pdf' then
          v_tipo_act := 'assignment';
        end if;

        v_banco := case
          when v_tipo_act = 'quiz'
            and jsonb_typeof(v_item->'preguntas') = 'array'
            and jsonb_array_length(v_item->'preguntas') > 0
          then v_item->'preguntas'
          when v_tipo_act = 'quiz'
          then public._servicio_banco_preguntas_demo()
          else null
        end;

        v_url := nullif(trim(coalesce(
          v_item->>'urlYoutube',
          v_item->>'videoUrl',
          ''
        )), '');
        if v_tipo_act <> 'video' then
          v_url := null;
        end if;

        insert into public.actividad_curso (
          id, modulo_curso_id, codigo, tipo, titulo, instrucciones,
          duracion_minutos, orden, banco_preguntas, url_contenido
        ) values (
          gen_random_uuid(),
          v_modulo_id,
          'ACT-' || v_orden_modulo::text || '-' || v_orden_act::text,
          v_tipo_act,
          v_titulo_act,
          case
            when v_tipo_act = 'quiz' then 'Cuestionario del módulo. Nota mínima 14/20.'
            when v_tipo_act = 'assignment' then 'Entrega PDF calificable.'
            when v_tipo_act = 'video' and v_url is not null
              then 'Video de YouTube: ' || v_url
            else null
          end,
          case
            when v_tipo_act = 'quiz' then 15
            when v_tipo_act = 'assignment' then 30
            when v_tipo_act = 'video' then 10
            else null
          end,
          v_orden_act,
          v_banco,
          v_url
        );
      end loop;
    else
      for v_clase in
        select trim(valor)
        from jsonb_array_elements_text(coalesce(v_seccion->'clases', '[]'::jsonb)) as valor
        where trim(valor) <> ''
      loop
        v_orden_act := v_orden_act + 1;
        insert into public.actividad_curso (
          id, modulo_curso_id, codigo, tipo, titulo, instrucciones,
          duracion_minutos, orden, banco_preguntas, url_contenido
        ) values (
          gen_random_uuid(),
          v_modulo_id,
          'ACT-' || v_orden_modulo::text || '-' || v_orden_act::text,
          case when v_orden_act = 1 then 'video' else 'lectura' end,
          v_clase,
          null,
          null,
          v_orden_act,
          null,
          null
        );
      end loop;
    end if;
  end loop;

  insert into public.documento_borrador_curso (curso_id, documento, actualizado_en)
  values (
    v_curso_id,
    jsonb_set(
      coalesce(p_documento, '{}'::jsonb),
      '{id}',
      to_jsonb(v_curso_id::text),
      true
    ),
    now()
  )
  on conflict (curso_id) do update set
    documento = excluded.documento,
    actualizado_en = now();

  return jsonb_build_object(
    'ok', true,
    'curso', (
      select (public.servicio_obtener_curso_tipado(v_curso_id))->'curso'
    ),
    'borrador', (
      select d.documento
      from public.documento_borrador_curso d
      where d.curso_id = v_curso_id
    ),
    'versionId', v_version_id
  );
end;
$$;

create or replace function public.servicio_obtener_curso_borrador(
  p_curso_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_curso jsonb;
  v_documento jsonb;
  v_secciones jsonb;
begin
  if p_curso_id is null then
    raise exception 'Curso requerido';
  end if;

  v_curso := (public.servicio_obtener_curso_tipado(p_curso_id))->'curso';
  if v_curso is null then
    return jsonb_build_object('ok', false, 'error', 'Curso no encontrado');
  end if;

  select d.documento into v_documento
  from public.documento_borrador_curso d
  where d.curso_id = p_curso_id;

  if v_documento is null then
    select coalesce(jsonb_agg(
      jsonb_build_object(
        'titulo', m.titulo,
        'clases', coalesce((
          select jsonb_agg(a.titulo order by a.orden)
          from public.actividad_curso a
          where a.modulo_curso_id = m.id
        ), '[]'::jsonb),
        'items', coalesce((
          select jsonb_agg(
            jsonb_build_object(
              'titulo', a.titulo,
              'tipo', case lower(a.tipo::text)
                when 'video' then 'video'
                when 'quiz' then 'quiz'
                when 'cuestionario' then 'quiz'
                when 'assignment' then 'assignment'
                when 'entrega_pdf' then 'assignment'
                else 'lectura'
              end,
              'urlYoutube', coalesce(a.url_contenido, ''),
              'preguntas', coalesce(a.banco_preguntas, '[]'::jsonb)
            )
            order by a.orden
          )
          from public.actividad_curso a
          where a.modulo_curso_id = m.id
        ), '[]'::jsonb),
        'recursos', '[]'::jsonb
      )
      order by m.orden
    ), '[]'::jsonb)
    into v_secciones
    from public.modulo_curso m
    join public.version_curso v on v.id = m.version_curso_id
    where v.curso_id = p_curso_id
      and v.numero = (
        select max(vx.numero) from public.version_curso vx where vx.curso_id = p_curso_id
      );

    v_documento := jsonb_build_object(
      'titulo', v_curso->>'titulo',
      'subtitulo', '',
      'descripcion', coalesce(v_curso->>'resumen', ''),
      'publico', '',
      'objetivos', '[]'::jsonb,
      'requisitos', '[]'::jsonb,
      'categoria', coalesce(v_curso->>'categoria', ''),
      'nivel', 'Intermedio',
      'imagen', '',
      'ambito', 'ORGANIZACION',
      'organizacionId', null,
      'acceso', 'GRATUITO',
      'precio', 0,
      'visibilidad', 'ORGANIZACION',
      'permiteEmpresas', false,
      'certificado', true,
      'nombreCertificado', '',
      'notaMinima', coalesce((v_curso->'versiones'->0->>'notaMinima')::numeric, 11),
      'vigenciaMeses', 12,
      'secciones', coalesce(v_secciones, '[]'::jsonb)
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'curso', v_curso,
    'borrador', v_documento
  );
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

revoke all on function public.servicio_guardar_curso_borrador(uuid, uuid, jsonb, text)
  from public, anon, authenticated;
revoke all on function public.servicio_obtener_curso_borrador(uuid)
  from public, anon, authenticated;
revoke all on function public.servicio_obtener_contenido_aprendizaje(uuid, uuid)
  from public, anon, authenticated;

grant execute on function public.servicio_guardar_curso_borrador(uuid, uuid, jsonb, text)
  to service_role;
grant execute on function public.servicio_obtener_curso_borrador(uuid)
  to service_role;
grant execute on function public.servicio_obtener_contenido_aprendizaje(uuid, uuid)
  to service_role;

commit;
