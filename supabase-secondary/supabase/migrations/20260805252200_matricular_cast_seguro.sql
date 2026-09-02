-- Fix definitivo matrícula: no castear varchar como public.varchar.
-- Con search_path='' solo los enums de public llevan esquema;
-- varchar/text/int se castean a text (pg_catalog siempre visible).
-- Ejecutar en el SQL Editor del proyecto SECUNDARIO.
begin;

create or replace function public._servicio_sql_tipo_cast(
  p_tabla text,
  p_columna text
)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_udt text;
  v_nsp text;
  v_typtype "char";
begin
  select c.udt_name into v_udt
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = p_tabla
    and c.column_name = p_columna;

  if v_udt is null then
    return 'text';
  end if;

  select n.nspname, t.typtype
    into v_nsp, v_typtype
  from pg_catalog.pg_type t
  join pg_catalog.pg_namespace n on n.oid = t.typnamespace
  where t.typname = v_udt
  order by
    case n.nspname
      when 'public' then 0
      when 'pg_catalog' then 1
      else 2
    end
  limit 1;

  -- Solo enums de usuario necesitan esquema (public.estado_matricula).
  if v_typtype = 'e' then
    return format('%I.%I', coalesce(v_nsp, 'public'), v_udt);
  end if;

  -- varchar/text/int/bool/... → text (coerción segura al insertar).
  return 'text';
end;
$$;

create or replace function public._servicio_resolver_enum_tabla(
  p_tabla text,
  p_columna text,
  p_preferidos text[]
)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_udt text;
  v_typtype "char";
  v_valor text;
begin
  select c.udt_name into v_udt
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = p_tabla
    and c.column_name = p_columna;

  if v_udt is null then
    return coalesce(p_preferidos[1], 'ACTIVO');
  end if;

  select t.typtype into v_typtype
  from pg_catalog.pg_type t
  join pg_catalog.pg_namespace n on n.oid = t.typnamespace
  where t.typname = v_udt
  order by case n.nspname when 'public' then 0 when 'pg_catalog' then 1 else 2 end
  limit 1;

  -- Si la columna no es enum (p.ej. varchar), usa el primer preferido tal cual.
  if v_typtype is distinct from 'e' then
    return coalesce(p_preferidos[1], 'ACTIVO');
  end if;

  select e.enumlabel into v_valor
  from pg_catalog.pg_type t
  join pg_catalog.pg_enum e on e.enumtypid = t.oid
  where t.typname = v_udt
    and e.enumlabel = any(p_preferidos)
  order by array_position(p_preferidos, e.enumlabel)
  limit 1;

  if v_valor is not null then
    return v_valor;
  end if;

  select e.enumlabel into v_valor
  from pg_catalog.pg_type t
  join pg_catalog.pg_enum e on e.enumtypid = t.oid
  where t.typname = v_udt
  order by e.enumsortorder
  limit 1;

  return coalesce(v_valor, coalesce(p_preferidos[1], 'ACTIVO'));
end;
$$;

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
        array['RESPONSABLE', 'TITULAR', 'DOCENTE', 'INSTRUCTOR']
      );
      v_cast_funcion := public._servicio_sql_tipo_cast('docente_edicion', 'funcion');

      begin
        execute format(
          'insert into public.docente_edicion (
             id, edicion_curso_id, docente_identidad_ref, funcion
           ) values ($1, $2, $3, $4::%s)',
          v_cast_funcion
        )
        using
          gen_random_uuid(),
          v_edicion_id,
          coalesce(p_docente_identidad_ref, v_autor),
          v_funcion;
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

  select m.id into v_matricula_id
  from public.matricula_curso m
  where m.edicion_curso_id = v_edicion_id
    and m.estudiante_identidad_ref = p_estudiante_identidad_ref;

  if v_matricula_id is null then
    v_matricula_id := gen_random_uuid();

    v_estado := public._servicio_resolver_enum_tabla(
      'matricula_curso',
      'estado',
      array['ACTIVA', 'ACTIVO', 'INSCRITO', 'MATRICULADO', 'EN_CURSO']
    );
    v_cast_estado := public._servicio_sql_tipo_cast('matricula_curso', 'estado');

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

revoke all on function public._servicio_sql_tipo_cast(text, text)
  from public, anon, authenticated;
revoke all on function public._servicio_resolver_enum_tabla(text, text, text[])
  from public, anon, authenticated;
revoke all on function public.servicio_asegurar_edicion_curso(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.servicio_matricular_estudiante(uuid, uuid, text)
  from public, anon, authenticated;

grant execute on function public._servicio_sql_tipo_cast(text, text) to service_role;
grant execute on function public._servicio_resolver_enum_tabla(text, text, text[])
  to service_role;
grant execute on function public.servicio_asegurar_edicion_curso(uuid, uuid)
  to service_role;
grant execute on function public.servicio_matricular_estudiante(uuid, uuid, text)
  to service_role;

commit;
