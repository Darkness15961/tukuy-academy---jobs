-- PRINCIPAL: listado de accesos agrupado por identidad (una fila por persona).
-- Ejecutar en el SQL Editor del proyecto PRINCIPAL.
-- Corrige 42P01: relation "filtradas" does not exist (CTE fuera de alcance).

begin;

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
  v_resultado jsonb;
begin
  if not public.es_super_admin_actual() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  if v_nivel is not null
    and v_nivel not in ('PLATAFORMA', 'ORGANIZACION', 'PERSONAL', 'SIN_ACCESO')
  then
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
        when funcion.id is null then null
        when membresia.alcance_tipo = 'PLATAFORMA' then 'Tukuy · Plataforma'
        else coalesce(instalacion.nombre_organizacion, 'Sin entidad asignada')
      end::text as organizacion_nombre,
      membresia.instalacion_organizacion_ref as instalacion_ref,
      case
        when funcion.id is null then null
        else funcion.estado::text
      end as estado_funcion,
      case
        when funcion.id is null then null
        else public.permisos_efectivos_funcion(funcion.id)::text[]
      end as permisos
    from public.identidad_principal identidad
    left join public.membresia_principal membresia
      on membresia.identidad_principal_id = identidad.id
     and membresia.estado in ('PENDIENTE', 'ACTIVA', 'SUSPENDIDA')
    left join public.funcion_principal funcion
      on funcion.membresia_principal_id = membresia.id
     and funcion.estado in ('ACTIVA', 'SUSPENDIDA')
    left join public.perfil_principal perfil
      on perfil.id = funcion.perfil_principal_id
    left join public.instalacion_organizacion instalacion
      on instalacion.id = membresia.instalacion_organizacion_ref
    where identidad.estado <> 'BLOQUEADO'
  ),
  por_identidad as (
    select
      f.identidad_id,
      max(f.nombre) as nombre,
      max(f.correo) as correo,
      max(f.avatar_url) as avatar_url,
      max(f.estado_identidad) as estado_identidad,
      coalesce(
        jsonb_agg(
          jsonb_build_object(
            'funcion_id', f.funcion_id,
            'membresia_id', f.membresia_id,
            'identidad_id', f.identidad_id,
            'nombre', f.nombre,
            'correo', f.correo,
            'avatar_url', f.avatar_url,
            'estado_identidad', f.estado_identidad,
            'perfil_codigo', f.perfil_codigo,
            'perfil_nombre', f.perfil_nombre,
            'portal', f.portal,
            'nivel', f.nivel,
            'organizacion_nombre', f.organizacion_nombre,
            'instalacion_ref', f.instalacion_ref,
            'estado_funcion', f.estado_funcion,
            'permisos', to_jsonb(coalesce(f.permisos, array[]::text[]))
          )
          order by
            case f.nivel
              when 'PLATAFORMA' then 0
              when 'ORGANIZACION' then 1
              else 2
            end,
            f.perfil_nombre nulls last,
            f.organizacion_nombre nulls last
        ) filter (where f.funcion_id is not null),
        '[]'::jsonb
      ) as accesos,
      count(f.funcion_id) filter (where f.funcion_id is not null) as total_accesos,
      bool_or(f.nivel = 'PLATAFORMA') as tiene_plataforma,
      bool_or(f.nivel = 'ORGANIZACION') as tiene_organizacion,
      bool_or(f.nivel = 'PERSONAL') as tiene_personal,
      string_agg(distinct f.perfil_nombre, ' ')
        filter (where f.perfil_nombre is not null) as perfiles_texto,
      string_agg(distinct f.organizacion_nombre, ' ')
        filter (where f.organizacion_nombre is not null) as espacios_texto
    from filas f
    group by f.identidad_id
  ),
  filtradas as (
    select
      p.identidad_id,
      p.nombre,
      p.correo,
      p.avatar_url,
      p.estado_identidad,
      p.accesos,
      count(*) over () as total_filtrado
    from por_identidad p
    where (
      v_buscar is null
      or p.nombre ilike '%' || v_buscar || '%'
      or coalesce(p.correo, '') ilike '%' || v_buscar || '%'
      or coalesce(p.perfiles_texto, '') ilike '%' || v_buscar || '%'
      or coalesce(p.espacios_texto, '') ilike '%' || v_buscar || '%'
    )
    and (
      v_nivel is null
      or (v_nivel = 'SIN_ACCESO' and p.total_accesos = 0)
      or (v_nivel = 'PLATAFORMA' and p.tiene_plataforma)
      or (v_nivel = 'ORGANIZACION' and p.tiene_organizacion)
      or (v_nivel = 'PERSONAL' and p.tiene_personal)
    )
  ),
  pagina as (
    select *
    from filtradas
    order by nombre, correo
    limit v_por_pagina
    offset (v_pagina - 1) * v_por_pagina
  ),
  agregado as (
    select
      coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'identidad_id', p.identidad_id,
              'nombre', p.nombre,
              'correo', p.correo,
              'avatar_url', p.avatar_url,
              'estado_identidad', p.estado_identidad,
              'accesos', p.accesos
            )
            order by p.nombre, p.correo
          )
          from pagina p
        ),
        '[]'::jsonb
      ) as datos,
      coalesce((select total_filtrado from filtradas limit 1), 0)::bigint as total
  ),
  resumen as (
    select jsonb_build_object(
      'identidades', (
        select count(*) from public.identidad_principal where estado <> 'BLOQUEADO'
      ),
      'sinAcceso', (
        select count(*)
        from public.identidad_principal identidad
        where identidad.estado <> 'BLOQUEADO'
          and not exists (
            select 1
            from public.membresia_principal membresia
            join public.funcion_principal funcion
              on funcion.membresia_principal_id = membresia.id
            where membresia.identidad_principal_id = identidad.id
              and funcion.estado = 'ACTIVA'
          )
      ),
      'accesosActivos', (
        select count(*) from public.funcion_principal where estado = 'ACTIVA'
      ),
      'funcionesPlataforma', (
        select count(*)
        from public.funcion_principal funcion
        join public.perfil_principal perfil on perfil.id = funcion.perfil_principal_id
        where funcion.estado = 'ACTIVA' and perfil.nivel = 'PLATAFORMA'
      ),
      'organizacionesDelegadas', (
        select count(distinct membresia.instalacion_organizacion_ref)
        from public.membresia_principal membresia
        join public.funcion_principal funcion
          on funcion.membresia_principal_id = membresia.id
        where funcion.estado = 'ACTIVA'
          and membresia.instalacion_organizacion_ref is not null
      )
    ) as valor
  )
  select jsonb_build_object(
    'datos', a.datos,
    'pagina', v_pagina,
    'porPagina', v_por_pagina,
    'total', a.total,
    'totalPaginas', case
      when a.total = 0 then 0
      else ceil(a.total::numeric / v_por_pagina)::integer
    end,
    'resumen', r.valor,
    'agrupadoPorIdentidad', true
  )
  into v_resultado
  from agregado a
  cross join resumen r;

  return v_resultado;
end;
$$;

revoke all on function public.admin_listar_accesos_paginado(integer, integer, text, text) from public;
grant execute on function public.admin_listar_accesos_paginado(integer, integer, text, text) to authenticated;

commit;
