-- Perfiles institucionales por organización (portal Equipos).
-- Ejecutar en el SQL Editor del proyecto PRINCIPAL.
-- No reemplaza perfil_principal (códigos globales de acceso);
-- persiste el modelo PerfilEntidad / AsignacionPerfilUsuario del FE.

begin;

create table if not exists public.org_perfil (
  instalacion_organizacion_id uuid not null
    references public.instalacion_organizacion (id) on delete cascade,
  id text not null,
  nombre text not null,
  descripcion text not null default '',
  tipo text not null default 'PERSONALIZADO'
    check (tipo in ('DIRECCION', 'ADMINISTRADOR', 'PERSONALIZADO')),
  plantilla text not null default 'PERSONALIZADO'
    check (plantilla in (
      'DIRECCION', 'ADMINISTRACION', 'FIRMAS', 'GESTION',
      'SUPERVISION', 'DOCENCIA', 'APRENDIZAJE', 'PERSONALIZADO'
    )),
  nivel_autoridad integer not null default 100,
  permisos jsonb not null default '[]'::jsonb,
  alcance_defecto text not null default 'PROPIO'
    check (alcance_defecto in (
      'PROPIO', 'CURSOS_PROPIOS', 'UNIDAD', 'SEDE', 'ENTIDAD'
    )),
  ruta_inicial text not null default '/organizacion/inicio',
  es_sistema boolean not null default false,
  estado text not null default 'ACTIVO'
    check (estado in ('ACTIVO', 'INACTIVO')),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  primary key (instalacion_organizacion_id, id)
);

create table if not exists public.org_asignacion_perfil (
  instalacion_organizacion_id uuid not null
    references public.instalacion_organizacion (id) on delete cascade,
  id text not null,
  identidad_ref text not null,
  perfil_id text not null,
  unidad_ids jsonb not null default '[]'::jsonb,
  sede_ids jsonb not null default '[]'::jsonb,
  incluir_descendientes boolean not null default false,
  es_principal boolean not null default true,
  estado text not null default 'ACTIVA'
    check (estado in ('ACTIVA', 'INACTIVA')),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  primary key (instalacion_organizacion_id, id),
  foreign key (instalacion_organizacion_id, perfil_id)
    references public.org_perfil (instalacion_organizacion_id, id)
    on delete cascade
);

create index if not exists org_asignacion_perfil_identidad_idx
  on public.org_asignacion_perfil (instalacion_organizacion_id, identidad_ref);

create or replace function public.org_asegurar_perfiles_base(
  p_instalacion_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_instalacion_id is null then
    raise exception 'Instalación requerida';
  end if;

  if exists (
    select 1 from public.org_perfil p
    where p.instalacion_organizacion_id = p_instalacion_id
  ) then
    return;
  end if;

  insert into public.org_perfil (
    instalacion_organizacion_id, id, nombre, descripcion, tipo, plantilla,
    nivel_autoridad, permisos, alcance_defecto, ruta_inicial, es_sistema, estado
  ) values
    (
      p_instalacion_id, 'perfil-direccion', 'Dirección',
      'Máxima autoridad y gobierno de la entidad.',
      'DIRECCION', 'DIRECCION', 1000,
      '["usuarios.ver","usuarios.invitar","usuarios.editar","equipos.administrar","perfiles.administrar","cursos.ver","cursos.aprobar","reportes.ver","configuracion.editar","licencias.ver","facturacion.ver"]'::jsonb,
      'ENTIDAD', '/organizacion/inicio', true, 'ACTIVO'
    ),
    (
      p_instalacion_id, 'perfil-administracion', 'Administración',
      'Gestiona la operación, estructura, accesos y capacitación.',
      'ADMINISTRADOR', 'ADMINISTRACION', 900,
      '["usuarios.ver","usuarios.invitar","equipos.administrar","cursos.ver","cursos.aprobar","alumnos.ver","asignaciones.ver","asignaciones.crear","certificados.emitir","reportes.ver","sesiones.gestionar","configuracion.editar"]'::jsonb,
      'ENTIDAD', '/organizacion/inicio', true, 'ACTIVO'
    ),
    (
      p_instalacion_id, 'perfil-firmante-certificados', 'Firmante de certificados',
      'Revisa y firma certificados institucionales dentro del equipo autorizado.',
      'PERSONALIZADO', 'FIRMAS', 750,
      '["certificados.ver","certificados.firmar"]'::jsonb,
      'ENTIDAD', '/organizacion/certificados', true, 'ACTIVO'
    );
end;
$$;

create or replace function public.org_listar_perfiles(
  p_instalacion_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_perfiles jsonb;
  v_asignaciones jsonb;
begin
  if p_instalacion_id is null
    or not public.org_es_miembro_instalacion(p_instalacion_id)
  then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  perform public.org_asegurar_perfiles_base(p_instalacion_id);

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', p.id,
    'nombre', p.nombre,
    'descripcion', p.descripcion,
    'tipo', p.tipo,
    'plantilla', p.plantilla,
    'nivelAutoridad', p.nivel_autoridad,
    'permisos', p.permisos,
    'alcanceDefecto', p.alcance_defecto,
    'rutaInicial', p.ruta_inicial,
    'esSistema', p.es_sistema,
    'estado', p.estado
  ) order by p.es_sistema desc, p.nivel_autoridad desc, p.nombre), '[]'::jsonb)
  into v_perfiles
  from public.org_perfil p
  where p.instalacion_organizacion_id = p_instalacion_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', a.id,
    'usuarioId', a.identidad_ref,
    'perfilId', a.perfil_id,
    'unidadIds', a.unidad_ids,
    'sedeIds', a.sede_ids,
    'incluirDescendientes', a.incluir_descendientes,
    'esPrincipal', a.es_principal,
    'estado', a.estado
  ) order by a.creado_en desc), '[]'::jsonb)
  into v_asignaciones
  from public.org_asignacion_perfil a
  where a.instalacion_organizacion_id = p_instalacion_id;

  return jsonb_build_object(
    'ok', true,
    'perfiles', v_perfiles,
    'asignaciones', v_asignaciones
  );
end;
$$;

create or replace function public.org_guardar_perfil(
  p_instalacion_id uuid,
  p_perfil jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id text := coalesce(nullif(trim(p_perfil->>'id'), ''), 'perfil-' || replace(gen_random_uuid()::text, '-', ''));
  v_existente public.org_perfil%rowtype;
begin
  if p_instalacion_id is null
    or not public.org_tiene_permiso(p_instalacion_id, 'equipos.administrar')
  then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  select * into v_existente
  from public.org_perfil p
  where p.instalacion_organizacion_id = p_instalacion_id
    and p.id = v_id;

  insert into public.org_perfil as p (
    instalacion_organizacion_id, id, nombre, descripcion, tipo, plantilla,
    nivel_autoridad, permisos, alcance_defecto, ruta_inicial, es_sistema,
    estado, actualizado_en
  ) values (
    p_instalacion_id,
    v_id,
    coalesce(nullif(trim(p_perfil->>'nombre'), ''), 'Perfil'),
    coalesce(p_perfil->>'descripcion', ''),
    coalesce(nullif(trim(p_perfil->>'tipo'), ''), 'PERSONALIZADO'),
    coalesce(nullif(trim(p_perfil->>'plantilla'), ''), 'PERSONALIZADO'),
    coalesce((p_perfil->>'nivelAutoridad')::int, v_existente.nivel_autoridad, 100),
    coalesce(p_perfil->'permisos', v_existente.permisos, '[]'::jsonb),
    coalesce(nullif(trim(p_perfil->>'alcanceDefecto'), ''), 'PROPIO'),
    coalesce(nullif(trim(p_perfil->>'rutaInicial'), ''), '/organizacion/inicio'),
    coalesce(v_existente.es_sistema, coalesce((p_perfil->>'esSistema')::boolean, false)),
    coalesce(nullif(trim(p_perfil->>'estado'), ''), 'ACTIVO'),
    now()
  )
  on conflict (instalacion_organizacion_id, id) do update set
    nombre = case when p.es_sistema then p.nombre else excluded.nombre end,
    descripcion = excluded.descripcion,
    tipo = case when p.es_sistema then p.tipo else excluded.tipo end,
    plantilla = case when p.es_sistema then p.plantilla else excluded.plantilla end,
    nivel_autoridad = case when p.es_sistema then p.nivel_autoridad else excluded.nivel_autoridad end,
    permisos = excluded.permisos,
    alcance_defecto = excluded.alcance_defecto,
    ruta_inicial = excluded.ruta_inicial,
    estado = case when p.es_sistema then p.estado else excluded.estado end,
    actualizado_en = now();

  return (
    select jsonb_build_object(
      'id', p.id,
      'nombre', p.nombre,
      'descripcion', p.descripcion,
      'tipo', p.tipo,
      'plantilla', p.plantilla,
      'nivelAutoridad', p.nivel_autoridad,
      'permisos', p.permisos,
      'alcanceDefecto', p.alcance_defecto,
      'rutaInicial', p.ruta_inicial,
      'esSistema', p.es_sistema,
      'estado', p.estado
    )
    from public.org_perfil p
    where p.instalacion_organizacion_id = p_instalacion_id
      and p.id = v_id
  );
end;
$$;

create or replace function public.org_guardar_asignacion_perfil(
  p_instalacion_id uuid,
  p_asignacion jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id text := coalesce(nullif(trim(p_asignacion->>'id'), ''), 'asig-' || replace(gen_random_uuid()::text, '-', ''));
  v_usuario text := nullif(trim(p_asignacion->>'usuarioId'), '');
  v_perfil text := nullif(trim(p_asignacion->>'perfilId'), '');
begin
  if p_instalacion_id is null
    or not public.org_tiene_permiso(p_instalacion_id, 'equipos.administrar')
  then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  if v_usuario is null or v_perfil is null then
    raise exception 'usuarioId y perfilId son requeridos';
  end if;

  insert into public.org_asignacion_perfil as a (
    instalacion_organizacion_id, id, identidad_ref, perfil_id,
    unidad_ids, sede_ids, incluir_descendientes, es_principal, estado, actualizado_en
  ) values (
    p_instalacion_id,
    v_id,
    v_usuario,
    v_perfil,
    coalesce(p_asignacion->'unidadIds', '[]'::jsonb),
    coalesce(p_asignacion->'sedeIds', '[]'::jsonb),
    coalesce((p_asignacion->>'incluirDescendientes')::boolean, false),
    coalesce((p_asignacion->>'esPrincipal')::boolean, true),
    coalesce(nullif(trim(p_asignacion->>'estado'), ''), 'ACTIVA'),
    now()
  )
  on conflict (instalacion_organizacion_id, id) do update set
    identidad_ref = excluded.identidad_ref,
    perfil_id = excluded.perfil_id,
    unidad_ids = excluded.unidad_ids,
    sede_ids = excluded.sede_ids,
    incluir_descendientes = excluded.incluir_descendientes,
    es_principal = excluded.es_principal,
    estado = excluded.estado,
    actualizado_en = now();

  return (
    select jsonb_build_object(
      'id', a.id,
      'usuarioId', a.identidad_ref,
      'perfilId', a.perfil_id,
      'unidadIds', a.unidad_ids,
      'sedeIds', a.sede_ids,
      'incluirDescendientes', a.incluir_descendientes,
      'esPrincipal', a.es_principal,
      'estado', a.estado
    )
    from public.org_asignacion_perfil a
    where a.instalacion_organizacion_id = p_instalacion_id
      and a.id = v_id
  );
end;
$$;

create or replace function public.org_eliminar_asignacion_perfil(
  p_instalacion_id uuid,
  p_asignacion_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_instalacion_id is null
    or not public.org_tiene_permiso(p_instalacion_id, 'equipos.administrar')
  then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  delete from public.org_asignacion_perfil a
  where a.instalacion_organizacion_id = p_instalacion_id
    and a.id = p_asignacion_id;

  return jsonb_build_object('ok', true, 'asignacionId', p_asignacion_id);
end;
$$;

revoke all on function public.org_asegurar_perfiles_base(uuid) from public;
revoke all on function public.org_listar_perfiles(uuid) from public;
revoke all on function public.org_guardar_perfil(uuid, jsonb) from public;
revoke all on function public.org_guardar_asignacion_perfil(uuid, jsonb) from public;
revoke all on function public.org_eliminar_asignacion_perfil(uuid, text) from public;

grant execute on function public.org_listar_perfiles(uuid) to authenticated;
grant execute on function public.org_guardar_perfil(uuid, jsonb) to authenticated;
grant execute on function public.org_guardar_asignacion_perfil(uuid, jsonb) to authenticated;
grant execute on function public.org_eliminar_asignacion_perfil(uuid, text) to authenticated;

commit;
