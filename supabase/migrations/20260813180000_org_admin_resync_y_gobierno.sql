-- PRINCIPAL: re-sincroniza funciones desde asignaciones de perfil y
-- restringe designar Dirección/Administración a quien gobierna la entidad.
-- Ejecutar en el SQL Editor del proyecto PRINCIPAL.

begin;

create or replace function public.org_puede_designar_gobierno(
  p_instalacion_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    public.org_tiene_permiso(p_instalacion_id, 'administradores.designar')
    or public.org_tiene_permiso(p_instalacion_id, 'entidad.gobernar');
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
  v_row public.org_asignacion_perfil%rowtype;
  v_plantilla text;
begin
  if p_instalacion_id is null
    or not public.org_tiene_permiso(p_instalacion_id, 'equipos.administrar')
  then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  if v_usuario is null or v_perfil is null then
    raise exception 'usuarioId y perfilId son requeridos';
  end if;

  select p.plantilla into v_plantilla
  from public.org_perfil p
  where p.instalacion_organizacion_id = p_instalacion_id
    and p.id = v_perfil;
  if not found then
    raise exception 'Perfil de organización no encontrado';
  end if;

  if upper(coalesce(v_plantilla, '')) in ('DIRECCION', 'ADMINISTRACION')
    and not public.org_puede_designar_gobierno(p_instalacion_id)
  then
    raise exception
      'Solo Dirección puede designar los perfiles de Dirección o Administración.'
      using errcode = '42501';
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

  if upper(coalesce(v_perfil.plantilla, '')) in ('DIRECCION', 'ADMINISTRACION')
    and not public.org_puede_designar_gobierno(p_instalacion_id)
  then
    raise exception
      'Solo Dirección puede designar los perfiles de Dirección o Administración.'
      using errcode = '42501';
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

-- Re-sincroniza asignaciones activas (útil si alguien quedó en org_asignacion_perfil
-- sin funcion_principal ORGANIZATION_ADMIN).
create or replace function public.org_resync_asignaciones_perfil(
  p_instalacion_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_asig record;
  v_ok integer := 0;
  v_error integer := 0;
  v_detalle jsonb := '[]'::jsonb;
begin
  for v_asig in
    select a.instalacion_organizacion_id, a.id, a.identidad_ref, a.perfil_id
    from public.org_asignacion_perfil a
    where a.estado = 'ACTIVA'
      and (p_instalacion_id is null or a.instalacion_organizacion_id = p_instalacion_id)
  loop
    begin
      perform public.org_sincronizar_funcion_desde_asignacion(
        v_asig.instalacion_organizacion_id,
        v_asig.id
      );
      v_ok := v_ok + 1;
    exception when others then
      v_error := v_error + 1;
      v_detalle := v_detalle || jsonb_build_array(jsonb_build_object(
        'asignacionId', v_asig.id,
        'identidadRef', v_asig.identidad_ref,
        'perfilId', v_asig.perfil_id,
        'error', SQLERRM
      ));
    end;
  end loop;

  return jsonb_build_object(
    'ok', v_ok,
    'errores', v_error,
    'detalleErrores', v_detalle
  );
end;
$$;

revoke all on function public.org_puede_designar_gobierno(uuid) from public;
revoke all on function public.org_resync_asignaciones_perfil(uuid) from public;
grant execute on function public.org_puede_designar_gobierno(uuid) to authenticated;
grant execute on function public.org_resync_asignaciones_perfil(uuid) to authenticated;

create or replace function public.org_asignar_acceso(
  p_instalacion_id uuid,
  p_correo text,
  p_perfil_codigo text
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
  if p_instalacion_id is null
    or not public.org_tiene_permiso(p_instalacion_id, 'usuarios.administrar')
  then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  select * into v_instalacion
  from public.instalacion_organizacion
  where id = p_instalacion_id;
  if not found then
    raise exception 'La instalación indicada no existe.';
  end if;

  select * into v_identidad
  from public.identidad_principal
  where lower(correo) = lower(trim(p_correo));
  if not found then
    raise exception
      'La cuenta aún no existe en Supabase Auth. Debe registrarse o iniciar sesión primero.';
  end if;

  select * into v_perfil
  from public.perfil_principal
  where codigo = p_perfil_codigo
    and estado = 'ACTIVO'
    and nivel = 'ORGANIZACION'
    and codigo in (
      'ORGANIZATION_OWNER',
      'ORGANIZATION_ADMIN',
      'TRAINING_MANAGER',
      'INSTRUCTOR',
      'STUDENT'
    );
  if not found then
    raise exception 'Perfil no asignable desde el portal de organización.';
  end if;

  if v_perfil.codigo in ('ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN')
    and not public.org_puede_designar_gobierno(p_instalacion_id)
  then
    raise exception
      'Solo Dirección puede designar los perfiles de Dirección o Administración.'
      using errcode = '42501';
  end if;

  select id into v_membresia_id
  from public.membresia_principal
  where identidad_principal_id = v_identidad.id
    and alcance_tipo = 'ORGANIZACION'
    and tenant_ref = v_instalacion.tenant_ref
    and estado in ('PENDIENTE', 'ACTIVA')
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
    estado
  ) values (
    v_membresia_id,
    v_perfil.id,
    v_perfil.codigo,
    jsonb_build_object('tipo', 'ENTIDAD'),
    false,
    'ACTIVA'
  )
  on conflict (membresia_principal_id, codigo) do update set
    perfil_principal_id = excluded.perfil_principal_id,
    estado = 'ACTIVA',
    vigente_hasta = null,
    actualizada_en = now(),
    version_registro = public.funcion_principal.version_registro + 1
  returning id into v_funcion_id;

  update public.membresia_principal
  set
    version_autorizacion = version_autorizacion + 1,
    actualizada_en = now(),
    estado = 'ACTIVA'
  where id = v_membresia_id;

  return v_funcion_id;
end;
$$;

-- Ejecución inmediata para reparar accesos ya asignados.
select public.org_resync_asignaciones_perfil(null);

commit;
