-- Fix cast de curso.estado con search_path vacío (estado_curso / PGRST).
-- Ejecutar en SQL Editor SECUNDARIO.
-- Requiere public._servicio_sql_tipo_cast (20260805252200).
-- Corrige: type "estado_curso" does not exist al marcar CONTENIDO_REVISADO.

begin;

-- Asegura labels del workflow en el enum real de curso.estado
do $$
declare
  v_tipo oid;
  v_nombre text;
  v_nsp text;
  v_label text;
begin
  select a.atttypid, t.typname, n.nspname
  into v_tipo, v_nombre, v_nsp
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
      execute format('alter type %I.%I add value %L', v_nsp, v_nombre, v_label);
      raise notice 'Añadido % a %.%', v_label, v_nsp, v_nombre;
    end if;
  end loop;
end;
$$;

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
  v_cast_estado text;
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

  v_cast_estado := public._servicio_sql_tipo_cast('curso', 'estado');

  execute format(
    'update public.curso
     set estado = $2::%s,
         actualizado_en = now(),
         version_registro = version_registro + 1
     where id = $1',
    v_cast_estado
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

revoke all on function public.servicio_actualizar_estado_curso(uuid, text)
  from public, anon, authenticated;
grant execute on function public.servicio_actualizar_estado_curso(uuid, text)
  to service_role;

commit;
