-- Ejecutar una sola vez en el SQL Editor del proyecto principal.
begin;

alter table public.orden_saas enable row level security;
alter table public.pago_saas enable row level security;

create or replace function public.admin_obtener_panel_real()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.es_super_admin_actual() then raise exception 'No autorizado' using errcode = '42501'; end if;
  return jsonb_build_object(
    'organizaciones', jsonb_build_object(
      'total', (select count(*) from public.instalacion_organizacion),
      'habilitadas', (select count(*) from public.instalacion_organizacion where estado::text in ('HABILITADA','ACTIVA')),
      'pendientes', (select count(*) from public.instalacion_organizacion where estado::text = 'PENDIENTE')
    ),
    'identidades', jsonb_build_object(
      'total', (select count(*) from public.identidad_principal),
      'activas', (select count(*) from public.identidad_principal where estado = 'ACTIVO')
    ),
    'cursos', jsonb_build_object(
      'total', (select count(*) from public.curso_catalogo),
      'publicados', (select count(*) from public.curso_catalogo where estado_publicacion::text = 'PUBLICADO'),
      'revision', (select count(*) from public.curso_catalogo where estado_publicacion::text not in ('PUBLICADO','RETIRADO'))
    ),
    'finanzas', jsonb_build_object(
      'facturadoMesCentavos', (select coalesce(sum(total_centavos),0) from public.orden_saas where creada_en >= date_trunc('month',now())),
      'cobradoMesCentavos', (select coalesce(sum(monto_centavos),0) from public.pago_saas where confirmado_en >= date_trunc('month',now()) and estado::text in ('CONFIRMADO','PAGADO','APROBADO')),
      'ordenesPendientes', (select count(*) from public.orden_saas where estado::text in ('PENDIENTE','VENCIDA'))
    ),
    'suscripciones', jsonb_build_object(
      'activas', (select count(*) from public.suscripcion_organizacion where estado::text = 'ACTIVA'),
      'porVencer', (select count(*) from public.suscripcion_organizacion where vigente_hasta between now() and now() + interval '30 days')
    ),
    'alertas', coalesce((select jsonb_agg(x order by prioridad, titulo) from (
      select 1 prioridad, 'Instalacion pendiente' titulo, nombre_organizacion detalle, id::text referencia from public.instalacion_organizacion where estado::text = 'PENDIENTE'
      union all
      select 2, 'Suscripcion por vencer', i.nombre_organizacion, s.id::text from public.suscripcion_organizacion s join public.instalacion_organizacion i on i.id=s.instalacion_organizacion_id where s.vigente_hasta between now() and now()+interval '30 days'
      limit 10
    ) x), '[]'::jsonb)
  );
end; $$;

create or replace function public.admin_crear_organizacion(p_datos jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_empresa_id bigint; v_tenant_id uuid; v_empresa_sistema_id uuid; v_instalacion_id uuid;
  v_codigo text := upper(trim(coalesce(p_datos->>'codigo','')));
  v_documento text := nullif(trim(p_datos->>'numeroDocumento'),'');
  v_correo text; v_identidad uuid; v_membresia uuid; v_perfil uuid; v_rol text;
begin
  if not public.es_super_admin_actual() then raise exception 'No autorizado' using errcode = '42501'; end if;
  if v_codigo = '' or trim(coalesce(p_datos->>'razonSocial','')) = '' or v_documento is null then raise exception 'Codigo, razon social y documento son obligatorios'; end if;
  if exists(select 1 from public.empresa_principal where codigo=v_codigo or (tipo_documento_fiscal=p_datos->>'tipoDocumento' and numero_documento_fiscal=v_documento)) then raise exception 'Ya existe una empresa con ese codigo o documento'; end if;
  if lower(trim(p_datos->>'correoDireccion')) = lower(trim(p_datos->>'correoAdministracion')) then raise exception 'Direccion y Administracion deben usar correos diferentes'; end if;
  foreach v_correo in array array[lower(trim(p_datos->>'correoDireccion')),lower(trim(p_datos->>'correoAdministracion'))] loop
    if not exists(select 1 from public.identidad_principal where lower(correo)=v_correo) then raise exception 'La identidad % debe iniciar sesion primero', v_correo; end if;
  end loop;

  insert into public.empresa_principal(codigo,razon_social,nombre_comercial,tipo_documento_fiscal,numero_documento_fiscal,pais_codigo,estado)
  values(v_codigo,trim(p_datos->>'razonSocial'),nullif(trim(p_datos->>'nombreComercial'),''),p_datos->>'tipoDocumento',v_documento,upper(coalesce(p_datos->>'paisCodigo','PE')),'ACTIVA') returning id into v_empresa_id;
  insert into public.tenant_principal(empresa_principal_id,codigo,nombre,aislamiento,zona_horaria,estado)
  values(v_empresa_id,v_codigo,coalesce(nullif(trim(p_datos->>'nombreComercial'),''),trim(p_datos->>'razonSocial')),'BASE_POR_ORGANIZACION',coalesce(p_datos->>'zonaHoraria','America/Lima'),'PENDIENTE') returning id into v_tenant_id;
  insert into public.empresa_sistema(empresa_principal_id,tenant_principal_id,codigo_sistema,estado)
  values(v_empresa_id,v_tenant_id,'TUKUY_ACADEMY','PENDIENTE') returning id into v_empresa_sistema_id;
  insert into public.instalacion_organizacion(empresa_sistema_ref,empresa_principal_ref,tenant_ref,nombre_organizacion,zona_horaria,estado,clasificacion,facturable,vigencia_indefinida)
  values(v_empresa_sistema_id,v_empresa_id,v_tenant_id,coalesce(nullif(trim(p_datos->>'nombreComercial'),''),trim(p_datos->>'razonSocial')),coalesce(p_datos->>'zonaHoraria','America/Lima'),'PENDIENTE','CLIENTE',true,false) returning id into v_instalacion_id;

  for v_correo,v_rol in select * from (values(lower(trim(p_datos->>'correoDireccion')),'ORGANIZATION_OWNER'),(lower(trim(p_datos->>'correoAdministracion')),'ORGANIZATION_ADMIN')) x(correo,rol) loop
    select id into v_identidad from public.identidad_principal where lower(correo)=v_correo;
    select id into v_perfil from public.perfil_principal where codigo=v_rol and estado='ACTIVO';
    insert into public.membresia_principal(identidad_principal_id,empresa_principal_ref,empresa_sistema_ref,tenant_ref,instalacion_organizacion_ref,codigo,cargo,alcance_tipo,estado)
    values(v_identidad,v_empresa_id,v_empresa_sistema_id,v_tenant_id,v_instalacion_id,v_codigo||'-'||v_rol,case when v_rol='ORGANIZATION_OWNER' then 'Direccion' else 'Administracion' end,'ORGANIZACION','ACTIVA') returning id into v_membresia;
    insert into public.funcion_principal(membresia_principal_id,perfil_principal_id,codigo,alcance,es_principal,estado)
    values(v_membresia,v_perfil,v_rol,jsonb_build_object('tipo','ORGANIZACION','instalacionId',v_instalacion_id),true,'ACTIVA');
  end loop;
  return jsonb_build_object('empresaId',v_empresa_id,'tenantId',v_tenant_id,'empresaSistemaId',v_empresa_sistema_id,'instalacionId',v_instalacion_id,'estado','PENDIENTE');
end; $$;

create or replace function public.admin_listar_facturacion(p_pagina integer default 1,p_por_pagina integer default 10,p_buscar text default null,p_estado text default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_pag integer:=greatest(coalesce(p_pagina,1),1); v_tam integer:=least(greatest(coalesce(p_por_pagina,10),1),100); v_bus text:=nullif(trim(coalesce(p_buscar,'')),''); v_est text:=nullif(trim(coalesce(p_estado,'')),''); v_total bigint; v_datos jsonb; v_resumen jsonb;
begin
  if not public.es_super_admin_actual() then raise exception 'No autorizado' using errcode = '42501'; end if;
  with base as (select o.id,o.numero,i.nombre_organizacion organizacion,o.concepto,o.moneda,o.total_centavos,o.estado::text estado,o.creada_en,o.expira_en,o.pagada_en,p.id pago_id,p.proveedor,p.operacion_externa_ref,p.estado::text estado_pago,p.monto_centavos,p.confirmado_en from public.orden_saas o join public.suscripcion_organizacion s on s.id=o.suscripcion_organizacion_id join public.instalacion_organizacion i on i.id=s.instalacion_organizacion_id left join lateral(select p.* from public.pago_saas p where p.orden_saas_id=o.id order by p.iniciado_en desc limit 1)p on true), f as(select * from base where(v_bus is null or numero ilike '%'||v_bus||'%' or organizacion ilike '%'||v_bus||'%' or concepto ilike '%'||v_bus||'%')and(v_est is null or estado=v_est or estado_pago=v_est)) select count(*) into v_total from f;
  with base as (select o.id,o.numero,i.nombre_organizacion organizacion,o.concepto,o.moneda,o.total_centavos,o.estado::text estado,o.creada_en,o.expira_en,o.pagada_en,p.id pago_id,p.proveedor,p.operacion_externa_ref,p.estado::text estado_pago,p.monto_centavos,p.confirmado_en from public.orden_saas o join public.suscripcion_organizacion s on s.id=o.suscripcion_organizacion_id join public.instalacion_organizacion i on i.id=s.instalacion_organizacion_id left join lateral(select p.* from public.pago_saas p where p.orden_saas_id=o.id order by p.iniciado_en desc limit 1)p on true), f as(select * from base where(v_bus is null or numero ilike '%'||v_bus||'%' or organizacion ilike '%'||v_bus||'%' or concepto ilike '%'||v_bus||'%')and(v_est is null or estado=v_est or estado_pago=v_est)order by creada_en desc limit v_tam offset(v_pag-1)*v_tam) select coalesce(jsonb_agg(to_jsonb(f)),'[]'::jsonb) into v_datos from f;
  select jsonb_build_object('facturadoCentavos',coalesce(sum(total_centavos),0),'cobradoCentavos',coalesce(sum(total_centavos)filter(where estado::text in('PAGADA','PAGADO')),0),'pendienteCentavos',coalesce(sum(total_centavos)filter(where estado::text not in('PAGADA','PAGADO','ANULADA')),0)) into v_resumen from public.orden_saas;
  return jsonb_build_object('datos',v_datos,'pagina',v_pag,'porPagina',v_tam,'total',v_total,'resumen',v_resumen);
end; $$;

revoke all on function public.admin_obtener_panel_real() from public;
revoke all on function public.admin_crear_organizacion(jsonb) from public;
revoke all on function public.admin_listar_facturacion(integer,integer,text,text) from public;
grant execute on function public.admin_obtener_panel_real() to authenticated;
grant execute on function public.admin_crear_organizacion(jsonb) to authenticated;
grant execute on function public.admin_listar_facturacion(integer,integer,text,text) to authenticated;
commit;
