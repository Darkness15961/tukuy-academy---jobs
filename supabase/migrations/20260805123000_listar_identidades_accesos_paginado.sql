-- Listado administrativo paginado que incluye identidades sin acceso asignado.

create or replace function public.admin_listar_accesos_paginado(
  p_pagina integer default 1,
  p_por_pagina integer default 10,
  p_buscar text default null,
  p_nivel text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_pagina integer := greatest(coalesce(p_pagina, 1), 1);
  v_por_pagina integer := least(greatest(coalesce(p_por_pagina, 10), 1), 100);
  v_buscar text := nullif(trim(coalesce(p_buscar, '')), '');
  v_nivel text := nullif(trim(coalesce(p_nivel, '')), '');
  v_total bigint;
  v_items jsonb;
  v_resumen jsonb;
begin
  if not public.es_super_admin_actual() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  if v_nivel is not null and v_nivel not in ('PLATAFORMA', 'ORGANIZACION', 'PERSONAL', 'SIN_ACCESO') then
    raise exception 'Filtro de nivel inválido';
  end if;

  with filas as (
    select
      identidad.id as identidad_id,
      funcion.id as funcion_id,
      membresia.id as membresia_id,
      coalesce(nullif(identidad.nombre_mostrar, ''), identidad.correo, 'Usuario')::text as nombre,
      identidad.correo::text as correo,
      identidad.avatar_url::text as avatar_url,
      identidad.estado::text as estado_identidad,
      perfil.codigo::text as perfil_codigo,
      perfil.nombre::text as perfil_nombre,
      perfil.portal::text as portal,
      perfil.nivel::text as nivel,
      case
        when funcion.id is null then 'Sin acceso asignado'
        when membresia.alcance_tipo = 'PLATAFORMA' then 'Tukuy · Plataforma'
        else coalesce(instalacion.nombre_organizacion, 'Sin entidad asignada')
      end::text as organizacion_nombre,
      membresia.instalacion_organizacion_ref as instalacion_ref,
      coalesce(funcion.estado::text, 'SIN_ACCESO') as estado_funcion,
      case
        when funcion.id is null then array[]::text[]
        else public.permisos_efectivos_funcion(funcion.id)::text[]
      end as permisos
    from public.identidad_principal identidad
    left join public.membresia_principal membresia
      on membresia.identidad_principal_id = identidad.id
     and membresia.estado in ('PENDIENTE', 'ACTIVA', 'SUSPENDIDA')
    left join public.funcion_principal funcion
      on funcion.membresia_principal_id = membresia.id
     and funcion.estado in ('ACTIVA', 'SUSPENDIDA', 'REVOCADA')
    left join public.perfil_principal perfil
      on perfil.id = funcion.perfil_principal_id
    left join public.instalacion_organizacion instalacion
      on instalacion.id = membresia.instalacion_organizacion_ref
    where identidad.estado <> 'BLOQUEADO'
  ), filtradas as (
    select *
    from filas
    where (
      v_buscar is null
      or nombre ilike '%' || v_buscar || '%'
      or coalesce(correo, '') ilike '%' || v_buscar || '%'
      or coalesce(perfil_nombre, '') ilike '%' || v_buscar || '%'
      or organizacion_nombre ilike '%' || v_buscar || '%'
    )
    and (
      v_nivel is null
      or (v_nivel = 'SIN_ACCESO' and funcion_id is null)
      or nivel = v_nivel
    )
  )
  select count(*) into v_total from filtradas;

  with filas as (
    select
      identidad.id as identidad_id,
      funcion.id as funcion_id,
      membresia.id as membresia_id,
      coalesce(nullif(identidad.nombre_mostrar, ''), identidad.correo, 'Usuario')::text as nombre,
      identidad.correo::text as correo,
      identidad.avatar_url::text as avatar_url,
      identidad.estado::text as estado_identidad,
      perfil.codigo::text as perfil_codigo,
      perfil.nombre::text as perfil_nombre,
      perfil.portal::text as portal,
      perfil.nivel::text as nivel,
      case
        when funcion.id is null then 'Sin acceso asignado'
        when membresia.alcance_tipo = 'PLATAFORMA' then 'Tukuy · Plataforma'
        else coalesce(instalacion.nombre_organizacion, 'Sin entidad asignada')
      end::text as organizacion_nombre,
      membresia.instalacion_organizacion_ref as instalacion_ref,
      coalesce(funcion.estado::text, 'SIN_ACCESO') as estado_funcion,
      case when funcion.id is null then array[]::text[]
        else public.permisos_efectivos_funcion(funcion.id)::text[] end as permisos
    from public.identidad_principal identidad
    left join public.membresia_principal membresia
      on membresia.identidad_principal_id = identidad.id
     and membresia.estado in ('PENDIENTE', 'ACTIVA', 'SUSPENDIDA')
    left join public.funcion_principal funcion
      on funcion.membresia_principal_id = membresia.id
     and funcion.estado in ('ACTIVA', 'SUSPENDIDA', 'REVOCADA')
    left join public.perfil_principal perfil on perfil.id = funcion.perfil_principal_id
    left join public.instalacion_organizacion instalacion
      on instalacion.id = membresia.instalacion_organizacion_ref
    where identidad.estado <> 'BLOQUEADO'
  ), filtradas as (
    select * from filas
    where (v_buscar is null
      or nombre ilike '%' || v_buscar || '%'
      or coalesce(correo, '') ilike '%' || v_buscar || '%'
      or coalesce(perfil_nombre, '') ilike '%' || v_buscar || '%'
      or organizacion_nombre ilike '%' || v_buscar || '%')
      and (v_nivel is null
        or (v_nivel = 'SIN_ACCESO' and funcion_id is null)
        or nivel = v_nivel)
    order by nombre, correo, perfil_nombre nulls last
    limit v_por_pagina
    offset (v_pagina - 1) * v_por_pagina
  )
  select coalesce(jsonb_agg(to_jsonb(filtradas)), '[]'::jsonb)
    into v_items from filtradas;

  select jsonb_build_object(
    'identidades', (select count(*) from public.identidad_principal where estado <> 'BLOQUEADO'),
    'sinAcceso', (select count(*) from public.identidad_principal identidad where identidad.estado <> 'BLOQUEADO'
      and not exists (select 1 from public.membresia_principal membresia
        join public.funcion_principal funcion on funcion.membresia_principal_id = membresia.id
        where membresia.identidad_principal_id = identidad.id and funcion.estado = 'ACTIVA')),
    'accesosActivos', (select count(*) from public.funcion_principal where estado = 'ACTIVA'),
    'funcionesPlataforma', (select count(*) from public.funcion_principal funcion
      join public.perfil_principal perfil on perfil.id = funcion.perfil_principal_id
      where funcion.estado = 'ACTIVA' and perfil.nivel = 'PLATAFORMA'),
    'organizacionesDelegadas', (select count(distinct membresia.instalacion_organizacion_ref)
      from public.membresia_principal membresia
      join public.funcion_principal funcion on funcion.membresia_principal_id = membresia.id
      where funcion.estado = 'ACTIVA' and membresia.instalacion_organizacion_ref is not null)
  ) into v_resumen;

  return jsonb_build_object(
    'datos', v_items,
    'pagina', v_pagina,
    'porPagina', v_por_pagina,
    'total', v_total,
    'totalPaginas', case when v_total = 0 then 0 else ceil(v_total::numeric / v_por_pagina)::integer end,
    'resumen', v_resumen
  );
end;
$$;

revoke all on function public.admin_listar_accesos_paginado(integer, integer, text, text) from public;
grant execute on function public.admin_listar_accesos_paginado(integer, integer, text, text) to authenticated;
