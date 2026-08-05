-- Administración principal: organizaciones e instalaciones existentes.

create or replace function public.admin_listar_organizaciones_paginado(
  p_pagina integer default 1,
  p_por_pagina integer default 10,
  p_buscar text default null,
  p_estado text default null,
  p_plan text default null
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
  v_plan text := nullif(trim(coalesce(p_plan, '')), '');
  v_total bigint;
  v_datos jsonb;
  v_resumen jsonb;
begin
  if not public.es_super_admin_actual() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  with base as (
    select
      instalacion.id,
      instalacion.nombre_organizacion::text as nombre,
      coalesce(empresa.numero_documento_fiscal, 'Sin documento')::text as ruc,
      coalesce(empresa.tipo_documento_fiscal, 'Organización')::text as tipo,
      instalacion.estado::text as estado,
      instalacion.zona_horaria::text as zona_horaria,
      instalacion.creada_en,
      instalacion.habilitada_en,
      instalacion.suspendida_en,
      instalacion.version_autorizacion_conocida,
      instalacion.autorizacion_sincronizada_en,
      instalacion.tenant_ref,
      instalacion.empresa_sistema_ref,
      coalesce(plan.nombre, 'Sin plan')::text as plan,
      suscripcion.estado::text as estado_suscripcion,
      suscripcion.vigente_desde,
      suscripcion.vigente_hasta,
      coalesce(limite_usuarios.limite, 0)::bigint as limite_usuarios,
      (select count(*) from public.membresia_principal membresia
        where membresia.instalacion_organizacion_ref = instalacion.id
          and membresia.estado = 'ACTIVA')::bigint as usuarios,
      (select count(*) from public.curso_catalogo curso
        where curso.instalacion_proveedora_id = instalacion.id
          and curso.estado_publicacion::text <> 'RETIRADO')::bigint as cursos,
      (select count(*) from public.modulo_habilitado_organizacion modulo
        where modulo.instalacion_organizacion_id = instalacion.id
          and modulo.estado::text = 'ACTIVO')::bigint as modulos
    from public.instalacion_organizacion instalacion
    join public.empresa_principal empresa
      on empresa.id = instalacion.empresa_principal_ref
    left join lateral (
      select suscripcion.*
      from public.suscripcion_organizacion suscripcion
      where suscripcion.instalacion_organizacion_id = instalacion.id
      order by suscripcion.creada_en desc
      limit 1
    ) suscripcion on true
    left join public.plan_saas plan on plan.id = suscripcion.plan_saas_ref
    left join lateral (
      select limite.limite
      from public.limite_plan limite
      where limite.plan_saas_id = plan.id
        and limite.codigo_recurso in ('USUARIOS', 'ESTUDIANTES')
      order by case when limite.codigo_recurso = 'USUARIOS' then 0 else 1 end
      limit 1
    ) limite_usuarios on true
  ), filtrada as (
    select * from base
    where (v_buscar is null
      or nombre ilike '%' || v_buscar || '%'
      or ruc ilike '%' || v_buscar || '%'
      or tipo ilike '%' || v_buscar || '%')
      and (v_estado is null or estado = v_estado)
      and (v_plan is null or plan = v_plan)
  )
  select count(*) into v_total from filtrada;

  with base as (
    select
      instalacion.id,
      instalacion.nombre_organizacion::text as nombre,
      coalesce(empresa.numero_documento_fiscal, 'Sin documento')::text as ruc,
      coalesce(empresa.tipo_documento_fiscal, 'Organización')::text as tipo,
      instalacion.estado::text as estado,
      instalacion.zona_horaria::text as zona_horaria,
      instalacion.creada_en,
      instalacion.habilitada_en,
      instalacion.suspendida_en,
      instalacion.version_autorizacion_conocida,
      instalacion.autorizacion_sincronizada_en,
      instalacion.tenant_ref,
      instalacion.empresa_sistema_ref,
      coalesce(plan.nombre, 'Sin plan')::text as plan,
      suscripcion.estado::text as estado_suscripcion,
      suscripcion.vigente_desde,
      suscripcion.vigente_hasta,
      coalesce(limite_usuarios.limite, 0)::bigint as limite_usuarios,
      (select count(*) from public.membresia_principal membresia
        where membresia.instalacion_organizacion_ref = instalacion.id
          and membresia.estado = 'ACTIVA')::bigint as usuarios,
      (select count(*) from public.curso_catalogo curso
        where curso.instalacion_proveedora_id = instalacion.id
          and curso.estado_publicacion::text <> 'RETIRADO')::bigint as cursos,
      (select count(*) from public.modulo_habilitado_organizacion modulo
        where modulo.instalacion_organizacion_id = instalacion.id
          and modulo.estado::text = 'ACTIVO')::bigint as modulos
    from public.instalacion_organizacion instalacion
    join public.empresa_principal empresa on empresa.id = instalacion.empresa_principal_ref
    left join lateral (
      select suscripcion.* from public.suscripcion_organizacion suscripcion
      where suscripcion.instalacion_organizacion_id = instalacion.id
      order by suscripcion.creada_en desc limit 1
    ) suscripcion on true
    left join public.plan_saas plan on plan.id = suscripcion.plan_saas_ref
    left join lateral (
      select limite.limite from public.limite_plan limite
      where limite.plan_saas_id = plan.id and limite.codigo_recurso in ('USUARIOS', 'ESTUDIANTES')
      order by case when limite.codigo_recurso = 'USUARIOS' then 0 else 1 end limit 1
    ) limite_usuarios on true
  ), filtrada as (
    select * from base
    where (v_buscar is null or nombre ilike '%' || v_buscar || '%'
      or ruc ilike '%' || v_buscar || '%' or tipo ilike '%' || v_buscar || '%')
      and (v_estado is null or estado = v_estado)
      and (v_plan is null or plan = v_plan)
    order by nombre
    limit v_por_pagina offset (v_pagina - 1) * v_por_pagina
  )
  select coalesce(jsonb_agg(to_jsonb(filtrada)), '[]'::jsonb)
    into v_datos from filtrada;

  select jsonb_build_object(
    'total', count(*),
    'habilitadas', count(*) filter (where estado::text in ('HABILITADA', 'ACTIVA')),
    'pendientes', count(*) filter (where estado::text = 'PENDIENTE'),
    'suspendidas', count(*) filter (where estado::text = 'SUSPENDIDA'),
    'conSuscripcion', count(*) filter (where exists (
      select 1 from public.suscripcion_organizacion suscripcion
      where suscripcion.instalacion_organizacion_id = instalacion_organizacion.id
    ))
  ) into v_resumen
  from public.instalacion_organizacion;

  return jsonb_build_object(
    'datos', v_datos,
    'pagina', v_pagina,
    'porPagina', v_por_pagina,
    'total', v_total,
    'totalPaginas', case when v_total = 0 then 0 else ceil(v_total::numeric / v_por_pagina)::integer end,
    'resumen', v_resumen
  );
end;
$$;

revoke all on function public.admin_listar_organizaciones_paginado(integer, integer, text, text, text) from public;
grant execute on function public.admin_listar_organizaciones_paginado(integer, integer, text, text, text) to authenticated;
