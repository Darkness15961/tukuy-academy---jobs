-- Módulo 0 · raíz de identidad, tenancy y autorización de Tukuy.
--
-- Convención de relaciones:
--   *_id  = FK física dentro del agregado definido en esta migración.
--   *_ref = referencia lógica hacia otro agregado, instalación o base.
--
-- La migración es aditiva: no modifica ni agrega FKs a las 22 tablas existentes.
-- Sus columnas empresa_sistema_ref, empresa_principal_ref, tenant_ref,
-- identidad_ref, membresia_principal_ref y funcion_principal_ref se resuelven
-- contra las claves estables creadas aquí mediante servicios/eventos.

-- ---------------------------------------------------------------------------
-- 1. Identidad global (proyección de negocio de Supabase Auth)
-- ---------------------------------------------------------------------------

create table if not exists public.identidad_principal (
  id uuid primary key default gen_random_uuid(),
  auth_usuario_ref uuid not null unique,
  correo text,
  nombres text not null default '',
  apellidos text not null default '',
  nombre_mostrar text,
  avatar_url text,
  proveedor text not null default 'email',
  ultimo_acceso_en timestamptz,
  estado text not null default 'ACTIVO'
    check (estado in ('PENDIENTE', 'ACTIVO', 'SUSPENDIDO', 'BLOQUEADO')),
  creada_en timestamptz not null default now(),
  actualizada_en timestamptz not null default now(),
  version_registro integer not null default 1 check (version_registro > 0)
);

comment on column public.identidad_principal.auth_usuario_ref is
  'Referencia lógica a auth.users.id. La identidad de negocio conserva ciclo de vida propio.';

create unique index if not exists identidad_principal_correo_uq
  on public.identidad_principal (lower(correo))
  where correo is not null;

-- ---------------------------------------------------------------------------
-- 2. Raíz empresarial y tenant
-- ---------------------------------------------------------------------------

create table if not exists public.empresa_principal (
  id bigint generated always as identity primary key,
  codigo text not null unique,
  razon_social text not null,
  nombre_comercial text,
  tipo_documento_fiscal text,
  numero_documento_fiscal text,
  pais_codigo character(2) not null default 'PE',
  estado text not null default 'ACTIVA'
    check (estado in ('PENDIENTE', 'ACTIVA', 'SUSPENDIDA', 'BAJA')),
  creada_en timestamptz not null default now(),
  actualizada_en timestamptz,
  version_registro integer not null default 1 check (version_registro > 0)
);

create unique index if not exists empresa_principal_documento_uq
  on public.empresa_principal (tipo_documento_fiscal, numero_documento_fiscal)
  where numero_documento_fiscal is not null;

create table if not exists public.tenant_principal (
  id uuid primary key default gen_random_uuid(),
  empresa_principal_id bigint not null
    references public.empresa_principal(id),
  codigo text not null unique,
  nombre text not null,
  aislamiento text not null default 'BASE_POR_ORGANIZACION'
    check (aislamiento in ('BASE_POR_ORGANIZACION', 'ESQUEMA_COMPARTIDO')),
  zona_horaria text not null default 'America/Lima',
  estado text not null default 'ACTIVO'
    check (estado in ('PENDIENTE', 'ACTIVO', 'SUSPENDIDO', 'BAJA')),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz,
  version_registro integer not null default 1 check (version_registro > 0),
  constraint tenant_principal_empresa_codigo_uq
    unique (empresa_principal_id, codigo)
);

create table if not exists public.empresa_sistema (
  id uuid primary key default gen_random_uuid(),
  empresa_principal_id bigint not null
    references public.empresa_principal(id),
  tenant_principal_id uuid not null
    references public.tenant_principal(id),
  codigo_sistema text not null default 'TUKUY_ACADEMY',
  estado text not null default 'ACTIVO'
    check (estado in ('PENDIENTE', 'ACTIVO', 'SUSPENDIDO', 'BAJA')),
  habilitada_en timestamptz,
  creada_en timestamptz not null default now(),
  actualizada_en timestamptz,
  version_registro integer not null default 1 check (version_registro > 0),
  constraint empresa_sistema_tenant_codigo_uq
    unique (tenant_principal_id, codigo_sistema)
);

comment on table public.empresa_sistema is
  'Nodo lógico enlazado por instalacion_organizacion.empresa_sistema_ref.';

-- ---------------------------------------------------------------------------
-- 3. Catálogo global de permisos y perfiles
-- ---------------------------------------------------------------------------

create table if not exists public.permiso_principal (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nombre text not null,
  descripcion text,
  modulo_codigo text not null,
  es_sistema boolean not null default true,
  estado text not null default 'ACTIVO'
    check (estado in ('ACTIVO', 'INACTIVO')),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz,
  version_registro integer not null default 1 check (version_registro > 0)
);

create table if not exists public.perfil_principal (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nombre text not null,
  descripcion text,
  portal text not null
    check (portal in ('estudiante', 'docente', 'organizacion', 'admin')),
  nivel text not null
    check (nivel in ('PLATAFORMA', 'ORGANIZACION', 'PERSONAL')),
  es_sistema boolean not null default false,
  estado text not null default 'ACTIVO'
    check (estado in ('ACTIVO', 'INACTIVO')),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz,
  version_registro integer not null default 1 check (version_registro > 0)
);

create table if not exists public.perfil_permiso_principal (
  perfil_principal_id uuid not null
    references public.perfil_principal(id) on delete cascade,
  permiso_principal_id uuid not null
    references public.permiso_principal(id) on delete cascade,
  concedido_en timestamptz not null default now(),
  primary key (perfil_principal_id, permiso_principal_id)
);

-- ---------------------------------------------------------------------------
-- 4. Membresías y funciones
-- ---------------------------------------------------------------------------

create table if not exists public.membresia_principal (
  id uuid primary key default gen_random_uuid(),
  identidad_principal_id uuid not null
    references public.identidad_principal(id),

  -- Referencias lógicas al agregado empresarial / instalación.
  empresa_principal_ref bigint,
  empresa_sistema_ref uuid,
  tenant_ref uuid,
  instalacion_organizacion_ref uuid,

  codigo text,
  cargo text,
  alcance_tipo text not null default 'ORGANIZACION'
    check (alcance_tipo in ('PLATAFORMA', 'ORGANIZACION', 'PERSONAL')),
  estado text not null default 'ACTIVA'
    check (estado in ('PENDIENTE', 'ACTIVA', 'SUSPENDIDA', 'REVOCADA')),
  vigente_desde timestamptz not null default now(),
  vigente_hasta timestamptz,
  creada_en timestamptz not null default now(),
  actualizada_en timestamptz not null default now(),
  version_autorizacion bigint not null default 1
    check (version_autorizacion > 0),
  version_registro integer not null default 1 check (version_registro > 0),
  constraint membresia_principal_vigencia_ck
    check (vigente_hasta is null or vigente_hasta > vigente_desde),
  constraint membresia_principal_alcance_refs_ck check (
    (alcance_tipo = 'PLATAFORMA'
      and empresa_principal_ref is null
      and empresa_sistema_ref is null
      and tenant_ref is null
      and instalacion_organizacion_ref is null)
    or
    (alcance_tipo = 'PERSONAL'
      and empresa_principal_ref is null
      and empresa_sistema_ref is null
      and tenant_ref is not null)
    or
    (alcance_tipo = 'ORGANIZACION'
      and empresa_principal_ref is not null
      and empresa_sistema_ref is not null
      and tenant_ref is not null
      and instalacion_organizacion_ref is not null)
  )
);

comment on column public.membresia_principal.instalacion_organizacion_ref is
  'Referencia lógica a instalacion_organizacion.id; se valida en el middleware de tenancy.';

create index if not exists membresia_principal_identidad_estado_idx
  on public.membresia_principal (identidad_principal_id, estado);

create index if not exists membresia_principal_tenant_idx
  on public.membresia_principal (tenant_ref, estado)
  where tenant_ref is not null;

create unique index if not exists membresia_principal_activa_contexto_uq
  on public.membresia_principal (
    identidad_principal_id,
    alcance_tipo,
    coalesce(tenant_ref, '00000000-0000-0000-0000-000000000000'::uuid)
  )
  where estado in ('PENDIENTE', 'ACTIVA');

create table if not exists public.funcion_principal (
  id uuid primary key default gen_random_uuid(),
  membresia_principal_id uuid not null
    references public.membresia_principal(id) on delete cascade,
  perfil_principal_id uuid not null
    references public.perfil_principal(id),
  codigo text not null,
  alcance jsonb not null default '{"tipo":"PROPIO"}'::jsonb,
  ambito_docencia text
    check (ambito_docencia is null or ambito_docencia in ('INDEPENDIENTE', 'ORGANIZACION')),
  es_principal boolean not null default false,
  estado text not null default 'ACTIVA'
    check (estado in ('ACTIVA', 'SUSPENDIDA', 'REVOCADA')),
  vigente_desde timestamptz not null default now(),
  vigente_hasta timestamptz,
  creada_en timestamptz not null default now(),
  actualizada_en timestamptz not null default now(),
  version_registro integer not null default 1 check (version_registro > 0),
  constraint funcion_principal_vigencia_ck
    check (vigente_hasta is null or vigente_hasta > vigente_desde),
  constraint funcion_principal_codigo_uq
    unique (membresia_principal_id, codigo)
);

create index if not exists funcion_principal_membresia_estado_idx
  on public.funcion_principal (membresia_principal_id, estado);

-- Excepciones por función. Un override puede conceder o denegar un permiso del
-- perfil sin duplicar ni mutar la plantilla global.
create table if not exists public.funcion_permiso_principal (
  funcion_principal_id uuid not null
    references public.funcion_principal(id) on delete cascade,
  permiso_principal_id uuid not null
    references public.permiso_principal(id) on delete cascade,
  efecto text not null check (efecto in ('CONCEDER', 'DENEGAR')),
  creado_en timestamptz not null default now(),
  primary key (funcion_principal_id, permiso_principal_id)
);

-- ---------------------------------------------------------------------------
-- 5. Sincronización Auth → identidad principal
-- ---------------------------------------------------------------------------

create or replace function public.registrar_identidad_desde_auth()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  nombre_completo text;
begin
  nombre_completo := coalesce(
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'name',
    split_part(coalesce(new.email, ''), '@', 1)
  );

  insert into public.identidad_principal (
    id,
    auth_usuario_ref,
    correo,
    nombres,
    apellidos,
    nombre_mostrar,
    avatar_url,
    proveedor,
    ultimo_acceso_en
  ) values (
    new.id,
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'nombres', new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.raw_user_meta_data ->> 'apellidos', new.raw_user_meta_data ->> 'last_name', ''),
    nombre_completo,
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture'),
    coalesce(new.raw_app_meta_data ->> 'provider', 'email'),
    new.last_sign_in_at
  )
  on conflict (auth_usuario_ref) do update set
    correo = excluded.correo,
    nombre_mostrar = coalesce(nullif(public.identidad_principal.nombre_mostrar, ''), excluded.nombre_mostrar),
    nombres = coalesce(nullif(public.identidad_principal.nombres, ''), excluded.nombres),
    apellidos = coalesce(nullif(public.identidad_principal.apellidos, ''), excluded.apellidos),
    avatar_url = coalesce(excluded.avatar_url, public.identidad_principal.avatar_url),
    proveedor = excluded.proveedor,
    ultimo_acceso_en = excluded.ultimo_acceso_en,
    actualizada_en = now(),
    version_registro = public.identidad_principal.version_registro + 1;

  return new;
end;
$$;

drop trigger if exists identidad_principal_despues_auth on auth.users;
create trigger identidad_principal_despues_auth
  after insert or update of email, raw_user_meta_data, raw_app_meta_data, last_sign_in_at
  on auth.users
  for each row execute function public.registrar_identidad_desde_auth();

-- Incorpora usuarios creados antes de instalar el módulo.
insert into public.identidad_principal (
  id,
  auth_usuario_ref,
  correo,
  nombres,
  apellidos,
  nombre_mostrar,
  avatar_url,
  proveedor,
  ultimo_acceso_en,
  creada_en
)
select
  usuario.id,
  usuario.id,
  usuario.email,
  coalesce(usuario.raw_user_meta_data ->> 'nombres', usuario.raw_user_meta_data ->> 'first_name', ''),
  coalesce(usuario.raw_user_meta_data ->> 'apellidos', usuario.raw_user_meta_data ->> 'last_name', ''),
  coalesce(
    usuario.raw_user_meta_data ->> 'full_name',
    usuario.raw_user_meta_data ->> 'name',
    split_part(coalesce(usuario.email, ''), '@', 1)
  ),
  coalesce(usuario.raw_user_meta_data ->> 'avatar_url', usuario.raw_user_meta_data ->> 'picture'),
  coalesce(usuario.raw_app_meta_data ->> 'provider', 'email'),
  usuario.last_sign_in_at,
  usuario.created_at
from auth.users usuario
on conflict (auth_usuario_ref) do nothing;

-- ---------------------------------------------------------------------------
-- 6. RLS: lectura propia y catálogos visibles; mutaciones solo por backend
-- ---------------------------------------------------------------------------

alter table public.identidad_principal enable row level security;
alter table public.empresa_principal enable row level security;
alter table public.tenant_principal enable row level security;
alter table public.empresa_sistema enable row level security;
alter table public.permiso_principal enable row level security;
alter table public.perfil_principal enable row level security;
alter table public.perfil_permiso_principal enable row level security;
alter table public.membresia_principal enable row level security;
alter table public.funcion_principal enable row level security;
alter table public.funcion_permiso_principal enable row level security;

drop policy if exists identidad_principal_consultar_propia
  on public.identidad_principal;
create policy identidad_principal_consultar_propia
  on public.identidad_principal
  for select
  to authenticated
  using (auth_usuario_ref = (select auth.uid()));

drop policy if exists membresia_principal_consultar_propias
  on public.membresia_principal;
create policy membresia_principal_consultar_propias
  on public.membresia_principal
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.identidad_principal identidad
      where identidad.id = membresia_principal.identidad_principal_id
        and identidad.auth_usuario_ref = (select auth.uid())
    )
  );

drop policy if exists funcion_principal_consultar_propias
  on public.funcion_principal;
create policy funcion_principal_consultar_propias
  on public.funcion_principal
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.membresia_principal membresia
      join public.identidad_principal identidad
        on identidad.id = membresia.identidad_principal_id
      where membresia.id = funcion_principal.membresia_principal_id
        and identidad.auth_usuario_ref = (select auth.uid())
    )
  );

drop policy if exists perfil_principal_consultar_autenticados
  on public.perfil_principal;
create policy perfil_principal_consultar_autenticados
  on public.perfil_principal
  for select
  to authenticated
  using (estado = 'ACTIVO');

drop policy if exists permiso_principal_consultar_autenticados
  on public.permiso_principal;
create policy permiso_principal_consultar_autenticados
  on public.permiso_principal
  for select
  to authenticated
  using (estado = 'ACTIVO');

drop policy if exists perfil_permiso_consultar_autenticados
  on public.perfil_permiso_principal;
create policy perfil_permiso_consultar_autenticados
  on public.perfil_permiso_principal
  for select
  to authenticated
  using (true);

drop policy if exists funcion_permiso_consultar_propias
  on public.funcion_permiso_principal;
create policy funcion_permiso_consultar_propias
  on public.funcion_permiso_principal
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.funcion_principal funcion
      join public.membresia_principal membresia
        on membresia.id = funcion.membresia_principal_id
      join public.identidad_principal identidad
        on identidad.id = membresia.identidad_principal_id
      where funcion.id = funcion_permiso_principal.funcion_principal_id
        and identidad.auth_usuario_ref = (select auth.uid())
    )
  );

-- No se crean policies INSERT/UPDATE/DELETE para anon/authenticated.
-- Las mutaciones de empresas, tenants, membresías, funciones y permisos deben
-- pasar por Edge Functions/servicios administrativos con auditoría e idempotencia.

