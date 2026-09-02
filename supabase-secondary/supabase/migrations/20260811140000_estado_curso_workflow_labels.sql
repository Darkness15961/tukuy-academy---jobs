-- Workflow org: labels reales en curso.estado + sin colapsar OBSERVADO/APROBADO.
-- Ejecutar en el SQL Editor del proyecto SECUNDARIO.

-- 1) Añadir labels al enum (si curso.estado es enum)
do $$
declare
  v_tipo oid;
  v_nombre text;
  v_label text;
begin
  select a.atttypid, t.typname
  into v_tipo, v_nombre
  from pg_attribute a
  join pg_class c on c.oid = a.attrelid
  join pg_namespace n on n.oid = c.relnamespace
  join pg_type t on t.oid = a.atttypid
  where n.nspname = 'public'
    and c.relname = 'curso'
    and a.attname = 'estado'
    and not a.attisdropped
  limit 1;

  if v_tipo is null then
    raise notice 'curso.estado no encontrado';
    return;
  end if;

  if (select typtype from pg_type where oid = v_tipo) <> 'e' then
    raise notice 'curso.estado no es enum (%); no se añaden labels', v_nombre;
    return;
  end if;

  foreach v_label in array array[
    'EN_REVISION',
    'CONTENIDO_REVISADO',
    'OBSERVADO',
    'APROBADO',
    'PUBLICADO',
    'BORRADOR',
    'ARCHIVADO'
  ]
  loop
    if not exists (
      select 1 from pg_enum e where e.enumtypid = v_tipo and e.enumlabel = v_label
    ) then
      execute format('alter type %I add value %L', v_nombre, v_label);
      raise notice 'Añadido % al enum %', v_label, v_nombre;
    end if;
  end loop;
end;
$$;

-- 2) Actualizar estado sin colapsar OBSERVADO→BORRADOR ni APROBADO→PUBLICADO
create or replace function public.servicio_actualizar_estado_curso(
  p_curso_id uuid,
  p_estado text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_estado text;
  v_tipo text;
  v_solicitado text := upper(trim(coalesce(p_estado, 'BORRADOR')));
begin
  if p_curso_id is null then
    raise exception 'Curso requerido';
  end if;

  v_estado := public._servicio_resolver_enum_curso(
    'estado',
    array[
      v_solicitado,
      'EN_REVISION',
      'CONTENIDO_REVISADO',
      'OBSERVADO',
      'APROBADO',
      'PUBLICADO',
      'BORRADOR',
      'ARCHIVADO',
      'ACTIVO'
    ]
  );

  select c.udt_name into v_tipo
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = 'curso'
    and c.column_name = 'estado';

  execute format(
    'update public.curso
     set estado = $2::%I,
         actualizado_en = now(),
         version_registro = version_registro + 1
     where id = $1',
    v_tipo
  )
  using p_curso_id, v_estado;

  return jsonb_build_object(
    'ok', true,
    'estadoSolicitado', v_solicitado,
    'estadoAplicado', v_estado,
    'curso', (public.servicio_obtener_curso_tipado(p_curso_id))->'curso'
  );
end;
$$;

-- 3) Guardar / limpiar observación en el borrador (visible al docente)
create or replace function public.servicio_guardar_observacion_curso(
  p_curso_id uuid,
  p_observacion text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_doc jsonb;
begin
  if p_curso_id is null then
    raise exception 'Curso requerido';
  end if;

  select d.documento into v_doc
  from public.documento_borrador_curso d
  where d.curso_id = p_curso_id;

  if v_doc is null then
    v_doc := '{}'::jsonb;
  end if;

  if nullif(trim(coalesce(p_observacion, '')), '') is null then
    v_doc := v_doc - 'observacion' - 'observadoEn';
  else
    v_doc := v_doc || jsonb_build_object(
      'observacion', trim(p_observacion),
      'observadoEn', now()
    );
  end if;

  insert into public.documento_borrador_curso (curso_id, documento, actualizado_en)
  values (p_curso_id, v_doc, now())
  on conflict (curso_id) do update
    set documento = excluded.documento,
        actualizado_en = now();

  return jsonb_build_object(
    'ok', true,
    'cursoId', p_curso_id,
    'observacion', v_doc->>'observacion'
  );
end;
$$;

revoke all on function public.servicio_actualizar_estado_curso(uuid, text)
  from public, anon, authenticated;
revoke all on function public.servicio_guardar_observacion_curso(uuid, text)
  from public, anon, authenticated;

grant execute on function public.servicio_actualizar_estado_curso(uuid, text)
  to service_role;
grant execute on function public.servicio_guardar_observacion_curso(uuid, text)
  to service_role;
