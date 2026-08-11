-- WP2 · Puente org_perfil → funcion_principal / permisos efectivos.
-- Ejecutar en el SQL Editor del proyecto PRINCIPAL.

begin;

-- 1) Permisos usados por Equipos / control-acceso que faltaban en el catálogo.
insert into public.permiso_principal (codigo, nombre, descripcion, modulo_codigo)
values
  ('usuarios.ver', 'Ver usuarios', 'Consultar personas de la organización.', 'USUARIOS'),
  ('usuarios.invitar', 'Invitar usuarios', 'Invitar e incorporar personas.', 'USUARIOS'),
  ('usuarios.editar', 'Editar usuarios', 'Editar datos de personas del directorio.', 'USUARIOS'),
  ('alumnos.ver', 'Ver alumnos', 'Consultar alumnos matriculados.', 'PERSONAS'),
  ('asignaciones.ver', 'Ver asignaciones', 'Consultar asignaciones de formación.', 'APRENDIZAJE'),
  ('categorias.gestionar', 'Gestionar categorías', 'Administrar categorías de cursos.', 'CURSOS'),
  ('certificados.preparar', 'Preparar certificados', 'Preparar certificados pendientes de firma.', 'CERTIFICADOS'),
  ('certificados.firmar', 'Firmar certificados', 'Firmar certificados institucionales.', 'CERTIFICADOS'),
  ('certificados.verificar', 'Verificar certificados', 'Verificar autenticidad de certificados.', 'CERTIFICADOS'),
  ('certificados.revocar', 'Revocar certificados', 'Revocar certificados emitidos.', 'CERTIFICADOS'),
  ('certificados.configurar', 'Configurar certificados', 'Configurar plantillas y firmantes.', 'CERTIFICADOS'),
  ('estructura.administrar', 'Administrar estructura', 'Gestionar organigrama y nodos.', 'PERSONAS'),
  ('entidad.gobernar', 'Gobernar entidad', 'Autoridad máxima de gobierno.', 'SEGURIDAD'),
  ('administradores.designar', 'Designar administradores', 'Nombrar roles de administración.', 'SEGURIDAD'),
  ('reportes.exportar', 'Exportar reportes', 'Exportar indicadores.', 'REPORTES'),
  ('auditoria.ver', 'Ver auditoría', 'Consultar trazabilidad.', 'REPORTES'),
  ('facturacion.ver', 'Ver facturación', 'Consultar facturación y comprobantes.', 'FACTURACION'),
  ('vacantes.gestionar', 'Gestionar vacantes', 'Administrar vacantes de la bolsa.', 'BOLSA'),
  ('vacantes.publicar', 'Publicar vacantes', 'Publicar vacantes.', 'BOLSA'),
  ('postulaciones.gestionar', 'Gestionar postulaciones', 'Gestionar postulaciones.', 'BOLSA')
on conflict (codigo) do update set
  nombre = excluded.nombre,
  descripcion = excluded.descripcion,
  modulo_codigo = excluded.modulo_codigo,
  estado = 'ACTIVO',
  actualizado_en = now();

-- Perfil base vacío (solo cursos.ver) para plantillas custom/firmas/supervisión.
insert into public.perfil_principal (codigo, nombre, descripcion, portal, nivel, es_sistema)
values (
  'ORG_CUSTOM',
  'Perfil personalizado de organización',
  'Base mínima; los permisos efectivos vienen de org_perfil vía overrides.',
  'organizacion',
  'ORGANIZACION',
  true
)
on conflict (codigo) do update set
  nombre = excluded.nombre,
  descripcion = excluded.descripcion,
  portal = excluded.portal,
  nivel = excluded.nivel,
  estado = 'ACTIVO',
  actualizado_en = now();

insert into public.perfil_permiso_principal (perfil_principal_id, permiso_principal_id)
select perfil.id, permiso.id
from public.perfil_principal perfil
join public.permiso_principal permiso on permiso.codigo = 'cursos.ver'
where perfil.codigo = 'ORG_CUSTOM'
on conflict do nothing;

create or replace function public.org_plantilla_a_perfil_codigo(
  p_plantilla text
)
returns text
language sql
immutable
set search_path = ''
as $$
  select case upper(coalesce(p_plantilla, 'PERSONALIZADO'))
    when 'DIRECCION' then 'ORGANIZATION_OWNER'
    when 'ADMINISTRACION' then 'ORGANIZATION_ADMIN'
    when 'GESTION' then 'TRAINING_MANAGER'
    when 'DOCENCIA' then 'INSTRUCTOR'
    when 'APRENDIZAJE' then 'STUDENT'
    else 'ORG_CUSTOM'
  end;
$$;

create or replace function public.org_codigo_funcion_org_perfil(
  p_perfil_id text
)
returns text
language sql
immutable
set search_path = ''
as $$
  select 'ORG_' || left(replace(coalesce(p_perfil_id, 'custom'), '-', ''), 24);
$$;

create or replace function public.org_normalizar_codigo_permiso(
  p_codigo text
)
returns text
language sql
immutable
set search_path = ''
as $$
  select case lower(trim(coalesce(p_codigo, '')))
    when 'alumnos.ver' then 'estudiantes.ver'
    when 'usuarios.editar' then 'usuarios.administrar'
    else lower(trim(coalesce(p_codigo, '')))
  end;
$$;

create or replace function public.org_sincronizar_funcion_desde_asignacion(
  p_instalacion_id uuid,
  p_asignacion_id text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_asig public.org_asignacion_perfil%rowtype;
  v_perfil public.org_perfil%rowtype;
  v_instalacion public.instalacion_organizacion%rowtype;
  v_identidad public.identidad_principal%rowtype;
  v_perfil_plat public.perfil_principal%rowtype;
  v_membresia_id uuid;
  v_funcion_id uuid;
  v_codigo_plat text;
  v_codigo_funcion text;
  v_perm text;
  v_perm_norm text;
  v_permiso_id uuid;
begin
  if p_instalacion_id is null or nullif(trim(p_asignacion_id), '') is null then
    raise exception 'Instalación y asignación requeridas';
  end if;

  select * into v_asig
  from public.org_asignacion_perfil a
  where a.instalacion_organizacion_id = p_instalacion_id
    and a.id = p_asignacion_id;
  if not found then
    raise exception 'Asignación no encontrada';
  end if;

  if v_asig.estado <> 'ACTIVA' then
    -- Desactivar función vinculada si existe.
    update public.funcion_principal f
    set
      estado = 'SUSPENDIDA',
      actualizada_en = now(),
      version_registro = f.version_registro + 1
    where f.alcance->>'orgPerfilId' = v_asig.perfil_id
      and f.membresia_principal_id in (
        select m.id from public.membresia_principal m
        where m.instalacion_organizacion_ref = p_instalacion_id
          and m.identidad_principal_id::text = v_asig.identidad_ref
      );
    return null;
  end if;

  select * into v_perfil
  from public.org_perfil p
  where p.instalacion_organizacion_id = p_instalacion_id
    and p.id = v_asig.perfil_id;
  if not found then
    raise exception 'Perfil de organización no encontrado';
  end if;

  select * into v_instalacion
  from public.instalacion_organizacion i
  where i.id = p_instalacion_id;
  if not found then
    raise exception 'Instalación no encontrada';
  end if;

  select * into v_identidad
  from public.identidad_principal i
  where i.id::text = v_asig.identidad_ref
     or lower(i.correo) = lower(v_asig.identidad_ref);
  if not found then
    raise exception 'Identidad no encontrada para la asignación (%).', v_asig.identidad_ref;
  end if;

  v_codigo_plat := public.org_plantilla_a_perfil_codigo(v_perfil.plantilla);
  select * into v_perfil_plat
  from public.perfil_principal p
  where p.codigo = v_codigo_plat and p.estado = 'ACTIVO';
  if not found then
    raise exception 'Perfil plataforma % no encontrado', v_codigo_plat;
  end if;

  v_codigo_funcion := case
    when v_codigo_plat = 'ORG_CUSTOM'
      then public.org_codigo_funcion_org_perfil(v_perfil.id)
    else v_codigo_plat
  end;

  select id into v_membresia_id
  from public.membresia_principal m
  where m.identidad_principal_id = v_identidad.id
    and m.alcance_tipo = 'ORGANIZACION'
    and m.tenant_ref = v_instalacion.tenant_ref
    and m.estado in ('PENDIENTE', 'ACTIVA')
  limit 1;

  if v_membresia_id is null then
    insert into public.membresia_principal (
      identidad_principal_id,
      empresa_principal_ref,
      empresa_sistema_ref,
      tenant_ref,
      instalacion_organizacion_ref,
      alcance_tipo,
      estado
    ) values (
      v_identidad.id,
      v_instalacion.empresa_principal_ref,
      v_instalacion.empresa_sistema_ref,
      v_instalacion.tenant_ref,
      v_instalacion.id,
      'ORGANIZACION',
      'ACTIVA'
    )
    returning id into v_membresia_id;
  end if;

  insert into public.funcion_principal (
    membresia_principal_id,
    perfil_principal_id,
    codigo,
    alcance,
    es_principal,
    estado,
    ambito_docencia
  ) values (
    v_membresia_id,
    v_perfil_plat.id,
    v_codigo_funcion,
    jsonb_build_object(
      'tipo', coalesce(v_perfil.alcance_defecto, 'ENTIDAD'),
      'orgPerfilId', v_perfil.id,
      'unidadIds', coalesce(v_asig.unidad_ids, '[]'::jsonb),
      'sedeIds', coalesce(v_asig.sede_ids, '[]'::jsonb),
      'incluirDescendientes', v_asig.incluir_descendientes
    ),
    coalesce(v_asig.es_principal, false),
    'ACTIVA',
    case when v_codigo_plat = 'INSTRUCTOR' then 'ORGANIZACION' else null end
  )
  on conflict (membresia_principal_id, codigo) do update set
    perfil_principal_id = excluded.perfil_principal_id,
    alcance = excluded.alcance,
    es_principal = excluded.es_principal,
    estado = 'ACTIVA',
    vigente_hasta = null,
    ambito_docencia = excluded.ambito_docencia,
    actualizada_en = now(),
    version_registro = public.funcion_principal.version_registro + 1
  returning id into v_funcion_id;

  -- Overrides CONCEDER desde org_perfil.permisos (unión con la base del perfil plataforma).
  for v_perm in
    select jsonb_array_elements_text(coalesce(v_perfil.permisos, '[]'::jsonb))
  loop
    v_perm_norm := public.org_normalizar_codigo_permiso(v_perm);
    if v_perm_norm = '' then
      continue;
    end if;
    select id into v_permiso_id
    from public.permiso_principal
    where codigo = v_perm_norm and estado = 'ACTIVO';
    if v_permiso_id is null then
      continue;
    end if;
    insert into public.funcion_permiso_principal (
      funcion_principal_id, permiso_principal_id, efecto
    ) values (v_funcion_id, v_permiso_id, 'CONCEDER')
    on conflict (funcion_principal_id, permiso_principal_id) do update set
      efecto = 'CONCEDER';
  end loop;

  -- Si es ORG_CUSTOM, denegar permisos de la base que no estén en org_perfil
  -- (la base solo tiene cursos.ver; si no está en la lista, se deniega).
  if v_codigo_plat = 'ORG_CUSTOM' then
    insert into public.funcion_permiso_principal (
      funcion_principal_id, permiso_principal_id, efecto
    )
    select v_funcion_id, pp.permiso_principal_id, 'DENEGAR'
    from public.perfil_permiso_principal pp
    join public.permiso_principal perm on perm.id = pp.permiso_principal_id
    where pp.perfil_principal_id = v_perfil_plat.id
      and not exists (
        select 1
        from jsonb_array_elements_text(coalesce(v_perfil.permisos, '[]'::jsonb)) x(codigo)
        where public.org_normalizar_codigo_permiso(x.codigo) = perm.codigo
      )
    on conflict (funcion_principal_id, permiso_principal_id) do update set
      efecto = 'DENEGAR';
  end if;

  update public.membresia_principal
  set
    version_autorizacion = version_autorizacion + 1,
    actualizada_en = now(),
    estado = 'ACTIVA',
    instalacion_organizacion_ref = coalesce(instalacion_organizacion_ref, p_instalacion_id)
  where id = v_membresia_id;

  return v_funcion_id;
end;
$$;

-- Reescribir guardar asignación para sincronizar auth.
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
  v_row public.org_asignacion_perfil%rowtype;
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
    actualizado_en = now()
  returning * into v_row;

  perform public.org_sincronizar_funcion_desde_asignacion(p_instalacion_id, v_row.id);

  return jsonb_build_object(
    'id', v_row.id,
    'usuarioId', v_row.identidad_ref,
    'perfilId', v_row.perfil_id,
    'unidadIds', v_row.unidad_ids,
    'sedeIds', v_row.sede_ids,
    'incluirDescendientes', v_row.incluir_descendientes,
    'esPrincipal', v_row.es_principal,
    'estado', v_row.estado
  );
end;
$$;

-- Al guardar perfil, re-sincroniza asignaciones activas.
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
  v_asig record;
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

  for v_asig in
    select a.id
    from public.org_asignacion_perfil a
    where a.instalacion_organizacion_id = p_instalacion_id
      and a.perfil_id = v_id
      and a.estado = 'ACTIVA'
  loop
    perform public.org_sincronizar_funcion_desde_asignacion(p_instalacion_id, v_asig.id);
  end loop;

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

create or replace function public.org_eliminar_asignacion_perfil(
  p_instalacion_id uuid,
  p_asignacion_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_asig public.org_asignacion_perfil%rowtype;
begin
  if p_instalacion_id is null
    or not public.org_tiene_permiso(p_instalacion_id, 'equipos.administrar')
  then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  select * into v_asig
  from public.org_asignacion_perfil a
  where a.instalacion_organizacion_id = p_instalacion_id
    and a.id = p_asignacion_id;

  if found then
    update public.funcion_principal f
    set
      estado = 'REVOCADA',
      actualizada_en = now(),
      version_registro = f.version_registro + 1
    where f.alcance->>'orgPerfilId' = v_asig.perfil_id
      and f.membresia_principal_id in (
        select m.id from public.membresia_principal m
        where m.instalacion_organizacion_ref = p_instalacion_id
          and m.identidad_principal_id::text = v_asig.identidad_ref
      )
      and f.codigo like 'ORG_%';

    update public.membresia_principal m
    set version_autorizacion = version_autorizacion + 1,
        actualizada_en = now()
    where m.instalacion_organizacion_ref = p_instalacion_id
      and m.identidad_principal_id::text = v_asig.identidad_ref;
  end if;

  delete from public.org_asignacion_perfil a
  where a.instalacion_organizacion_id = p_instalacion_id
    and a.id = p_asignacion_id;

  return jsonb_build_object('ok', true, 'asignacionId', p_asignacion_id);
end;
$$;

-- Incorporación unificada: acceso plataforma + asignación org_perfil.
create or replace function public.org_incorporar_persona_perfil(
  p_instalacion_id uuid,
  p_correo text,
  p_perfil_org_id text,
  p_unidad_id text default null,
  p_sede_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_perfil public.org_perfil%rowtype;
  v_funcion_plat uuid;
  v_asig_id text;
  v_asig jsonb;
  v_identidad_id text;
begin
  if p_instalacion_id is null
    or (
      not public.org_tiene_permiso(p_instalacion_id, 'usuarios.administrar')
      and not public.org_tiene_permiso(p_instalacion_id, 'usuarios.invitar')
      and not public.org_tiene_permiso(p_instalacion_id, 'equipos.administrar')
    )
  then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  perform public.org_asegurar_perfiles_base(p_instalacion_id);

  select * into v_perfil
  from public.org_perfil p
  where p.instalacion_organizacion_id = p_instalacion_id
    and p.id = p_perfil_org_id;
  if not found then
    raise exception 'Perfil de organización no encontrado';
  end if;

  select i.id::text into v_identidad_id
  from public.identidad_principal i
  where lower(i.correo) = lower(trim(p_correo));
  if v_identidad_id is null then
    raise exception
      'La cuenta aún no existe en Supabase Auth. Debe registrarse o iniciar sesión primero.';
  end if;

  v_asig_id := 'asig-' || replace(gen_random_uuid()::text, '-', '');
  v_asig := jsonb_build_object(
    'id', v_asig_id,
    'usuarioId', v_identidad_id,
    'perfilId', v_perfil.id,
    'unidadIds', case when nullif(trim(p_unidad_id), '') is null then '[]'::jsonb else jsonb_build_array(p_unidad_id) end,
    'sedeIds', case when nullif(trim(p_sede_id), '') is null then '[]'::jsonb else jsonb_build_array(p_sede_id) end,
    'incluirDescendientes', false,
    'esPrincipal', true,
    'estado', 'ACTIVA'
  );

  insert into public.org_asignacion_perfil (
    instalacion_organizacion_id, id, identidad_ref, perfil_id,
    unidad_ids, sede_ids, incluir_descendientes, es_principal, estado
  ) values (
    p_instalacion_id,
    v_asig_id,
    v_identidad_id,
    v_perfil.id,
    coalesce(v_asig->'unidadIds', '[]'::jsonb),
    coalesce(v_asig->'sedeIds', '[]'::jsonb),
    false,
    true,
    'ACTIVA'
  )
  on conflict (instalacion_organizacion_id, id) do update set
    identidad_ref = excluded.identidad_ref,
    perfil_id = excluded.perfil_id,
    unidad_ids = excluded.unidad_ids,
    sede_ids = excluded.sede_ids,
    estado = 'ACTIVA',
    actualizado_en = now();

  v_funcion_plat := public.org_sincronizar_funcion_desde_asignacion(
    p_instalacion_id,
    v_asig_id
  );

  return jsonb_build_object(
    'ok', true,
    'funcionId', v_funcion_plat,
    'asignacion', v_asig,
    'identidadId', v_identidad_id,
    'perfilCodigoPlataforma', public.org_plantilla_a_perfil_codigo(v_perfil.plantilla)
  );
end;
$$;

revoke all on function public.org_plantilla_a_perfil_codigo(text) from public;
revoke all on function public.org_codigo_funcion_org_perfil(text) from public;
revoke all on function public.org_normalizar_codigo_permiso(text) from public;
revoke all on function public.org_sincronizar_funcion_desde_asignacion(uuid, text) from public;
revoke all on function public.org_incorporar_persona_perfil(uuid, text, text, text, text) from public;

grant execute on function public.org_sincronizar_funcion_desde_asignacion(uuid, text) to authenticated;
grant execute on function public.org_incorporar_persona_perfil(uuid, text, text, text, text) to authenticated;
-- org_guardar_* ya estaban granted

commit;
