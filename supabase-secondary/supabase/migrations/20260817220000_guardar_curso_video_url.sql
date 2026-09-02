-- Videos Drive/TikTok/YouTube: no descartar la clase si tiene URL y el título está vacío.
-- También persiste fuenteVideo en el JSON del borrador.
-- Ejecutar en SQL Editor del proyecto SECUNDARIO.
begin;

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
  v_cast_modalidad text;
  v_cast_estado text;
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

  v_cast_modalidad := public._servicio_sql_tipo_cast('curso', 'modalidad');
  v_cast_estado := public._servicio_sql_tipo_cast('curso', 'estado');

  if v_curso_id is null then
    v_curso_id := gen_random_uuid();
    v_codigo := 'CUR-' || upper(substr(replace(v_curso_id::text, '-', ''), 1, 8));

    execute format(
      'insert into public.curso (
         id, autor_identidad_ref, codigo, titulo, resumen, categoria,
         modalidad, estado, portada_clave_almacenamiento,
         creado_en, actualizado_en, version_registro
       ) values (
         $1, $2, $3, $4, $5, $6, $7::%s, $8::%s, $9, now(), now(), 1
       )',
      v_cast_modalidad,
      v_cast_estado
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
         estado = $5::%s,
         portada_clave_almacenamiento = coalesce($6, portada_clave_almacenamiento),
         actualizado_en = now(),
         version_registro = version_registro + 1
       where id = $1',
      v_cast_estado
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
        orden = v_orden_modulo,
        recursos = public._servicio_sanear_recursos_modulo(v_seccion->'recursos'),
        activo = true
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
        id, version_curso_id, codigo, titulo, descripcion, orden, recursos, activo
      ) values (
        v_modulo_id,
        v_version_id,
        'MOD-' || v_orden_modulo::text,
        coalesce(nullif(trim(v_seccion->>'titulo'), ''), 'Sección ' || v_orden_modulo::text),
        null,
        v_orden_modulo,
        public._servicio_sanear_recursos_modulo(v_seccion->'recursos'),
        true
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
        v_url := nullif(trim(coalesce(
          v_item->>'urlYoutube',
          v_item->>'videoUrl',
          ''
        )), '');
        v_tipo_act := lower(trim(coalesce(v_item->>'tipo', 'lectura')));
        if v_tipo_act not in ('lectura', 'video', 'quiz', 'assignment', 'cuestionario', 'entrega_pdf') then
          v_tipo_act := 'lectura';
        end if;
        -- Un video con URL (Drive/TikTok/YouTube) se guarda aunque el título esté vacío.
        if v_titulo_act is null
          and v_url is null
          and v_tipo_act not in ('quiz', 'cuestionario', 'assignment', 'entrega_pdf')
        then
          continue;
        end if;
        if v_titulo_act is null then
          v_titulo_act := case
            when v_tipo_act = 'video' then 'Clase en video'
            when v_tipo_act in ('quiz', 'cuestionario') then 'Cuestionario'
            when v_tipo_act in ('assignment', 'entrega_pdf') then 'Entrega PDF'
            else 'Clase'
          end;
        end if;
        v_orden_act := v_orden_act + 1;
        if v_tipo_act = 'cuestionario' then
          v_tipo_act := 'quiz';
        end if;
        if v_tipo_act = 'entrega_pdf' then
          v_tipo_act := 'assignment';
        end if;
        if v_url is not null and v_tipo_act = 'lectura' then
          v_tipo_act := 'video';
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
            activa = true,
            instrucciones = case
              when v_tipo_act = 'quiz' then 'Cuestionario del módulo. Nota mínima 14/20.'
              when v_tipo_act = 'assignment' then 'Entrega PDF calificable.'
              when v_tipo_act = 'video' and v_url is not null
                then 'Video: ' || v_url
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
            duracion_minutos, orden, banco_preguntas, url_contenido, activa
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
                then 'Video: ' || v_url
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
            v_url,
            true
          );
        end if;

        v_actividades_keep := array_append(v_actividades_keep, v_actividad_id);
        v_items_out := v_items_out || jsonb_build_array(
          jsonb_build_object(
            'id', v_actividad_id,
            'titulo', v_titulo_act,
            'tipo', v_tipo_act,
            'urlYoutube', coalesce(v_url, ''),
            'fuenteVideo', coalesce(nullif(trim(coalesce(
              v_item->>'fuenteVideo',
              v_item->>'videoFuente',
              ''
            )), ''), ''),
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
          duracion_minutos, orden, banco_preguntas, url_contenido, activa
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
          null,
          true
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

  -- Soft-delete: conserva filas (y progreso histórico); oculta del temario vivo.
  update public.actividad_curso a
  set activa = false
  from public.modulo_curso m
  where a.modulo_curso_id = m.id
    and m.version_curso_id = v_version_id
    and (
      cardinality(v_actividades_keep) = 0
      or a.id <> all (v_actividades_keep)
    );

  update public.actividad_curso a
  set activa = true
  from public.modulo_curso m
  where a.modulo_curso_id = m.id
    and m.version_curso_id = v_version_id
    and cardinality(v_actividades_keep) > 0
    and a.id = any (v_actividades_keep);

  update public.modulo_curso m
  set activo = false
  where m.version_curso_id = v_version_id
    and (
      cardinality(v_modulos_keep) = 0
      or m.id <> all (v_modulos_keep)
    );

  update public.modulo_curso m
  set activo = true
  where m.version_curso_id = v_version_id
    and cardinality(v_modulos_keep) > 0
    and m.id = any (v_modulos_keep);

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


revoke all on function public.servicio_guardar_curso_borrador(uuid, uuid, jsonb, text)
  from public, anon, authenticated;
grant execute on function public.servicio_guardar_curso_borrador(uuid, uuid, jsonb, text)
  to service_role;

commit;
