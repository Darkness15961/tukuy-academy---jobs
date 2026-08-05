-- Módulo 1 · Administración centralizada de accesos y permisos.
-- Todas las relaciones con instalaciones conservan la convención *_ref.

-- ---------------------------------------------------------------------------
-- 1. Catálogo completo requerido por los portales actuales
-- ---------------------------------------------------------------------------

insert into public.permiso_principal (codigo, nombre, descripcion, modulo_codigo)
values
  ('usuarios.administrar', 'Administrar usuarios', 'Asignar, suspender y revocar accesos.', 'USUARIOS'),
  ('perfiles.ver', 'Ver perfiles y permisos', 'Consultar el catálogo de autorización.', 'SEGURIDAD'),
  ('perfiles.administrar', 'Administrar perfiles y permisos', 'Delegar perfiles y personalizar permisos.', 'SEGURIDAD'),
  ('configuracion.editar', 'Editar configuración', 'Modificar la configuración del espacio.', 'CONFIGURACION'),
  ('cursos.ver', 'Ver cursos', 'Consultar cursos disponibles en el espacio.', 'CURSOS'),
  ('cursos.crear', 'Crear cursos', 'Crear contenido académico.', 'CURSOS'),
  ('cursos.editar', 'Editar cursos', 'Editar contenido académico.', 'CURSOS'),
  ('cursos.aprobar', 'Aprobar cursos', 'Aprobar contenido institucional.', 'CURSOS'),
  ('categorias.ver', 'Ver categorías', 'Consultar categorías académicas.', 'CURSOS'),
  ('estudiantes.ver', 'Ver estudiantes', 'Consultar estudiantes de la organización.', 'PERSONAS'),
  ('equipos.administrar', 'Administrar estructura', 'Gestionar equipos, áreas y sedes.', 'PERSONAS'),
  ('asignaciones.crear', 'Crear asignaciones', 'Asignar formación a personas y equipos.', 'APRENDIZAJE'),
  ('sesiones.gestionar', 'Gestionar sesiones', 'Crear y administrar sesiones en vivo.', 'SESIONES'),
  ('licencias.ver', 'Ver licencia', 'Consultar licencia y consumo.', 'LICENCIAS'),
  ('rutas.administrar', 'Administrar rutas', 'Crear y modificar rutas de aprendizaje.', 'APRENDIZAJE'),
  ('reportes.ver', 'Ver reportes', 'Consultar reportes de la organización.', 'REPORTES'),
  ('certificados.ver', 'Ver certificados', 'Consultar certificados emitidos.', 'CERTIFICADOS'),
  ('aprendizaje.consumir', 'Consumir aprendizaje', 'Acceder a cursos y progreso personal.', 'APRENDIZAJE'),
  ('ingresos.ver', 'Ver ingresos', 'Consultar ingresos propios de docencia.', 'FACTURACION')
on conflict (codigo) do update set
  nombre = excluded.nombre,
  descripcion = excluded.descripcion,
  modulo_codigo = excluded.modulo_codigo,
  estado = 'ACTIVO',
  actualizado_en = now();

insert into public.perfil_principal (codigo, nombre, descripcion, portal, nivel, es_sistema)
values
  ('PLATFORM_ADMIN', 'Administrador de plataforma', 'Administra la operación de Tukuy sin controlar perfiles raíz.', 'admin', 'PLATAFORMA', true),
  ('PLATFORM_SUPPORT', 'Soporte de plataforma', 'Consulta organizaciones, usuarios y auditoría para soporte.', 'admin', 'PLATAFORMA', true),
  ('COURSE_REVIEWER', 'Revisor de cursos', 'Revisa y aprueba publicaciones académicas.', 'admin', 'PLATAFORMA', true),
  ('ORGANIZATION_OWNER', 'Dirección de organización', 'Máxima autoridad funcional de una organización.', 'organizacion', 'ORGANIZACION', true),
  ('ORGANIZATION_ADMIN', 'Administración de organización', 'Gestiona personas, estructura, cursos y formación.', 'organizacion', 'ORGANIZACION', true),
  ('TRAINING_MANAGER', 'Gestor de capacitación', 'Gestiona formación, asignaciones y reportes.', 'organizacion', 'ORGANIZACION', true),
  ('INSTRUCTOR', 'Docente', 'Crea y facilita contenido académico.', 'docente', 'ORGANIZACION', true),
  ('STUDENT', 'Estudiante', 'Consume formación y consulta sus certificados.', 'estudiante', 'ORGANIZACION', true)
on conflict (codigo) do update set
  nombre = excluded.nombre,
  descripcion = excluded.descripcion,
  portal = excluded.portal,
  nivel = excluded.nivel,
  es_sistema = excluded.es_sistema,
  estado = 'ACTIVO',
  actualizado_en = now();

-- SUPER_ADMIN conserva todos los permisos presentes y futuros al aplicar migraciones.
insert into public.perfil_permiso_principal (perfil_principal_id, permiso_principal_id)
select perfil.id, permiso.id
from public.perfil_principal perfil
cross join public.permiso_principal permiso
where perfil.codigo = 'SUPER_ADMIN' and permiso.estado = 'ACTIVO'
on conflict do nothing;

-- Plantillas explícitas: evitan otorgar privilegios por coincidencias de nombre.
with asignacion(perfil_codigo, permiso_codigo) as (
  values
    ('PLATFORM_ADMIN', 'organizaciones.ver'), ('PLATFORM_ADMIN', 'organizaciones.administrar'),
    ('PLATFORM_ADMIN', 'usuarios.ver'), ('PLATFORM_ADMIN', 'usuarios.administrar'),
    ('PLATFORM_ADMIN', 'cursos.revisar'), ('PLATFORM_ADMIN', 'licencias.administrar'),
    ('PLATFORM_ADMIN', 'facturacion.ver'), ('PLATFORM_ADMIN', 'auditoria.ver'),
    ('PLATFORM_SUPPORT', 'organizaciones.ver'), ('PLATFORM_SUPPORT', 'usuarios.ver'),
    ('PLATFORM_SUPPORT', 'auditoria.ver'), ('COURSE_REVIEWER', 'cursos.revisar'),
    ('ORGANIZATION_OWNER', 'usuarios.ver'), ('ORGANIZATION_OWNER', 'usuarios.administrar'),
    ('ORGANIZATION_OWNER', 'perfiles.ver'), ('ORGANIZATION_OWNER', 'perfiles.administrar'),
    ('ORGANIZATION_OWNER', 'configuracion.editar'), ('ORGANIZATION_OWNER', 'cursos.ver'),
    ('ORGANIZATION_OWNER', 'cursos.crear'), ('ORGANIZATION_OWNER', 'cursos.editar'),
    ('ORGANIZATION_OWNER', 'cursos.aprobar'), ('ORGANIZATION_OWNER', 'categorias.ver'),
    ('ORGANIZATION_OWNER', 'estudiantes.ver'), ('ORGANIZATION_OWNER', 'equipos.administrar'),
    ('ORGANIZATION_OWNER', 'asignaciones.crear'), ('ORGANIZATION_OWNER', 'sesiones.gestionar'),
    ('ORGANIZATION_OWNER', 'licencias.ver'), ('ORGANIZATION_OWNER', 'rutas.administrar'),
    ('ORGANIZATION_OWNER', 'reportes.ver'), ('ORGANIZATION_OWNER', 'facturacion.ver'),
    ('ORGANIZATION_OWNER', 'certificados.ver'),
    ('ORGANIZATION_ADMIN', 'usuarios.ver'), ('ORGANIZATION_ADMIN', 'usuarios.administrar'),
    ('ORGANIZATION_ADMIN', 'perfiles.ver'), ('ORGANIZATION_ADMIN', 'cursos.ver'),
    ('ORGANIZATION_ADMIN', 'cursos.crear'), ('ORGANIZATION_ADMIN', 'cursos.editar'),
    ('ORGANIZATION_ADMIN', 'cursos.aprobar'), ('ORGANIZATION_ADMIN', 'categorias.ver'),
    ('ORGANIZATION_ADMIN', 'estudiantes.ver'), ('ORGANIZATION_ADMIN', 'equipos.administrar'),
    ('ORGANIZATION_ADMIN', 'asignaciones.crear'), ('ORGANIZATION_ADMIN', 'sesiones.gestionar'),
    ('ORGANIZATION_ADMIN', 'licencias.ver'), ('ORGANIZATION_ADMIN', 'rutas.administrar'),
    ('ORGANIZATION_ADMIN', 'reportes.ver'), ('ORGANIZATION_ADMIN', 'certificados.ver'),
    ('TRAINING_MANAGER', 'cursos.ver'), ('TRAINING_MANAGER', 'estudiantes.ver'),
    ('TRAINING_MANAGER', 'asignaciones.crear'), ('TRAINING_MANAGER', 'sesiones.gestionar'),
    ('TRAINING_MANAGER', 'rutas.administrar'), ('TRAINING_MANAGER', 'reportes.ver'),
    ('INSTRUCTOR', 'cursos.ver'), ('INSTRUCTOR', 'cursos.crear'),
    ('INSTRUCTOR', 'cursos.editar'), ('INSTRUCTOR', 'sesiones.gestionar'),
    ('INSTRUCTOR', 'ingresos.ver'), ('STUDENT', 'cursos.ver'),
    ('STUDENT', 'aprendizaje.consumir'), ('STUDENT', 'certificados.ver')
)
insert into public.perfil_permiso_principal (perfil_principal_id, permiso_principal_id)
select perfil.id, permiso.id
from asignacion
join public.perfil_principal perfil on perfil.codigo = asignacion.perfil_codigo
join public.permiso_principal permiso on permiso.codigo = asignacion.permiso_codigo
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- 2. Guardia de autorización administrativa
-- ---------------------------------------------------------------------------

create or replace function public.es_super_admin_actual()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.identidad_principal identidad
    join public.membresia_principal membresia on membresia.identidad_principal_id = identidad.id
    join public.funcion_principal funcion on funcion.membresia_principal_id = membresia.id
    join public.perfil_principal perfil on perfil.id = funcion.perfil_principal_id
    where identidad.auth_usuario_ref = auth.uid()
      and identidad.estado = 'ACTIVO'
      and membresia.estado = 'ACTIVA'
      and membresia.alcance_tipo = 'PLATAFORMA'
      and funcion.estado = 'ACTIVA'
      and perfil.codigo = 'SUPER_ADMIN'
      and (membresia.vigente_hasta is null or membresia.vigente_hasta > now())
      and (funcion.vigente_hasta is null or funcion.vigente_hasta > now())
  );
$$;

revoke all on function public.es_super_admin_actual() from public;
grant execute on function public.es_super_admin_actual() to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Consultas del centro de accesos
-- ---------------------------------------------------------------------------

create or replace function public.admin_catalogo_accesos()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare resultado jsonb;
begin
  if not public.es_super_admin_actual() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'perfiles', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', perfil.id, 'codigo', perfil.codigo, 'nombre', perfil.nombre,
        'descripcion', perfil.descripcion, 'portal', perfil.portal, 'nivel', perfil.nivel,
        'permisos', coalesce((select jsonb_agg(permiso.codigo order by permiso.codigo)
          from public.perfil_permiso_principal pp
          join public.permiso_principal permiso on permiso.id = pp.permiso_principal_id
          where pp.perfil_principal_id = perfil.id), '[]'::jsonb)
      ) order by perfil.nivel, perfil.nombre)
      from public.perfil_principal perfil where perfil.estado = 'ACTIVO'
    ), '[]'::jsonb),
    'permisos', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id, 'codigo', codigo, 'nombre', nombre,
        'descripcion', descripcion, 'modulo', modulo_codigo
      ) order by modulo_codigo, nombre)
      from public.permiso_principal where estado = 'ACTIVO'
    ), '[]'::jsonb),
    'organizaciones', coalesce((
      select jsonb_agg(jsonb_build_object(
        'instalacionId', instalacion.id, 'empresaPrincipalRef', instalacion.empresa_principal_ref,
        'empresaSistemaRef', instalacion.empresa_sistema_ref, 'tenantRef', instalacion.tenant_ref,
        'nombre', instalacion.nombre_organizacion, 'estado', instalacion.estado
      ) order by instalacion.nombre_organizacion)
      from public.instalacion_organizacion instalacion
    ), '[]'::jsonb)
  ) into resultado;
  return resultado;
end;
$$;

create or replace function public.admin_listar_accesos()
returns table (
  funcion_id uuid, membresia_id uuid, identidad_id uuid, nombre text, correo text,
  avatar_url text, estado_identidad text, perfil_codigo text, perfil_nombre text,
  portal text, nivel text, organizacion_nombre text, instalacion_ref uuid,
  estado_funcion text, permisos text[]
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.es_super_admin_actual() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  return query
  select funcion.id, membresia.id, identidad.id,
    coalesce(nullif(identidad.nombre_mostrar, ''), identidad.correo, 'Usuario'),
    identidad.correo, identidad.avatar_url, identidad.estado,
    perfil.codigo, perfil.nombre, perfil.portal, perfil.nivel,
    case when membresia.alcance_tipo = 'PLATAFORMA' then 'Tukuy · Plataforma'
         else coalesce(instalacion.nombre_organizacion, 'Organización') end,
    membresia.instalacion_organizacion_ref, funcion.estado,
    public.permisos_efectivos_funcion(funcion.id)
  from public.funcion_principal funcion
  join public.membresia_principal membresia on membresia.id = funcion.membresia_principal_id
  join public.identidad_principal identidad on identidad.id = membresia.identidad_principal_id
  join public.perfil_principal perfil on perfil.id = funcion.perfil_principal_id
  left join public.instalacion_organizacion instalacion on instalacion.id = membresia.instalacion_organizacion_ref
  order by identidad.nombre_mostrar nulls last, perfil.nombre;
end;
$$;

-- Asigna un perfil a una identidad ya registrada en Supabase Auth.
-- La invitación/creación de Auth se mantiene fuera de SQL y se hará con Edge Function.
create or replace function public.admin_asignar_acceso(
  p_correo text,
  p_perfil_codigo text,
  p_instalacion_ref uuid default null,
  p_permisos_conceder text[] default array[]::text[],
  p_permisos_denegar text[] default array[]::text[]
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_identidad public.identidad_principal;
  v_perfil public.perfil_principal;
  v_instalacion public.instalacion_organizacion;
  v_membresia_id uuid;
  v_funcion_id uuid;
begin
  if not public.es_super_admin_actual() then raise exception 'No autorizado' using errcode = '42501'; end if;
  select * into v_identidad from public.identidad_principal where lower(correo) = lower(trim(p_correo));
  if not found then raise exception 'La cuenta aún no existe en Supabase Auth. Invítala primero.'; end if;
  select * into v_perfil from public.perfil_principal where codigo = p_perfil_codigo and estado = 'ACTIVO';
  if not found or v_perfil.codigo = 'SUPER_ADMIN' then raise exception 'Perfil no asignable desde esta operación.'; end if;

  if v_perfil.nivel = 'PLATAFORMA' then
    if p_instalacion_ref is not null then raise exception 'Un perfil de plataforma no admite organización.'; end if;
    select id into v_membresia_id from public.membresia_principal
      where identidad_principal_id = v_identidad.id and alcance_tipo = 'PLATAFORMA'
        and estado in ('PENDIENTE', 'ACTIVA') limit 1;
    if v_membresia_id is null then
      insert into public.membresia_principal (identidad_principal_id, alcance_tipo, estado)
      values (v_identidad.id, 'PLATAFORMA', 'ACTIVA') returning id into v_membresia_id;
    end if;
  else
    if p_instalacion_ref is null then raise exception 'Selecciona una organización.'; end if;
    select * into v_instalacion from public.instalacion_organizacion where id = p_instalacion_ref;
    if not found then raise exception 'La instalación indicada no existe.'; end if;
    select id into v_membresia_id from public.membresia_principal
      where identidad_principal_id = v_identidad.id and alcance_tipo = 'ORGANIZACION'
        and tenant_ref = v_instalacion.tenant_ref and estado in ('PENDIENTE', 'ACTIVA') limit 1;
    if v_membresia_id is null then
      insert into public.membresia_principal (
        identidad_principal_id, empresa_principal_ref, empresa_sistema_ref, tenant_ref,
        instalacion_organizacion_ref, alcance_tipo, estado
      ) values (
        v_identidad.id, v_instalacion.empresa_principal_ref, v_instalacion.empresa_sistema_ref,
        v_instalacion.tenant_ref, v_instalacion.id, 'ORGANIZACION', 'ACTIVA'
      ) returning id into v_membresia_id;
    end if;
  end if;

  insert into public.funcion_principal (membresia_principal_id, perfil_principal_id, codigo, alcance, es_principal, estado)
  values (v_membresia_id, v_perfil.id, v_perfil.codigo, jsonb_build_object('tipo', case when v_perfil.nivel = 'PLATAFORMA' then 'PLATAFORMA' else 'ENTIDAD' end), false, 'ACTIVA')
  on conflict (membresia_principal_id, codigo) do update set
    perfil_principal_id = excluded.perfil_principal_id, estado = 'ACTIVA', vigente_hasta = null,
    actualizada_en = now(), version_registro = public.funcion_principal.version_registro + 1
  returning id into v_funcion_id;

  delete from public.funcion_permiso_principal where funcion_principal_id = v_funcion_id;
  insert into public.funcion_permiso_principal (funcion_principal_id, permiso_principal_id, efecto)
    select v_funcion_id, id, 'CONCEDER' from public.permiso_principal where codigo = any(p_permisos_conceder);
  insert into public.funcion_permiso_principal (funcion_principal_id, permiso_principal_id, efecto)
    select v_funcion_id, id, 'DENEGAR' from public.permiso_principal where codigo = any(p_permisos_denegar)
    on conflict (funcion_principal_id, permiso_principal_id) do update set efecto = excluded.efecto;
  update public.membresia_principal set version_autorizacion = version_autorizacion + 1, actualizada_en = now()
    where id = v_membresia_id;
  return v_funcion_id;
end;
$$;

create or replace function public.admin_cambiar_estado_acceso(p_funcion_id uuid, p_estado text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.es_super_admin_actual() then raise exception 'No autorizado' using errcode = '42501'; end if;
  if p_estado not in ('ACTIVA', 'SUSPENDIDA', 'REVOCADA') then raise exception 'Estado inválido.'; end if;
  if exists (
    select 1 from public.funcion_principal f
    join public.perfil_principal p on p.id = f.perfil_principal_id
    where f.id = p_funcion_id and p.codigo = 'SUPER_ADMIN'
  ) then raise exception 'El acceso raíz no puede modificarse desde el panel.'; end if;
  update public.funcion_principal set estado = p_estado, actualizada_en = now(),
    version_registro = version_registro + 1 where id = p_funcion_id;
  if not found then raise exception 'Acceso no encontrado.'; end if;
end;
$$;

revoke all on function public.admin_catalogo_accesos() from public;
revoke all on function public.admin_listar_accesos() from public;
revoke all on function public.admin_asignar_acceso(text,text,uuid,text[],text[]) from public;
revoke all on function public.admin_cambiar_estado_acceso(uuid,text) from public;
grant execute on function public.admin_catalogo_accesos() to authenticated;
grant execute on function public.admin_listar_accesos() to authenticated;
grant execute on function public.admin_asignar_acceso(text,text,uuid,text[],text[]) to authenticated;
grant execute on function public.admin_cambiar_estado_acceso(uuid,text) to authenticated;
