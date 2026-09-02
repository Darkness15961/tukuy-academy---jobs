-- Fix PRINCIPAL: falta org_sincronizar_funcion_desde_asignacion_core
-- (el wrapper de 20260813200000 la llama, pero el rename no quedó aplicado).
-- Ejecutar en el SQL Editor del proyecto PRINCIPAL (nidkyztqapeqdplzvnkc).

begin;

-- ---------------------------------------------------------------------------
-- Core: sincroniza funcion_principal desde org_asignacion_perfil
-- ---------------------------------------------------------------------------

create or replace function public.org_sincronizar_funcion_desde_asignacion_core(
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

-- ---------------------------------------------------------------------------
-- Wrapper: core + excepciones de permiso
-- ---------------------------------------------------------------------------

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
  v_funcion_id uuid;
  v_identidad text;
begin
  v_funcion_id := public.org_sincronizar_funcion_desde_asignacion_core(
    p_instalacion_id,
    p_asignacion_id
  );
  if v_funcion_id is null then
    return null;
  end if;

  if to_regprocedure('public.org_aplicar_excepciones_a_funcion(uuid, text, uuid)') is not null then
    select a.identidad_ref into v_identidad
    from public.org_asignacion_perfil a
    where a.instalacion_organizacion_id = p_instalacion_id
      and a.id = p_asignacion_id;

    perform public.org_aplicar_excepciones_a_funcion(
      p_instalacion_id,
      v_identidad,
      v_funcion_id
    );
  end if;

  return v_funcion_id;
end;
$$;

revoke all on function public.org_sincronizar_funcion_desde_asignacion_core(uuid, text)
  from public, anon;
revoke all on function public.org_sincronizar_funcion_desde_asignacion(uuid, text)
  from public, anon;

grant execute on function public.org_sincronizar_funcion_desde_asignacion_core(uuid, text)
  to authenticated, service_role;
grant execute on function public.org_sincronizar_funcion_desde_asignacion(uuid, text)
  to authenticated, service_role;

commit;
