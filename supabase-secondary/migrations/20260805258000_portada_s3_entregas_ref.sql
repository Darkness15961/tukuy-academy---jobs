-- Portada S3 + entregas por referencia (sin base64 obligatorio).
-- Requiere 20260805257000 y 20260805251000.
-- Ejecutar en el SQL Editor del proyecto SECUNDARIO.
begin;

alter table public.curso
  add column if not exists portada_clave_almacenamiento text;

alter table public.entrega_actividad
  add column if not exists archivo_referencia text;

create or replace function public._servicio_mapear_entrega(p_entrega public.entrega_actividad)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_curso_id uuid;
  v_curso_titulo text;
  v_modulo_id uuid;
  v_modulo_titulo text;
  v_actividad_titulo text;
  v_estudiante_id uuid;
  v_estudiante_nombre text;
  v_organizacion text;
  v_ref text;
begin
  select
    c.id,
    c.titulo,
    m.id,
    m.titulo,
    a.titulo,
    mat.estudiante_identidad_ref
  into
    v_curso_id,
    v_curso_titulo,
    v_modulo_id,
    v_modulo_titulo,
    v_actividad_titulo,
    v_estudiante_id
  from public.entrega_actividad e
  join public.matricula_curso mat on mat.id = e.matricula_curso_id
  join public.edicion_curso ed on ed.id = mat.edicion_curso_id
  join public.version_curso v on v.id = ed.version_curso_id
  join public.curso c on c.id = v.curso_id
  join public.actividad_curso a on a.id = e.actividad_curso_id
  join public.modulo_curso m on m.id = a.modulo_curso_id
  where e.id = p_entrega.id;

  select coalesce(acc.nombre_mostrar, acc.correo, 'Estudiante')
    into v_estudiante_nombre
  from public.acceso_identidad_principal acc
  where acc.identidad_principal_ref = v_estudiante_id;

  select ci.nombre_organizacion
    into v_organizacion
  from public.contexto_instalacion ci
  where ci.id = true;

  v_ref := coalesce(
    nullif(trim(p_entrega.archivo_referencia), ''),
    'secundaria/' || p_entrega.id::text
  );

  return jsonb_build_object(
    'id', p_entrega.id,
    'organizacionId', null,
    'organizacionNombre', coalesce(v_organizacion, 'Tukuy Academy'),
    'cursoId', v_curso_id,
    'cursoTitulo', coalesce(v_curso_titulo, 'Curso'),
    'moduloId', v_modulo_id,
    'moduloTitulo', coalesce(v_modulo_titulo, 'Módulo'),
    'actividadId', p_entrega.actividad_curso_id,
    'actividadTitulo', coalesce(v_actividad_titulo, 'Actividad'),
    'estudianteId', v_estudiante_id,
    'estudianteNombre', coalesce(v_estudiante_nombre, 'Estudiante'),
    'estudianteIniciales', upper(left(coalesce(v_estudiante_nombre, 'ES'), 2)),
    'intento', p_entrega.intento,
    'entregadaEn', p_entrega.entregada_en,
    'estado', p_entrega.estado,
    'archivo', case
      when p_entrega.archivo_nombre is null then null
      else jsonb_build_object(
        'id', p_entrega.id::text,
        'nombre', p_entrega.archivo_nombre,
        'tipo', coalesce(p_entrega.archivo_tipo, 'application/pdf'),
        'tamanio', coalesce(p_entrega.archivo_tamanio, 0),
        'referencia', v_ref,
        'contenidoBase64', p_entrega.archivo_contenido
      )
    end,
    'nota', p_entrega.nota,
    'retroalimentacion', p_entrega.retroalimentacion,
    'calificadaEn', p_entrega.calificada_en,
    'horasReconocidas', 0
  );
end;
$$;

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
  v_portada text;
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

-- Redefine enviar_entrega con referencia S3 opcional (firma ampliada).
drop function if exists public.servicio_enviar_entrega(uuid, uuid, uuid, text, text, integer, text);

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

  select v.id into v_version_id
  from public.version_curso v
  where v.curso_id = p_curso_id
  order by v.numero desc
  limit 1;

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
    raise exception 'La actividad no pertenece al curso';
  end if;

  select lower(a.tipo) into v_tipo
  from public.actividad_curso a
  where a.id = p_actividad_id;

  select m.id into v_matricula_id
  from public.matricula_curso m
  join public.edicion_curso e on e.id = m.edicion_curso_id
  where e.version_curso_id = v_version_id
    and m.estudiante_identidad_ref = p_estudiante_identidad_ref
  limit 1;

  if v_matricula_id is null then
    perform public.servicio_matricular_estudiante(
      p_curso_id,
      p_estudiante_identidad_ref,
      'INSCRIPCION_DIRECTA'
    );
    select m.id into v_matricula_id
    from public.matricula_curso m
    join public.edicion_curso e on e.id = m.edicion_curso_id
    where e.version_curso_id = v_version_id
      and m.estudiante_identidad_ref = p_estudiante_identidad_ref
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

  return jsonb_build_object(
    'ok', true,
    'entrega', public._servicio_mapear_entrega(v_entrega)
  );
end;
$$;

revoke all on function public.servicio_guardar_curso_borrador(uuid, uuid, jsonb, text)
  from public, anon, authenticated;
revoke all on function public.servicio_enviar_entrega(uuid, uuid, uuid, text, text, integer, text, text)
  from public, anon, authenticated;

grant execute on function public.servicio_guardar_curso_borrador(uuid, uuid, jsonb, text)
  to service_role;
grant execute on function public.servicio_enviar_entrega(uuid, uuid, uuid, text, text, integer, text, text)
  to service_role;

commit;
