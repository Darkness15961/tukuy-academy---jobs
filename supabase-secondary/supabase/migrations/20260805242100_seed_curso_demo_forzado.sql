-- Fase 2b · seed forzado de curso demo (si la tabla está vacía).
-- Ejecutar en el SQL Editor del proyecto SECUNDARIO.
-- Si el SELECT de diagnóstico muestra 0 membresías, primero haz login/verificar
-- (Fase 1) y vuelve a correr este script.

begin;

-- 1) Diagnóstico rápido
do $$
declare
  v_membresias integer;
  v_accesos integer;
  v_cursos integer;
  v_modalidades text;
  v_estados text;
begin
  select count(*) into v_membresias from public.membresia_organizacion;
  select count(*) into v_accesos from public.acceso_identidad_principal;
  select count(*) into v_cursos from public.curso;

  select string_agg(e.enumlabel, ', ' order by e.enumsortorder)
    into v_modalidades
  from pg_catalog.pg_type t
  join pg_catalog.pg_enum e on e.enumtypid = t.oid
  where t.typname = (
    select c.udt_name
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = 'curso'
      and c.column_name = 'modalidad'
  );

  select string_agg(e.enumlabel, ', ' order by e.enumsortorder)
    into v_estados
  from pg_catalog.pg_type t
  join pg_catalog.pg_enum e on e.enumtypid = t.oid
  where t.typname = (
    select c.udt_name
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = 'curso'
      and c.column_name = 'estado'
  );

  raise notice 'Diagnostico: membresias=%, accesos=%, cursos=%, modalidades=[%], estados_curso=[%]',
    v_membresias, v_accesos, v_cursos, coalesce(v_modalidades, '?'), coalesce(v_estados, '?');
end;
$$;

-- 2) Seed robusto
do $$
declare
  v_autor uuid;
  v_curso_id uuid := 'a1000000-0000-4000-8000-000000000001';
  v_version_id uuid := 'a1000000-0000-4000-8000-000000000002';
  v_modalidad_texto text;
  v_estado_texto text;
begin
  if exists (select 1 from public.curso where id = v_curso_id) then
    raise notice 'El curso demo ya existe (%)', v_curso_id;
    return;
  end if;

  if exists (select 1 from public.curso) then
    raise notice 'Ya hay cursos; no se inserta demo automatico.';
    return;
  end if;

  select identidad_usuario_ref
    into v_autor
  from public.membresia_organizacion
  order by actualizada_en desc nulls last
  limit 1;

  if v_autor is null then
    select identidad_principal_ref
      into v_autor
    from public.acceso_identidad_principal
    where estado = 'ACTIVO'
    order by sincronizado_en desc nulls last
    limit 1;
  end if;

  if v_autor is null then
    raise exception
      'No hay autor: ejecuta sync-access / Verificar conexion (Fase 1) para crear membresia_organizacion o acceso_identidad_principal, y vuelve a correr este SQL.';
  end if;

  -- Preferencias conocidas; si no existen, usa el primer label del enum.
  select coalesce(
    (
      select e.enumlabel
      from pg_catalog.pg_type t
      join pg_catalog.pg_enum e on e.enumtypid = t.oid
      where t.typname = (
        select c.udt_name from information_schema.columns c
        where c.table_schema = 'public' and c.table_name = 'curso' and c.column_name = 'modalidad'
      )
        and e.enumlabel in ('VIRTUAL', 'EN_VIVO', 'HIBRIDA', 'MIXTO', 'PRESENCIAL', 'ASINCRONO')
      order by case e.enumlabel
        when 'VIRTUAL' then 0
        when 'ASINCRONO' then 1
        when 'HIBRIDA' then 2
        when 'MIXTO' then 3
        when 'EN_VIVO' then 4
        else 5
      end
      limit 1
    ),
    (
      select e.enumlabel
      from pg_catalog.pg_type t
      join pg_catalog.pg_enum e on e.enumtypid = t.oid
      where t.typname = (
        select c.udt_name from information_schema.columns c
        where c.table_schema = 'public' and c.table_name = 'curso' and c.column_name = 'modalidad'
      )
      order by e.enumsortorder
      limit 1
    )
  ) into v_modalidad_texto;

  select coalesce(
    (
      select e.enumlabel
      from pg_catalog.pg_type t
      join pg_catalog.pg_enum e on e.enumtypid = t.oid
      where t.typname = (
        select c.udt_name from information_schema.columns c
        where c.table_schema = 'public' and c.table_name = 'curso' and c.column_name = 'estado'
      )
        and e.enumlabel in ('BORRADOR', 'PUBLICADO', 'ACTIVO', 'EN_REVISION')
      order by case e.enumlabel
        when 'BORRADOR' then 0
        when 'EN_REVISION' then 1
        when 'PUBLICADO' then 2
        else 3
      end
      limit 1
    ),
    (
      select e.enumlabel
      from pg_catalog.pg_type t
      join pg_catalog.pg_enum e on e.enumtypid = t.oid
      where t.typname = (
        select c.udt_name from information_schema.columns c
        where c.table_schema = 'public' and c.table_name = 'curso' and c.column_name = 'estado'
      )
      order by e.enumsortorder
      limit 1
    )
  ) into v_estado_texto;

  if v_modalidad_texto is null or v_estado_texto is null then
    raise exception 'No se pudieron resolver enums modalidad/estado de public.curso';
  end if;

  execute format(
    'insert into public.curso (
       id, autor_identidad_ref, codigo, titulo, resumen, categoria,
       modalidad, estado, creado_en, actualizado_en, version_registro
     ) values (
       $1::uuid, $2::uuid, $3, $4, $5, $6,
       $7::%I, $8::%I, now(), now(), 1
     )',
    (
      select c.udt_name from information_schema.columns c
      where c.table_schema = 'public' and c.table_name = 'curso' and c.column_name = 'modalidad'
    ),
    (
      select c.udt_name from information_schema.columns c
      where c.table_schema = 'public' and c.table_name = 'curso' and c.column_name = 'estado'
    )
  )
  using
    v_curso_id,
    v_autor,
    'DEMO-001',
    'Curso demo Tukuy (secundaria)',
    'Curso semilla para validar el listado tipado via gateway.',
    'Integracion',
    v_modalidad_texto,
    v_estado_texto;

  insert into public.version_curso (
    id, curso_id, numero, titulo_historico, horas, nota_minima, nota_maxima, estado
  ) values (
    v_version_id,
    v_curso_id,
    1,
    'Curso demo Tukuy (secundaria)',
    4,
    11,
    20,
    'BORRADOR'
  )
  on conflict (id) do nothing;

  raise notice 'Curso demo insertado: id=%, autor=%, modalidad=%, estado=%',
    v_curso_id, v_autor, v_modalidad_texto, v_estado_texto;
end;
$$;

commit;

-- 3) Verificación
select id, codigo, titulo, estado::text, modalidad::text, autor_identidad_ref
from public.curso
order by creado_en desc;
