-- Configuracion global y auditoria administrativa reales.

alter table public.configuracion_tukuy enable row level security;
alter table public.parametro_tukuy enable row level security;
alter table public.auditoria_tukuy enable row level security;

insert into public.configuracion_tukuy (
  codigo_entorno, nombre, version_aplicacion, version_esquema_secundario_objetivo
) values ('PRODUCCION', 'Tukuy Academy', '1.0.0', 1)
on conflict (codigo_entorno) do nothing;

with configuracion as (
  select id from public.configuracion_tukuy where codigo_entorno = 'PRODUCCION'
), valores(clave, valor, tipo_valor, descripcion) as (values
  ('correo_soporte', 'soporte@tukuy.pe', 'TEXTO', 'Correo de soporte'),
  ('moneda', 'PEN', 'TEXTO', 'Moneda predeterminada'),
  ('zona_horaria', 'America/Lima', 'TEXTO', 'Zona horaria predeterminada'),
  ('revision_obligatoria', 'true', 'BOOLEANO', 'Revision obligatoria de cursos'),
  ('suspender_al_vencer', 'true', 'BOOLEANO', 'Suspension al vencer'),
  ('avisos_vencimiento', 'true', 'BOOLEANO', 'Avisos de vencimiento'),
  ('avisos_cursos', 'true', 'BOOLEANO', 'Avisos de cursos'),
  ('doble_factor', 'true', 'BOOLEANO', 'Doble factor administrativo')
)
insert into public.parametro_tukuy (configuracion_tukuy_id, clave, valor, tipo_valor, descripcion)
select configuracion.id, valores.clave, valores.valor, valores.tipo_valor, valores.descripcion
from configuracion cross join valores
where not exists (select 1 from public.parametro_tukuy p where p.configuracion_tukuy_id = configuracion.id and p.clave = valores.clave);

create unique index if not exists uq_parametro_tukuy_configuracion_clave
  on public.parametro_tukuy(configuracion_tukuy_id, clave);

create or replace function public.admin_obtener_configuracion()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_config public.configuracion_tukuy; v_parametros jsonb;
begin
  if not public.es_super_admin_actual() then raise exception 'No autorizado' using errcode = '42501'; end if;
  select * into v_config from public.configuracion_tukuy where codigo_entorno = 'PRODUCCION';
  select coalesce(jsonb_object_agg(clave, valor), '{}'::jsonb) into v_parametros
  from public.parametro_tukuy where configuracion_tukuy_id = v_config.id;
  return jsonb_build_object(
    'nombre', v_config.nombre,
    'correoSoporte', coalesce(v_parametros->>'correo_soporte', ''),
    'moneda', coalesce(v_parametros->>'moneda', 'PEN'),
    'zonaHoraria', coalesce(v_parametros->>'zona_horaria', 'America/Lima'),
    'revisionObligatoria', coalesce((v_parametros->>'revision_obligatoria')::boolean, true),
    'suspenderAlVencer', coalesce((v_parametros->>'suspender_al_vencer')::boolean, true),
    'avisosVencimiento', coalesce((v_parametros->>'avisos_vencimiento')::boolean, true),
    'avisosCursos', coalesce((v_parametros->>'avisos_cursos')::boolean, true),
    'dobleFactor', coalesce((v_parametros->>'doble_factor')::boolean, true)
  );
end; $$;

create or replace function public.admin_guardar_configuracion(p_datos jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_item record;
begin
  if not public.es_super_admin_actual() then raise exception 'No autorizado' using errcode = '42501'; end if;
  if coalesce(trim(p_datos->>'nombre'), '') = '' then raise exception 'El nombre es obligatorio'; end if;
  select id into v_id from public.configuracion_tukuy where codigo_entorno = 'PRODUCCION' for update;
  update public.configuracion_tukuy set nombre = trim(p_datos->>'nombre'), actualizada_en = now() where id = v_id;
  for v_item in select * from (values
    ('correo_soporte', coalesce(p_datos->>'correoSoporte', '')),
    ('moneda', coalesce(p_datos->>'moneda', 'PEN')),
    ('zona_horaria', coalesce(p_datos->>'zonaHoraria', 'America/Lima')),
    ('revision_obligatoria', coalesce(p_datos->>'revisionObligatoria', 'true')),
    ('suspender_al_vencer', coalesce(p_datos->>'suspenderAlVencer', 'true')),
    ('avisos_vencimiento', coalesce(p_datos->>'avisosVencimiento', 'true')),
    ('avisos_cursos', coalesce(p_datos->>'avisosCursos', 'true')),
    ('doble_factor', coalesce(p_datos->>'dobleFactor', 'true'))
  ) as x(clave, valor)
  loop
    insert into public.parametro_tukuy(configuracion_tukuy_id, clave, valor, tipo_valor)
    values(v_id, v_item.clave, v_item.valor, case when v_item.valor in ('true','false') then 'BOOLEANO' else 'TEXTO' end)
    on conflict (configuracion_tukuy_id, clave) do update set valor = excluded.valor, actualizado_en = now();
  end loop;
  return public.admin_obtener_configuracion();
end; $$;

create or replace function public.admin_listar_auditoria(p_pagina integer default 1, p_por_pagina integer default 10, p_buscar text default null, p_nivel text default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_pagina integer := greatest(coalesce(p_pagina,1),1); v_tamano integer := least(greatest(coalesce(p_por_pagina,10),1),100); v_buscar text := nullif(trim(coalesce(p_buscar,'')),''); v_nivel text := nullif(trim(coalesce(p_nivel,'')),''); v_total bigint; v_datos jsonb;
begin
  if not public.es_super_admin_actual() then raise exception 'No autorizado' using errcode = '42501'; end if;
  with base as (
    select a.id, a.creada_en, coalesce(i.nombre_mostrar, i.correo, 'Sistema')::text usuario,
      a.accion::text accion, a.recurso_tipo::text modulo, coalesce(host(a.direccion_ip), 'Interno')::text origen,
      case when a.resultado::text in ('ERROR','FALLIDO','DENEGADO') then 'ALERTA' else 'INFORMACION' end::text nivel
    from public.auditoria_tukuy a left join public.identidad_principal i on i.id = a.actor_identidad_ref
  ), filtrada as (select * from base where (v_buscar is null or usuario ilike '%'||v_buscar||'%' or accion ilike '%'||v_buscar||'%' or modulo ilike '%'||v_buscar||'%' or origen ilike '%'||v_buscar||'%') and (v_nivel is null or nivel = v_nivel))
  select count(*) into v_total from filtrada;
  with base as (
    select a.id, a.creada_en, coalesce(i.nombre_mostrar, i.correo, 'Sistema')::text usuario,
      a.accion::text accion, a.recurso_tipo::text modulo, coalesce(host(a.direccion_ip), 'Interno')::text origen,
      case when a.resultado::text in ('ERROR','FALLIDO','DENEGADO') then 'ALERTA' else 'INFORMACION' end::text nivel
    from public.auditoria_tukuy a left join public.identidad_principal i on i.id = a.actor_identidad_ref
  ), pagina as (select * from base where (v_buscar is null or usuario ilike '%'||v_buscar||'%' or accion ilike '%'||v_buscar||'%' or modulo ilike '%'||v_buscar||'%' or origen ilike '%'||v_buscar||'%') and (v_nivel is null or nivel = v_nivel) order by creada_en desc limit v_tamano offset (v_pagina-1)*v_tamano)
  select coalesce(jsonb_agg(to_jsonb(pagina)), '[]'::jsonb) into v_datos from pagina;
  return jsonb_build_object('datos',v_datos,'pagina',v_pagina,'porPagina',v_tamano,'total',v_total);
end; $$;

revoke all on function public.admin_obtener_configuracion() from public;
revoke all on function public.admin_guardar_configuracion(jsonb) from public;
revoke all on function public.admin_listar_auditoria(integer,integer,text,text) from public;
grant execute on function public.admin_obtener_configuracion() to authenticated;
grant execute on function public.admin_guardar_configuracion(jsonb) to authenticated;
grant execute on function public.admin_listar_auditoria(integer,integer,text,text) to authenticated;
