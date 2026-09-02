-- Fix: casts de enum con search_path vacío deben calificar public.*.
-- Ejecutar en el SQL Editor del proyecto SECUNDARIO (reemplaza funciones).
begin;

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
  v_estado_tipo text;
  v_funcion text;
  v_funcion_tipo text;
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

  select v.id into v_version_id
  from public.version_curso v
  where v.curso_id = p_curso_id
  order by v.numero desc
  limit 1;

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

    select c.udt_name into v_estado_tipo
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = 'edicion_curso'
      and c.column_name = 'estado';

    v_estado := public._servicio_resolver_enum_tabla(
      'edicion_curso',
      'estado',
      array['ABIERTA', 'ACTIVA', 'ACTIVO', 'EN_CURSO', 'DISPONIBLE']
    );

    execute format(
      'insert into public.edicion_curso (
         id, version_curso_id, nombre, inicio_en, fin_en, cupos,
         estado, creada_en, actualizada_en, version_registro
       ) values (
         $1, $2, $3, now(), null, null, $4::public.%I, now(), now(), 1
       )',
      v_estado_tipo
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
      select c.udt_name into v_funcion_tipo
      from information_schema.columns c
      where c.table_schema = 'public'
        and c.table_name = 'docente_edicion'
        and c.column_name = 'funcion';

      v_funcion := public._servicio_resolver_enum_tabla(
        'docente_edicion',
        'funcion',
        array['RESPONSABLE', 'TITULAR', 'DOCENTE', 'INSTRUCTOR']
      );

      begin
        if v_funcion_tipo is not null then
          execute format(
            'insert into public.docente_edicion (
               id, edicion_curso_id, docente_identidad_ref, funcion
             ) values ($1, $2, $3, $4::public.%I)',
            v_funcion_tipo
          )
          using
            gen_random_uuid(),
            v_edicion_id,
            coalesce(p_docente_identidad_ref, v_autor),
            v_funcion;
        else
          insert into public.docente_edicion (
            id, edicion_curso_id, docente_identidad_ref, funcion
          ) values (
            gen_random_uuid(),
            v_edicion_id,
            coalesce(p_docente_identidad_ref, v_autor),
            v_funcion
          );
        end if;
      exception
        when others then
          null;
      end;
    end if;
  end if;

  return jsonb_build_object(
    'ok', true,
    'cursoId', p_curso_id,
    'versionId', v_version_id,
    'edicionId', v_edicion_id
  );
end;
$$;

create or replace function public.servicio_matricular_estudiante(
  p_curso_id uuid,
  p_estudiante_identidad_ref uuid,
  p_origen text default 'INSCRIPCION_DIRECTA'
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
  v_estado text;
  v_estado_tipo text;
  v_origen text;
  v_origen_tipo text;
  v_origen_es_enum boolean := false;
begin
  if p_curso_id is null or p_estudiante_identidad_ref is null then
    raise exception 'Curso y estudiante requeridos';
  end if;

  v_edicion := public.servicio_asegurar_edicion_curso(
    p_curso_id,
    p_estudiante_identidad_ref
  );
  v_edicion_id := (v_edicion->>'edicionId')::uuid;

  select m.id into v_matricula_id
  from public.matricula_curso m
  where m.edicion_curso_id = v_edicion_id
    and m.estudiante_identidad_ref = p_estudiante_identidad_ref;

  if v_matricula_id is null then
    select c.udt_name into v_estado_tipo
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = 'matricula_curso'
      and c.column_name = 'estado';

    v_estado := public._servicio_resolver_enum_tabla(
      'matricula_curso',
      'estado',
      array['ACTIVA', 'ACTIVO', 'INSCRITO', 'MATRICULADO', 'EN_CURSO']
    );

    select c.udt_name,
           exists (
             select 1
             from pg_catalog.pg_type t
             join pg_catalog.pg_namespace n on n.oid = t.typnamespace
             where t.typname = c.udt_name
               and n.nspname = 'public'
               and t.typtype = 'e'
           )
      into v_origen_tipo, v_origen_es_enum
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = 'matricula_curso'
      and c.column_name = 'origen';

    v_matricula_id := gen_random_uuid();

    if v_origen_es_enum then
      v_origen := public._servicio_resolver_enum_tabla(
        'matricula_curso',
        'origen',
        array[
          coalesce(nullif(trim(p_origen), ''), 'INSCRIPCION_DIRECTA'),
          'INSCRIPCION_DIRECTA',
          'MANUAL',
          'DIRECTA',
          'AUTO'
        ]
      );
      execute format(
        'insert into public.matricula_curso (
           id, edicion_curso_id, estudiante_identidad_ref, origen, origen_ref,
           estado, progreso_porcentaje, nota_final, matriculado_en
         ) values (
           $1, $2, $3, $4::public.%I, null, $5::public.%I, 0, null, now()
         )',
        v_origen_tipo,
        v_estado_tipo
      )
      using
        v_matricula_id,
        v_edicion_id,
        p_estudiante_identidad_ref,
        v_origen,
        v_estado;
    else
      execute format(
        'insert into public.matricula_curso (
           id, edicion_curso_id, estudiante_identidad_ref, origen, origen_ref,
           estado, progreso_porcentaje, nota_final, matriculado_en
         ) values (
           $1, $2, $3, $4, null, $5::public.%I, 0, null, now()
         )',
        v_estado_tipo
      )
      using
        v_matricula_id,
        v_edicion_id,
        p_estudiante_identidad_ref,
        coalesce(nullif(trim(p_origen), ''), 'INSCRIPCION_DIRECTA'),
        v_estado;
    end if;
  end if;

  return jsonb_build_object(
    'ok', true,
    'matriculaId', v_matricula_id,
    'edicionId', v_edicion_id,
    'cursoId', p_curso_id,
    'estudianteIdentidadRef', p_estudiante_identidad_ref
  );
end;
$$;

revoke all on function public.servicio_asegurar_edicion_curso(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.servicio_matricular_estudiante(uuid, uuid, text)
  from public, anon, authenticated;

grant execute on function public.servicio_asegurar_edicion_curso(uuid, uuid)
  to service_role;
grant execute on function public.servicio_matricular_estudiante(uuid, uuid, text)
  to service_role;

commit;
