-- Actualizar perfil de un acceso existente (edición desde Accesos y permisos).
-- Ejecutar en el SQL Editor del proyecto PRINCIPAL.
begin;

create or replace function public.admin_actualizar_acceso(
  p_funcion_id uuid,
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
  v_funcion public.funcion_principal;
  v_membresia public.membresia_principal;
  v_perfil public.perfil_principal;
  v_instalacion public.instalacion_organizacion;
  v_membresia_id uuid;
  v_conflicto uuid;
begin
  if not public.es_super_admin_actual() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  select * into v_funcion
  from public.funcion_principal
  where id = p_funcion_id;
  if not found then
    raise exception 'Acceso no encontrado.';
  end if;

  select * into v_membresia
  from public.membresia_principal
  where id = v_funcion.membresia_principal_id;
  if not found then
    raise exception 'Membresía del acceso no encontrada.';
  end if;

  if exists (
    select 1
    from public.perfil_principal p
    where p.id = v_funcion.perfil_principal_id and p.codigo = 'SUPER_ADMIN'
  ) then
    raise exception 'El acceso raíz no puede modificarse desde el panel.';
  end if;

  select * into v_perfil
  from public.perfil_principal
  where codigo = p_perfil_codigo and estado = 'ACTIVO';
  if not found or v_perfil.codigo = 'SUPER_ADMIN' then
    raise exception 'Perfil no asignable desde esta operación.';
  end if;

  if v_perfil.nivel = 'PLATAFORMA' then
    if p_instalacion_ref is not null then
      raise exception 'Un perfil de plataforma no admite organización.';
    end if;
    select id into v_membresia_id
    from public.membresia_principal
    where identidad_principal_id = v_membresia.identidad_principal_id
      and alcance_tipo = 'PLATAFORMA'
      and estado in ('PENDIENTE', 'ACTIVA')
    limit 1;
    if v_membresia_id is null then
      insert into public.membresia_principal (
        identidad_principal_id, alcance_tipo, estado
      ) values (
        v_membresia.identidad_principal_id, 'PLATAFORMA', 'ACTIVA'
      )
      returning id into v_membresia_id;
    end if;
  else
    if p_instalacion_ref is null then
      raise exception 'Selecciona una organización.';
    end if;
    select * into v_instalacion
    from public.instalacion_organizacion
    where id = p_instalacion_ref;
    if not found then
      raise exception 'La instalación indicada no existe.';
    end if;
    select id into v_membresia_id
    from public.membresia_principal
    where identidad_principal_id = v_membresia.identidad_principal_id
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
        v_membresia.identidad_principal_id,
        v_instalacion.empresa_principal_ref,
        v_instalacion.empresa_sistema_ref,
        v_instalacion.tenant_ref,
        v_instalacion.id,
        'ORGANIZACION',
        'ACTIVA'
      )
      returning id into v_membresia_id;
    else
      update public.membresia_principal
      set
        empresa_principal_ref = v_instalacion.empresa_principal_ref,
        empresa_sistema_ref = v_instalacion.empresa_sistema_ref,
        tenant_ref = v_instalacion.tenant_ref,
        instalacion_organizacion_ref = v_instalacion.id,
        estado = 'ACTIVA',
        actualizada_en = now(),
        version_autorizacion = version_autorizacion + 1
      where id = v_membresia_id;
    end if;
  end if;

  -- Si ya existe otra función con el mismo código en la membresía destino, la
  -- absorbemos (mismo identidad + perfil deseado).
  select id into v_conflicto
  from public.funcion_principal
  where membresia_principal_id = v_membresia_id
    and codigo = v_perfil.codigo
    and id <> p_funcion_id
  limit 1;

  if v_conflicto is not null then
    delete from public.funcion_permiso_principal
    where funcion_principal_id = v_conflicto;
    delete from public.funcion_principal
    where id = v_conflicto;
  end if;

  update public.funcion_principal
  set
    membresia_principal_id = v_membresia_id,
    perfil_principal_id = v_perfil.id,
    codigo = v_perfil.codigo,
    alcance = jsonb_build_object(
      'tipo',
      case when v_perfil.nivel = 'PLATAFORMA' then 'PLATAFORMA' else 'ENTIDAD' end
    ),
    estado = 'ACTIVA',
    vigente_hasta = null,
    actualizada_en = now(),
    version_registro = version_registro + 1
  where id = p_funcion_id;

  delete from public.funcion_permiso_principal
  where funcion_principal_id = p_funcion_id;

  insert into public.funcion_permiso_principal (
    funcion_principal_id, permiso_principal_id, efecto
  )
  select p_funcion_id, id, 'CONCEDER'
  from public.permiso_principal
  where codigo = any(p_permisos_conceder);

  insert into public.funcion_permiso_principal (
    funcion_principal_id, permiso_principal_id, efecto
  )
  select p_funcion_id, id, 'DENEGAR'
  from public.permiso_principal
  where codigo = any(p_permisos_denegar)
  on conflict (funcion_principal_id, permiso_principal_id)
  do update set efecto = excluded.efecto;

  update public.membresia_principal
  set
    version_autorizacion = version_autorizacion + 1,
    actualizada_en = now()
  where id = v_membresia_id;

  return p_funcion_id;
end;
$$;

revoke all on function public.admin_actualizar_acceso(uuid, text, uuid, text[], text[])
  from public;
grant execute on function public.admin_actualizar_acceso(uuid, text, uuid, text[], text[])
  to authenticated;

commit;
