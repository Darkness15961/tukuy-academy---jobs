-- Branding del selector de espacios: logo + portada (fondo) por organización.
-- Fuente de verdad: public.org_presencia (logo_url, portada_url).
-- Super admin define/actualiza; obtener_mis_contextos lo expone a todos los perfiles.

begin;

-- 1) Contextos: incluir branding institucional
drop function if exists public.obtener_mis_contextos();

create or replace function public.obtener_mis_contextos()
returns table (
  membresia_id uuid,
  funcion_id uuid,
  rol_id uuid,
  usuario_id uuid,
  empresa_principal_ref bigint,
  empresa_sistema_ref uuid,
  tenant_ref uuid,
  instalacion_organizacion_ref uuid,
  organizacion_nombre text,
  organizacion_logo text,
  organizacion_portada text,
  rol_codigo text,
  portal text,
  permisos text[],
  alcance jsonb,
  ambito_docencia text,
  version_autorizacion bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    membresia.id,
    funcion.id,
    perfil.id,
    identidad.id,
    membresia.empresa_principal_ref,
    membresia.empresa_sistema_ref,
    membresia.tenant_ref,
    membresia.instalacion_organizacion_ref,
    coalesce(instalacion.nombre_organizacion, 'Administración Tukuy'),
    nullif(trim(coalesce(presencia.logo_url, '')), ''),
    nullif(trim(coalesce(presencia.portada_url, '')), ''),
    funcion.codigo,
    perfil.portal,
    public.permisos_efectivos_funcion(funcion.id),
    funcion.alcance,
    funcion.ambito_docencia,
    membresia.version_autorizacion
  from public.identidad_principal identidad
  join public.membresia_principal membresia
    on membresia.identidad_principal_id = identidad.id
  join public.funcion_principal funcion
    on funcion.membresia_principal_id = membresia.id
  join public.perfil_principal perfil
    on perfil.id = funcion.perfil_principal_id
  left join public.instalacion_organizacion instalacion
    on instalacion.id = membresia.instalacion_organizacion_ref
  left join public.org_presencia presencia
    on presencia.instalacion_organizacion_id = membresia.instalacion_organizacion_ref
  where identidad.auth_usuario_ref = (select auth.uid())
    and identidad.estado = 'ACTIVO'
    and membresia.estado = 'ACTIVA'
    and funcion.estado = 'ACTIVA'
    and perfil.estado = 'ACTIVO'
    and (membresia.vigente_hasta is null or membresia.vigente_hasta > now())
    and (funcion.vigente_hasta is null or funcion.vigente_hasta > now())
  order by funcion.es_principal desc, perfil.portal, funcion.codigo;
$$;

revoke all on function public.obtener_mis_contextos() from public;
grant execute on function public.obtener_mis_contextos() to authenticated;

-- 2) Super admin: leer branding de una instalación
create or replace function public.admin_obtener_branding_organizacion(
  p_instalacion_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_row public.org_presencia%rowtype;
  v_nombre text;
begin
  if not public.es_super_admin_actual() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  if p_instalacion_id is null then
    raise exception 'Instalación requerida';
  end if;

  select coalesce(nullif(trim(i.nombre_organizacion), ''), 'Organización')
  into v_nombre
  from public.instalacion_organizacion i
  where i.id = p_instalacion_id;

  if v_nombre is null then
    raise exception 'Instalación no encontrada';
  end if;

  perform public.org_asegurar_presencia_base(p_instalacion_id);

  select * into v_row
  from public.org_presencia p
  where p.instalacion_organizacion_id = p_instalacion_id;

  return jsonb_build_object(
    'ok', true,
    'instalacionId', p_instalacion_id,
    'nombre', v_nombre,
    'logo', coalesce(v_row.logo_url, ''),
    'portada', coalesce(v_row.portada_url, '')
  );
end;
$$;

-- 3) Super admin: guardar logo + portada (fondo del selector de espacios)
create or replace function public.admin_guardar_branding_organizacion(
  p_instalacion_id uuid,
  p_logo text default null,
  p_portada text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.org_presencia%rowtype;
begin
  if not public.es_super_admin_actual() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  if p_instalacion_id is null then
    raise exception 'Instalación requerida';
  end if;

  if not exists (
    select 1 from public.instalacion_organizacion i where i.id = p_instalacion_id
  ) then
    raise exception 'Instalación no encontrada';
  end if;

  perform public.org_asegurar_presencia_base(p_instalacion_id);

  update public.org_presencia p
  set
    logo_url = case
      when p_logo is null then p.logo_url
      else coalesce(nullif(trim(p_logo), ''), '')
    end,
    portada_url = case
      when p_portada is null then p.portada_url
      else coalesce(nullif(trim(p_portada), ''), '')
    end,
    actualizado_en = now()
  where p.instalacion_organizacion_id = p_instalacion_id
  returning * into v_row;

  return jsonb_build_object(
    'ok', true,
    'instalacionId', p_instalacion_id,
    'logo', coalesce(v_row.logo_url, ''),
    'portada', coalesce(v_row.portada_url, '')
  );
end;
$$;

revoke all on function public.admin_obtener_branding_organizacion(uuid) from public;
revoke all on function public.admin_guardar_branding_organizacion(uuid, text, text) from public;
grant execute on function public.admin_obtener_branding_organizacion(uuid) to authenticated;
grant execute on function public.admin_guardar_branding_organizacion(uuid, text, text) to authenticated;

commit;
