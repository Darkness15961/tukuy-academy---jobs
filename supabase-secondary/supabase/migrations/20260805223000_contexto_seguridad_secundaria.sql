-- Ejecutar una sola vez en el SQL Editor del proyecto SECUNDARIO Tukuy Academy.
begin;

create table if not exists public.contexto_instalacion (
  id boolean primary key default true check (id),
  instalacion_principal_ref uuid not null unique,
  tenant_principal_ref uuid not null unique,
  empresa_sistema_principal_ref uuid not null unique,
  empresa_principal_ref bigint not null,
  nombre_organizacion text not null,
  codigo_sistema text not null default 'TUKUY_ACADEMY',
  version_esquema integer not null default 1 check (version_esquema > 0),
  estado text not null default 'PENDIENTE' check (estado in ('PENDIENTE','HABILITADA','SUSPENDIDA')),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

insert into public.contexto_instalacion(
  id, instalacion_principal_ref, tenant_principal_ref,
  empresa_sistema_principal_ref, empresa_principal_ref,
  nombre_organizacion, version_esquema, estado
) values (
  true,
  '30000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
  1,
  'Tukuy Academy',
  1,
  'PENDIENTE'
)
on conflict (id) do update set
  instalacion_principal_ref = excluded.instalacion_principal_ref,
  tenant_principal_ref = excluded.tenant_principal_ref,
  empresa_sistema_principal_ref = excluded.empresa_sistema_principal_ref,
  empresa_principal_ref = excluded.empresa_principal_ref,
  nombre_organizacion = excluded.nombre_organizacion,
  version_esquema = excluded.version_esquema,
  actualizado_en = now();

insert into public.perfil_institucional(
  organizacion_principal_ref, nombre_legal, nombre_comercial,
  tipo_documento_fiscal, numero_documento_fiscal, zona_horaria,
  estado, creada_en, actualizada_en, version_registro
) values (
  '30000000-0000-4000-8000-000000000001',
  'Tukuy Academy', 'Tukuy Academy', null, null, 'America/Lima',
  'ACTIVO', now(), now(), 1
)
on conflict (organizacion_principal_ref) do update set
  nombre_legal = excluded.nombre_legal,
  nombre_comercial = excluded.nombre_comercial,
  zona_horaria = excluded.zona_horaria,
  actualizada_en = now(),
  version_registro = public.perfil_institucional.version_registro + 1;

create table if not exists public.acceso_identidad_principal (
  identidad_principal_ref uuid primary key,
  membresia_principal_ref uuid not null,
  correo text,
  nombre_mostrar text,
  perfiles jsonb not null default '[]'::jsonb,
  permisos jsonb not null default '[]'::jsonb,
  version_autorizacion bigint not null default 1 check (version_autorizacion > 0),
  estado text not null default 'ACTIVO' check (estado in ('ACTIVO','SUSPENDIDO','REVOCADO')),
  sincronizado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create index if not exists acceso_identidad_principal_estado_idx
  on public.acceso_identidad_principal(estado);

-- Esta secundaria es accedida por Edge Functions de la principal. Hasta que
-- exista traduccion de JWT, ninguna tabla de dominio queda disponible al browser.
do $$
declare tabla record;
begin
  for tabla in
    select schemaname, tablename
    from pg_tables
    where schemaname = 'public'
  loop
    execute format('alter table %I.%I enable row level security', tabla.schemaname, tabla.tablename);
    execute format('revoke all privileges on table %I.%I from anon, authenticated', tabla.schemaname, tabla.tablename);
  end loop;
end $$;

revoke usage, select on all sequences in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;

create or replace function public.servicio_sincronizar_acceso(
  p_identidad_principal_ref uuid,
  p_membresia_principal_ref uuid,
  p_correo text,
  p_nombre_mostrar text,
  p_perfiles jsonb,
  p_permisos jsonb,
  p_version_autorizacion bigint,
  p_estado text default 'ACTIVO'
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_estado not in ('ACTIVO','SUSPENDIDO','REVOCADO') then
    raise exception 'Estado de acceso invalido';
  end if;
  if p_version_autorizacion < 1 then
    raise exception 'Version de autorizacion invalida';
  end if;
  insert into public.acceso_identidad_principal(
    identidad_principal_ref, membresia_principal_ref, correo,
    nombre_mostrar, perfiles, permisos, version_autorizacion,
    estado, sincronizado_en, actualizado_en
  ) values (
    p_identidad_principal_ref, p_membresia_principal_ref,
    lower(nullif(trim(p_correo),'')), nullif(trim(p_nombre_mostrar),''),
    coalesce(p_perfiles,'[]'::jsonb), coalesce(p_permisos,'[]'::jsonb),
    p_version_autorizacion, p_estado, now(), now()
  )
  on conflict (identidad_principal_ref) do update set
    membresia_principal_ref = excluded.membresia_principal_ref,
    correo = excluded.correo,
    nombre_mostrar = excluded.nombre_mostrar,
    perfiles = excluded.perfiles,
    permisos = excluded.permisos,
    version_autorizacion = excluded.version_autorizacion,
    estado = excluded.estado,
    sincronizado_en = now(),
    actualizado_en = now()
  where public.acceso_identidad_principal.version_autorizacion <= excluded.version_autorizacion;
end;
$$;

create or replace function public.servicio_salud_secundaria()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'ok', true,
    'instalacionId', contexto.instalacion_principal_ref,
    'tenantId', contexto.tenant_principal_ref,
    'organizacion', contexto.nombre_organizacion,
    'versionEsquema', contexto.version_esquema,
    'estado', contexto.estado,
    'tablasPublicas', (select count(*) from pg_catalog.pg_tables where schemaname='public'),
    'accesosSincronizados', (select count(*) from public.acceso_identidad_principal where estado='ACTIVO'),
    'generadoEn', now()
  )
  from public.contexto_instalacion contexto
  where contexto.id = true;
$$;

revoke all on function public.servicio_sincronizar_acceso(uuid,uuid,text,text,jsonb,jsonb,bigint,text) from public, anon, authenticated;
revoke all on function public.servicio_salud_secundaria() from public, anon, authenticated;
grant execute on function public.servicio_sincronizar_acceso(uuid,uuid,text,text,jsonb,jsonb,bigint,text) to service_role;
grant execute on function public.servicio_salud_secundaria() to service_role;

alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

commit;
