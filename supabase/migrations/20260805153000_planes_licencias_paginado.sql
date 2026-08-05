-- Lectura administrativa real de planes, limites y licencias.

create or replace function public.admin_listar_planes_licencias(
  p_pagina integer default 1,
  p_por_pagina integer default 10,
  p_buscar text default null,
  p_estado text default null
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
  v_estado text := nullif(trim(coalesce(p_estado, '')), '');
  v_total bigint;
  v_planes jsonb;
  v_licencias jsonb;
begin
  if not public.es_super_admin_actual() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', plan.id,
    'codigo', plan.codigo,
    'nombre', plan.nombre,
    'descripcion', plan.descripcion,
    'moneda', plan.moneda,
    'precio_centavos', plan.precio_centavos,
    'periodicidad', plan.periodicidad::text,
    'estado', plan.estado::text,
    'organizaciones', (select count(*) from public.suscripcion_organizacion s
      where s.plan_saas_ref = plan.id and s.estado::text in ('ACTIVA', 'PRUEBA')),
    'limites', coalesce((select jsonb_object_agg(l.codigo_recurso, jsonb_build_object(
      'limite', l.limite, 'unidad', l.unidad
    )) from public.limite_plan l where l.plan_saas_id = plan.id), '{}'::jsonb)
  ) order by plan.precio_centavos, plan.nombre), '[]'::jsonb)
  into v_planes
  from public.plan_saas plan
  where plan.estado::text = 'ACTIVO';

  with base as (
    select
      instalacion.id,
      instalacion.nombre_organizacion::text as nombre,
      instalacion.clasificacion,
      instalacion.facturable,
      instalacion.vigencia_indefinida,
      instalacion.estado::text as estado_instalacion,
      suscripcion.id as suscripcion_id,
      coalesce(plan.nombre, case when instalacion.clasificacion = 'INTERNA' then 'Operacion interna' else 'Sin plan' end)::text as plan,
      coalesce(suscripcion.estado::text, case when instalacion.clasificacion = 'INTERNA' then 'NO_APLICA' end) as estado,
      suscripcion.vigente_desde,
      suscripcion.vigente_hasta,
      suscripcion.renovacion_automatica,
      coalesce((select limite from public.limite_plan l where l.plan_saas_id = plan.id
        and l.codigo_recurso in ('USUARIOS', 'ESTUDIANTES') order by case when l.codigo_recurso = 'USUARIOS' then 0 else 1 end limit 1), 0)::bigint as limite_usuarios,
      (select count(*) from public.membresia_principal m where m.instalacion_organizacion_ref = instalacion.id and m.estado = 'ACTIVA')::bigint as usuarios
    from public.instalacion_organizacion instalacion
    left join lateral (
      select s.* from public.suscripcion_organizacion s
      where s.instalacion_organizacion_id = instalacion.id
      order by s.creada_en desc limit 1
    ) suscripcion on true
    left join public.plan_saas plan on plan.id = suscripcion.plan_saas_ref
  ), filtrada as (
    select * from base where
      (v_buscar is null or nombre ilike '%' || v_buscar || '%' or plan ilike '%' || v_buscar || '%')
      and (v_estado is null or estado = v_estado or estado_instalacion = v_estado)
  )
  select count(*) into v_total from filtrada;

  with base as (
    select
      instalacion.id, instalacion.nombre_organizacion::text as nombre,
      instalacion.clasificacion, instalacion.facturable, instalacion.vigencia_indefinida,
      instalacion.estado::text as estado_instalacion, suscripcion.id as suscripcion_id,
      coalesce(plan.nombre, case when instalacion.clasificacion = 'INTERNA' then 'Operacion interna' else 'Sin plan' end)::text as plan,
      coalesce(suscripcion.estado::text, case when instalacion.clasificacion = 'INTERNA' then 'NO_APLICA' end) as estado,
      suscripcion.vigente_desde, suscripcion.vigente_hasta, suscripcion.renovacion_automatica,
      coalesce((select limite from public.limite_plan l where l.plan_saas_id = plan.id
        and l.codigo_recurso in ('USUARIOS', 'ESTUDIANTES') order by case when l.codigo_recurso = 'USUARIOS' then 0 else 1 end limit 1), 0)::bigint as limite_usuarios,
      (select count(*) from public.membresia_principal m where m.instalacion_organizacion_ref = instalacion.id and m.estado = 'ACTIVA')::bigint as usuarios
    from public.instalacion_organizacion instalacion
    left join lateral (select s.* from public.suscripcion_organizacion s where s.instalacion_organizacion_id = instalacion.id order by s.creada_en desc limit 1) suscripcion on true
    left join public.plan_saas plan on plan.id = suscripcion.plan_saas_ref
  ), pagina as (
    select * from base where
      (v_buscar is null or nombre ilike '%' || v_buscar || '%' or plan ilike '%' || v_buscar || '%')
      and (v_estado is null or estado = v_estado or estado_instalacion = v_estado)
    order by nombre limit v_por_pagina offset (v_pagina - 1) * v_por_pagina
  )
  select coalesce(jsonb_agg(to_jsonb(pagina)), '[]'::jsonb) into v_licencias from pagina;

  return jsonb_build_object(
    'planes', v_planes, 'licencias', v_licencias, 'pagina', v_pagina,
    'porPagina', v_por_pagina, 'total', v_total,
    'totalPaginas', case when v_total = 0 then 0 else ceil(v_total::numeric / v_por_pagina)::integer end
  );
end;
$$;

revoke all on function public.admin_listar_planes_licencias(integer, integer, text, text) from public;
grant execute on function public.admin_listar_planes_licencias(integer, integer, text, text) to authenticated;
