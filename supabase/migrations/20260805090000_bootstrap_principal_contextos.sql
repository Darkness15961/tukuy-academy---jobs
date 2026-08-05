-- Módulo 0 · bootstrap mínimo de la base principal.
-- Datos determinísticos e idempotentes para habilitar el primer contexto real.

-- ---------------------------------------------------------------------------
-- 1. Tukuy Academy como empresa, tenant e instalación inicial
-- ---------------------------------------------------------------------------

insert into public.empresa_principal (
  id,
  codigo,
  razon_social,
  nombre_comercial,
  pais_codigo,
  estado
)
overriding system value
values (
  1,
  'TUKUY',
  'Tukuy Academy',
  'Tukuy Academy',
  'PE',
  'ACTIVA'
)
on conflict (id) do update set
  codigo = excluded.codigo,
  razon_social = excluded.razon_social,
  nombre_comercial = excluded.nombre_comercial,
  estado = excluded.estado,
  actualizada_en = now();

insert into public.tenant_principal (
  id,
  empresa_principal_id,
  codigo,
  nombre,
  aislamiento,
  zona_horaria,
  estado
)
values (
  '10000000-0000-4000-8000-000000000001',
  1,
  'TUKUY-ACADEMY',
  'Tukuy Academy',
  'BASE_POR_ORGANIZACION',
  'America/Lima',
  'ACTIVO'
)
on conflict (id) do update set
  nombre = excluded.nombre,
  aislamiento = excluded.aislamiento,
  estado = excluded.estado,
  actualizado_en = now();

insert into public.empresa_sistema (
  id,
  empresa_principal_id,
  tenant_principal_id,
  codigo_sistema,
  estado,
  habilitada_en
)
values (
  '20000000-0000-4000-8000-000000000001',
  1,
  '10000000-0000-4000-8000-000000000001',
  'TUKUY_ACADEMY',
  'ACTIVO',
  now()
)
on conflict (id) do update set
  estado = excluded.estado,
  habilitada_en = coalesce(public.empresa_sistema.habilitada_en, excluded.habilitada_en),
  actualizada_en = now();

insert into public.instalacion_organizacion (
  id,
  empresa_sistema_ref,
  empresa_principal_ref,
  tenant_ref,
  codigo_sistema,
  nombre_organizacion,
  zona_horaria
)
values (
  '30000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
  1,
  '10000000-0000-4000-8000-000000000001',
  'TUKUY_ACADEMY',
  'Tukuy Academy',
  'America/Lima'
)
on conflict (empresa_sistema_ref) do update set
  empresa_principal_ref = excluded.empresa_principal_ref,
  tenant_ref = excluded.tenant_ref,
  nombre_organizacion = excluded.nombre_organizacion,
  zona_horaria = excluded.zona_horaria,
  actualizada_en = now(),
  version_registro = public.instalacion_organizacion.version_registro + 1;

-- ---------------------------------------------------------------------------
-- 2. Catálogo inicial de permisos de administración Tukuy
-- ---------------------------------------------------------------------------

insert into public.permiso_principal (id, codigo, nombre, modulo_codigo)
values
  ('51000000-0000-4000-8000-000000000001', 'organizaciones.ver', 'Ver organizaciones', 'ORGANIZACIONES'),
  ('51000000-0000-4000-8000-000000000002', 'organizaciones.administrar', 'Administrar organizaciones', 'ORGANIZACIONES'),
  ('51000000-0000-4000-8000-000000000003', 'usuarios.ver', 'Ver usuarios', 'USUARIOS'),
  ('51000000-0000-4000-8000-000000000004', 'cursos.revisar', 'Revisar cursos', 'CURSOS'),
  ('51000000-0000-4000-8000-000000000005', 'planes.administrar', 'Administrar planes', 'PLANES'),
  ('51000000-0000-4000-8000-000000000006', 'licencias.administrar', 'Administrar licencias', 'LICENCIAS'),
  ('51000000-0000-4000-8000-000000000007', 'facturacion.ver', 'Ver facturación', 'FACTURACION'),
  ('51000000-0000-4000-8000-000000000008', 'auditoria.ver', 'Ver auditoría', 'AUDITORIA'),
  ('51000000-0000-4000-8000-000000000009', 'vacantes.gestionar', 'Gestionar vacantes', 'BOLSA'),
  ('51000000-0000-4000-8000-000000000010', 'vacantes.moderar', 'Moderar vacantes', 'BOLSA'),
  ('51000000-0000-4000-8000-000000000011', 'comunidad.ver', 'Ver comunidad', 'COMUNIDAD'),
  ('51000000-0000-4000-8000-000000000012', 'comunidad.moderar', 'Moderar comunidad', 'COMUNIDAD')
on conflict (codigo) do update set
  nombre = excluded.nombre,
  modulo_codigo = excluded.modulo_codigo,
  estado = 'ACTIVO',
  actualizado_en = now();

insert into public.perfil_principal (
  id,
  codigo,
  nombre,
  descripcion,
  portal,
  nivel,
  es_sistema,
  estado
)
values (
  '40000000-0000-4000-8000-000000000001',
  'SUPER_ADMIN',
  'Superadministración Tukuy',
  'Control global de la plataforma, organizaciones y módulos transversales.',
  'admin',
  'PLATAFORMA',
  true,
  'ACTIVO'
)
on conflict (codigo) do update set
  nombre = excluded.nombre,
  descripcion = excluded.descripcion,
  portal = excluded.portal,
  nivel = excluded.nivel,
  estado = excluded.estado,
  actualizado_en = now();

insert into public.perfil_permiso_principal (
  perfil_principal_id,
  permiso_principal_id
)
select
  perfil.id,
  permiso.id
from public.perfil_principal perfil
cross join public.permiso_principal permiso
where perfil.codigo = 'SUPER_ADMIN'
  and permiso.codigo in (
    'organizaciones.ver',
    'organizaciones.administrar',
    'usuarios.ver',
    'cursos.revisar',
    'planes.administrar',
    'licencias.administrar',
    'facturacion.ver',
    'auditoria.ver',
    'vacantes.gestionar',
    'vacantes.moderar',
    'comunidad.ver',
    'comunidad.moderar'
  )
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- 3. Bootstrap seguro: el usuario Auth más antiguo recibe SUPER_ADMIN
--    únicamente cuando todavía no existe una función de plataforma activa.
-- ---------------------------------------------------------------------------

do $$
declare
  identidad_id uuid;
  membresia_id uuid;
  perfil_id uuid;
begin
  if exists (
    select 1
    from public.funcion_principal funcion
    join public.perfil_principal perfil
      on perfil.id = funcion.perfil_principal_id
    where perfil.codigo = 'SUPER_ADMIN'
      and funcion.estado = 'ACTIVA'
  ) then
    return;
  end if;

  select identidad.id
    into identidad_id
  from public.identidad_principal identidad
  join auth.users usuario
    on usuario.id = identidad.auth_usuario_ref
  where identidad.estado = 'ACTIVO'
  order by usuario.created_at asc
  limit 1;

  if identidad_id is null then
    raise exception 'No existe una identidad Auth activa para asignar SUPER_ADMIN';
  end if;

  select perfil.id
    into perfil_id
  from public.perfil_principal perfil
  where perfil.codigo = 'SUPER_ADMIN';

  insert into public.membresia_principal (
    identidad_principal_id,
    codigo,
    cargo,
    alcance_tipo,
    estado
  )
  values (
    identidad_id,
    'PLATAFORMA-TUKUY',
    'Superadministración Tukuy',
    'PLATAFORMA',
    'ACTIVA'
  )
  returning id into membresia_id;

  insert into public.funcion_principal (
    membresia_principal_id,
    perfil_principal_id,
    codigo,
    alcance,
    es_principal,
    estado
  )
  values (
    membresia_id,
    perfil_id,
    'SUPER_ADMIN',
    '{"tipo":"PLATAFORMA"}'::jsonb,
    true,
    'ACTIVA'
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Resolución segura de permisos y contextos del usuario autenticado
-- ---------------------------------------------------------------------------

create or replace function public.permisos_efectivos_funcion(
  p_funcion_id uuid
)
returns text[]
language sql
stable
security definer
set search_path = ''
as $$
  with funcion_objetivo as (
    select funcion.id, funcion.perfil_principal_id
    from public.funcion_principal funcion
    where funcion.id = p_funcion_id
  ),
  base as (
    select permiso.id, permiso.codigo
    from funcion_objetivo funcion
    join public.perfil_permiso_principal perfil_permiso
      on perfil_permiso.perfil_principal_id = funcion.perfil_principal_id
    join public.permiso_principal permiso
      on permiso.id = perfil_permiso.permiso_principal_id
    where permiso.estado = 'ACTIVO'
  ),
  concedidos as (
    select permiso.id, permiso.codigo
    from public.funcion_permiso_principal excepcion
    join public.permiso_principal permiso
      on permiso.id = excepcion.permiso_principal_id
    where excepcion.funcion_principal_id = p_funcion_id
      and excepcion.efecto = 'CONCEDER'
      and permiso.estado = 'ACTIVO'
  ),
  denegados as (
    select excepcion.permiso_principal_id as id
    from public.funcion_permiso_principal excepcion
    where excepcion.funcion_principal_id = p_funcion_id
      and excepcion.efecto = 'DENEGAR'
  )
  select coalesce(array_agg(distinct efectivos.codigo order by efectivos.codigo), '{}')
  from (
    select base.id, base.codigo from base
    union
    select concedidos.id, concedidos.codigo from concedidos
  ) efectivos
  where not exists (
    select 1 from denegados where denegados.id = efectivos.id
  );
$$;

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
  where identidad.auth_usuario_ref = (select auth.uid())
    and identidad.estado = 'ACTIVO'
    and membresia.estado = 'ACTIVA'
    and funcion.estado = 'ACTIVA'
    and perfil.estado = 'ACTIVO'
    and (membresia.vigente_hasta is null or membresia.vigente_hasta > now())
    and (funcion.vigente_hasta is null or funcion.vigente_hasta > now())
  order by funcion.es_principal desc, perfil.portal, funcion.codigo;
$$;

revoke all on function public.permisos_efectivos_funcion(uuid) from public;
revoke all on function public.obtener_mis_contextos() from public;
grant execute on function public.obtener_mis_contextos() to authenticated;

