-- Fix Inscribirme: edicion_curso.estado NOT NULL.
-- Causa: _servicio_resolver_enum_tabla (p.ej. 20260805247000) devolvía NULL
-- si la columna no es enum, y el INSERT creaba la edición sin estado.
-- Ejecutar en el SQL Editor del proyecto SECUNDARIO.

begin;

-- 1) El resolver nunca debe devolver NULL.
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

-- 2) Valores de enum habituales (no falla si ya existen o no es enum).
do $$
declare
  v_udt text;
  v_typtype "char";
  v_label text;
  v_labels text[] := array[
    'ABIERTA', 'ACTIVA', 'ACTIVO', 'EN_CURSO', 'DISPONIBLE',
    'CERRADA', 'CERRADO', 'ARCHIVADA', 'ARCHIVADO'
  ];
begin
  select c.udt_name into v_udt
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = 'edicion_curso'
    and c.column_name = 'estado';

  if v_udt is null then
    return;
  end if;

  select t.typtype into v_typtype
  from pg_catalog.pg_type t
  join pg_catalog.pg_namespace n on n.oid = t.typnamespace
  where t.typname = v_udt
  order by case n.nspname when 'public' then 0 else 1 end
  limit 1;

  if v_typtype is distinct from 'e' then
    return;
  end if;

  foreach v_label in array v_labels loop
    begin
      execute format('alter type public.%I add value if not exists %L', v_udt, v_label);
    exception when others then
      null;
    end;
  end loop;
end;
$$;

-- 3) Default de columna para no volver a insertar NULL.
do $$
declare
  v_udt text;
  v_typtype "char";
  v_default text;
begin
  select c.udt_name into v_udt
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = 'edicion_curso'
    and c.column_name = 'estado';

  if v_udt is null then
    return;
  end if;

  v_default := public._servicio_resolver_enum_tabla(
    'edicion_curso',
    'estado',
    array['ABIERTA', 'ACTIVA', 'ACTIVO', 'EN_CURSO', 'DISPONIBLE']
  );

  select t.typtype into v_typtype
  from pg_catalog.pg_type t
  join pg_catalog.pg_namespace n on n.oid = t.typnamespace
  where t.typname = v_udt
  order by case n.nspname when 'public' then 0 else 1 end
  limit 1;

  if v_typtype = 'e' then
    execute format(
      'alter table public.edicion_curso alter column estado set default %L::public.%I',
      v_default,
      v_udt
    );
  else
    execute format(
      'alter table public.edicion_curso alter column estado set default %L',
      v_default
    );
  end if;
end;
$$;

-- 4) INSERT de edición: estado siempre coalescido.
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

  begin
    v_version_id := public._servicio_version_publicada(p_curso_id);
  exception
    when undefined_function then
      v_version_id := null;
  end;

  if v_version_id is null then
    select v.id into v_version_id
    from public.version_curso v
    where v.curso_id = p_curso_id
    order by v.numero desc
    limit 1;
  end if;

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
    v_estado := coalesce(
      public._servicio_resolver_enum_tabla(
        'edicion_curso',
        'estado',
        array['ABIERTA', 'ACTIVA', 'ACTIVO', 'EN_CURSO', 'DISPONIBLE']
      ),
      'ABIERTA'
    );
    v_cast_estado := coalesce(
      public._servicio_sql_tipo_cast('edicion_curso', 'estado'),
      'text'
    );

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
        array['TITULAR', 'PRINCIPAL', 'DOCENTE', 'INSTRUCTOR', 'RESPONSABLE']
      );
      v_cast_funcion := public._servicio_sql_tipo_cast('docente_edicion', 'funcion');
      if v_funcion is not null and v_cast_funcion is not null then
        begin
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
        exception
          when others then
            null;
        end;
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

revoke all on function public._servicio_resolver_enum_tabla(text, text, text[])
  from public, anon, authenticated;
revoke all on function public.servicio_asegurar_edicion_curso(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public._servicio_resolver_enum_tabla(text, text, text[])
  to service_role;
grant execute on function public.servicio_asegurar_edicion_curso(uuid, uuid)
  to service_role;

commit;
