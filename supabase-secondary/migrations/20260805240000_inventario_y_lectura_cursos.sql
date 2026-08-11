-- Ejecutar en el SQL Editor del proyecto SECUNDARIO.
begin;

create or replace function public.servicio_inventario_esquema()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_tablas jsonb;
begin
  select coalesce(jsonb_agg(item order by item->>'grupo', item->>'tabla'), '[]'::jsonb)
  into v_tablas
  from (
    select jsonb_build_object(
      'tabla', c.relname,
      'filas', greatest(c.reltuples::bigint, 0),
      'grupo', case
        when c.relname ~* '(curso|leccion|modulo|unidad_did|catalogo|aprendizaje|matricul|alumno|estudiante|docente|certific|sesion|examen|evaluac|calific|actividad)' then 'ACADEMICO'
        when c.relname ~* '(persona|usuario|miembro|equipo|sede|organigrama|estructura|area|unidad_org)' then 'PERSONAS'
        when c.relname ~* '(pago|factura|orden|licencia|plan|suscrip|precio|cobro)' then 'COMERCIAL'
        when c.relname ~* '(acceso|contexto|perfil_institucional|identidad|permiso|rol)' then 'SEGURIDAD'
        else 'OTRO'
      end,
      'columnas', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'nombre', cols.column_name,
          'tipo', cols.data_type
        ) order by cols.ordinal_position), '[]'::jsonb)
        from information_schema.columns cols
        where cols.table_schema = 'public'
          and cols.table_name = c.relname
      )
    ) as item
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
      and c.relname not like 'pg_%'
  ) inventario;

  return jsonb_build_object(
    'ok', true,
    'totalTablas', jsonb_array_length(v_tablas),
    'tablas', v_tablas,
    'generadoEn', now()
  );
end;
$$;

create or replace function public.servicio_listar_cursos_secundaria()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_tabla text;
  v_datos jsonb := '[]'::jsonb;
  v_columnas text[];
begin
  select c.relname
    into v_tabla
  from pg_catalog.pg_class c
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r'
    and c.relname in (
      'curso_catalogo', 'curso', 'cursos', 'catalogo_curso', 'oferta_curso',
      'curso_oferta', 'asignatura', 'programa_curso', 'curso_institucional'
    )
  order by case c.relname
    when 'curso_catalogo' then 0
    when 'curso' then 1
    when 'cursos' then 2
    when 'curso_institucional' then 3
    else 4
  end
  limit 1;

  if v_tabla is null then
    select c.relname
      into v_tabla
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
      and c.relname ~* 'curso'
    order by c.relname
    limit 1;
  end if;

  if v_tabla is null then
    return jsonb_build_object(
      'ok', true,
      'tabla', null,
      'datos', '[]'::jsonb,
      'mensaje', 'No se encontro una tabla de cursos en la secundaria'
    );
  end if;

  select coalesce(array_agg(cols.column_name order by cols.ordinal_position), '{}')
    into v_columnas
  from information_schema.columns cols
  where cols.table_schema = 'public'
    and cols.table_name = v_tabla;

  execute format(
    'select coalesce(jsonb_agg(to_jsonb(t)), ''[]''::jsonb) from (select * from public.%I limit 50) t',
    v_tabla
  ) into v_datos;

  return jsonb_build_object(
    'ok', true,
    'tabla', v_tabla,
    'columnas', to_jsonb(v_columnas),
    'totalDevueltos', jsonb_array_length(v_datos),
    'datos', v_datos
  );
end;
$$;

revoke all on function public.servicio_inventario_esquema() from public, anon, authenticated;
revoke all on function public.servicio_listar_cursos_secundaria() from public, anon, authenticated;
grant execute on function public.servicio_inventario_esquema() to service_role;
grant execute on function public.servicio_listar_cursos_secundaria() to service_role;

commit;
