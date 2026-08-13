-- LMS P0/P1 · Progreso reabrable + IDs estables al guardar borrador.
-- Ejecutar en el SQL Editor del proyecto SECUNDARIO.

begin;

-- ---------------------------------------------------------------------------
-- 1) Completar / reabrir actividad (p_marcar_completada = false revierte)
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
    'estado', case when v_porcentaje >= 100 then 'Completado' else 'En curso' end
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 2) Helper: ¿texto es uuid?
-- ---------------------------------------------------------------------------

create or replace function public._servicio_es_uuid(p_valor text)
returns boolean
language sql
immutable
as $$
  select p_valor ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
$$;

-- ---------------------------------------------------------------------------
-- 3) Guardar borrador con IDs estables (upsert; no wipe ciego)
-- ---------------------------------------------------------------------------

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
  v_actividad_id uuid;
  v_tipo_modalidad text;
  v_tipo_estado text;
  v_tipo_act text;
  v_titulo_act text;
  v_banco jsonb;
  v_url text;
  v_portada text;
  v_tiene_items boolean;
  v_modulos_keep uuid[] := array[]::uuid[];
  v_actividades_keep uuid[] := array[]::uuid[];
  v_secciones_out jsonb := '[]'::jsonb;
  v_items_out jsonb;
  v_documento_out jsonb;
  v_version_estado text;
  v_version_numero integer;
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
  v_portada := nullif(trim(coalesce(p_documento->>'imagen', '')), '');
  if v_portada is not null and left(v_portada, 5) = 'data:' then
    v_portada := null;
  end if;

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
         modalidad, estado, portada_clave_almacenamiento,
         creado_en, actualizado_en, version_registro
       ) values (
         $1, $2, $3, $4, $5, $6, $7::%I, $8::%I, $9, now(), now(), 1
       )',
      v_tipo_modalidad,
      v_tipo_estado
    )
    using v_curso_id, p_autor_identidad_ref, v_codigo, v_titulo, v_resumen,
          v_categoria, v_modalidad, v_estado, v_portada;
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
         portada_clave_almacenamiento = coalesce($6, portada_clave_almacenamiento),
         actualizado_en = now(),
         version_registro = version_registro + 1
       where id = $1',
      v_tipo_estado
    )
    using v_curso_id, v_titulo, v_resumen, v_categoria, v_estado, v_portada;

    select codigo into v_codigo from public.curso where id = v_curso_id;
  end if;

  select v.id, upper(coalesce(v.estado::text, '')), v.numero
    into v_version_id, v_version_estado, v_version_numero
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
  elsif v_version_estado in ('PUBLICADO', 'APROBADO', 'ACTIVO', 'PUBLICADA') then
    -- Versión publicada se congela; las ediciones van a un borrador nuevo.
    insert into public.version_curso (
      id, curso_id, numero, titulo_historico, horas, nota_minima, nota_maxima, estado
    ) values (
      gen_random_uuid(), v_curso_id, coalesce(v_version_numero, 1) + 1, v_titulo,
      greatest(jsonb_array_length(v_secciones), 1),
      coalesce(v_nota_minima, 11),
      20,
      'BORRADOR'
    )
    returning id into v_version_id;
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

  v_orden_modulo := 0;

  for v_seccion in
    select value from jsonb_array_elements(v_secciones)
  loop
    v_orden_modulo := v_orden_modulo + 1;
    v_items_out := '[]'::jsonb;

    if public._servicio_es_uuid(nullif(trim(coalesce(v_seccion->>'id', '')), ''))
      and exists (
        select 1 from public.modulo_curso m
        where m.id = (v_seccion->>'id')::uuid
          and m.version_curso_id = v_version_id
      )
    then
      v_modulo_id := (v_seccion->>'id')::uuid;
      update public.modulo_curso set
        codigo = 'MOD-' || v_orden_modulo::text,
        titulo = coalesce(nullif(trim(v_seccion->>'titulo'), ''), 'Sección ' || v_orden_modulo::text),
        orden = v_orden_modulo
      where id = v_modulo_id;
    else
      -- Reusar UUID del cliente solo si no existe en ninguna versión.
      v_modulo_id := case
        when public._servicio_es_uuid(nullif(trim(coalesce(v_seccion->>'id', '')), ''))
          and not exists (
            select 1 from public.modulo_curso m
            where m.id = (v_seccion->>'id')::uuid
          )
          then (v_seccion->>'id')::uuid
        else gen_random_uuid()
      end;
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
    end if;

    v_modulos_keep := array_append(v_modulos_keep, v_modulo_id);

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

        -- Solo actualizar si la actividad ya pertenece a ESTA versión.
        -- Si el UUID es de una versión publicada (u otra), se clona con ID nuevo
        -- para no vaciar el temario que consumen los alumnos.
        if public._servicio_es_uuid(nullif(trim(coalesce(v_item->>'id', '')), ''))
          and exists (
            select 1
            from public.actividad_curso a
            join public.modulo_curso m on m.id = a.modulo_curso_id
            where a.id = (v_item->>'id')::uuid
              and m.version_curso_id = v_version_id
          )
        then
          v_actividad_id := (v_item->>'id')::uuid;
          update public.actividad_curso set
            modulo_curso_id = v_modulo_id,
            codigo = 'ACT-' || v_orden_modulo::text || '-' || v_orden_act::text,
            tipo = v_tipo_act,
            titulo = v_titulo_act,
            instrucciones = case
              when v_tipo_act = 'quiz' then 'Cuestionario del módulo. Nota mínima 14/20.'
              when v_tipo_act = 'assignment' then 'Entrega PDF calificable.'
              when v_tipo_act = 'video' and v_url is not null
                then 'Video de YouTube: ' || v_url
              else null
            end,
            duracion_minutos = case
              when v_tipo_act = 'quiz' then 15
              when v_tipo_act = 'assignment' then 30
              when v_tipo_act = 'video' then 10
              else null
            end,
            orden = v_orden_act,
            banco_preguntas = v_banco,
            url_contenido = v_url
          where id = v_actividad_id;
        else
          v_actividad_id := case
            when public._servicio_es_uuid(nullif(trim(coalesce(v_item->>'id', '')), ''))
              and not exists (
                select 1 from public.actividad_curso a
                where a.id = (v_item->>'id')::uuid
              )
              then (v_item->>'id')::uuid
            else gen_random_uuid()
          end;
          insert into public.actividad_curso (
            id, modulo_curso_id, codigo, tipo, titulo, instrucciones,
            duracion_minutos, orden, banco_preguntas, url_contenido
          ) values (
            v_actividad_id,
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
        end if;

        v_actividades_keep := array_append(v_actividades_keep, v_actividad_id);
        v_items_out := v_items_out || jsonb_build_array(
          jsonb_build_object(
            'id', v_actividad_id,
            'titulo', v_titulo_act,
            'tipo', v_tipo_act,
            'urlYoutube', coalesce(v_url, ''),
            'preguntas', coalesce(v_banco, '[]'::jsonb)
          )
        );
      end loop;
    else
      for v_clase in
        select trim(valor)
        from jsonb_array_elements_text(coalesce(v_seccion->'clases', '[]'::jsonb)) as valor
        where trim(valor) <> ''
      loop
        v_orden_act := v_orden_act + 1;
        v_tipo_act := case when v_orden_act = 1 then 'video' else 'lectura' end;
        v_actividad_id := gen_random_uuid();
        insert into public.actividad_curso (
          id, modulo_curso_id, codigo, tipo, titulo, instrucciones,
          duracion_minutos, orden, banco_preguntas, url_contenido
        ) values (
          v_actividad_id,
          v_modulo_id,
          'ACT-' || v_orden_modulo::text || '-' || v_orden_act::text,
          v_tipo_act,
          v_clase,
          null,
          null,
          v_orden_act,
          null,
          null
        );
        v_actividades_keep := array_append(v_actividades_keep, v_actividad_id);
        v_items_out := v_items_out || jsonb_build_array(
          jsonb_build_object(
            'id', v_actividad_id,
            'titulo', v_clase,
            'tipo', v_tipo_act,
            'urlYoutube', '',
            'preguntas', '[]'::jsonb
          )
        );
      end loop;
    end if;

    v_secciones_out := v_secciones_out || jsonb_build_array(
      jsonb_build_object(
        'id', v_modulo_id,
        'titulo', coalesce(nullif(trim(v_seccion->>'titulo'), ''), 'Sección ' || v_orden_modulo::text),
        'clases', coalesce((
          select jsonb_agg(x->>'titulo')
          from jsonb_array_elements(v_items_out) x
        ), '[]'::jsonb),
        'items', v_items_out,
        'recursos', coalesce(v_seccion->'recursos', '[]'::jsonb)
      )
    );
  end loop;

  -- Eliminar solo lo que ya no está en el temario (progreso de IDs vivos se conserva).
  delete from public.actividad_curso a
  using public.modulo_curso m
  where a.modulo_curso_id = m.id
    and m.version_curso_id = v_version_id
    and (
      cardinality(v_actividades_keep) = 0
      or a.id <> all (v_actividades_keep)
    );

  delete from public.modulo_curso m
  where m.version_curso_id = v_version_id
    and (
      cardinality(v_modulos_keep) = 0
      or m.id <> all (v_modulos_keep)
    );

  v_documento_out := jsonb_set(
    jsonb_set(
      coalesce(p_documento, '{}'::jsonb),
      '{id}',
      to_jsonb(v_curso_id::text),
      true
    ),
    '{secciones}',
    v_secciones_out,
    true
  );

  insert into public.documento_borrador_curso (curso_id, documento, actualizado_en)
  values (v_curso_id, v_documento_out, now())
  on conflict (curso_id) do update set
    documento = excluded.documento,
    actualizado_en = now();

  return jsonb_build_object(
    'ok', true,
    'curso', (
      select (public.servicio_obtener_curso_tipado(v_curso_id))->'curso'
    ),
    'borrador', v_documento_out,
    'versionId', v_version_id
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 4) Obtener borrador: incluir ids de módulo/actividad
-- ---------------------------------------------------------------------------

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

  if v_documento is null
    or jsonb_typeof(v_documento->'secciones') <> 'array'
    or jsonb_array_length(coalesce(v_documento->'secciones', '[]'::jsonb)) = 0
  then
    select coalesce(jsonb_agg(
      jsonb_build_object(
        'id', m.id,
        'titulo', m.titulo,
        'clases', coalesce((
          select jsonb_agg(a.titulo order by a.orden)
          from public.actividad_curso a
          where a.modulo_curso_id = m.id
        ), '[]'::jsonb),
        'items', coalesce((
          select jsonb_agg(
            jsonb_build_object(
              'id', a.id,
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
      'id', p_curso_id,
      'titulo', v_curso->>'titulo',
      'subtitulo', '',
      'descripcion', coalesce(v_curso->>'resumen', ''),
      'publico', '',
      'objetivos', '[]'::jsonb,
      'requisitos', '[]'::jsonb,
      'categoria', coalesce(v_curso->>'categoria', ''),
      'nivel', 'Intermedio',
      'imagen', '',
      'ambito', 'INDEPENDIENTE',
      'organizacionId', null,
      'acceso', 'GRATUITO',
      'precio', 0,
      'visibilidad', 'PUBLICO',
      'permiteEmpresas', false,
      'certificado', true,
      'nombreCertificado', '',
      'notaMinima', 14,
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

revoke all on function public._servicio_es_uuid(text) from public, anon, authenticated;
grant execute on function public._servicio_es_uuid(text) to service_role;

revoke all on function public.servicio_completar_actividad(uuid, uuid, uuid, numeric, boolean)
  from public, anon, authenticated;
grant execute on function public.servicio_completar_actividad(uuid, uuid, uuid, numeric, boolean)
  to service_role;

revoke all on function public.servicio_guardar_curso_borrador(uuid, uuid, jsonb, text)
  from public, anon, authenticated;
grant execute on function public.servicio_guardar_curso_borrador(uuid, uuid, jsonb, text)
  to service_role;

revoke all on function public.servicio_obtener_curso_borrador(uuid)
  from public, anon, authenticated;
grant execute on function public.servicio_obtener_curso_borrador(uuid)
  to service_role;

commit;
