-- PRINCIPAL: al designar responsable de Dirección/Administración en el
-- organigrama, sincroniza org_asignacion_perfil + funcion_principal
-- (ORGANIZATION_OWNER / ORGANIZATION_ADMIN). Sin esto, el nodo muestra el
-- nombre pero Accesos y permisos / selector de portal no ven el perfil.
-- Ejecutar en el SQL Editor del proyecto PRINCIPAL.

begin;

create or replace function public.org_sincronizar_responsable_gobierno(
  p_instalacion_id uuid,
  p_unidad_id text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_unidad public.org_unidad%rowtype;
  v_perfil_id text;
  v_plantilla text;
  v_identidad_id text;
  v_asig_id text;
  v_funcion_id uuid;
begin
  if p_instalacion_id is null or nullif(trim(p_unidad_id), '') is null then
    return null;
  end if;

  select * into v_unidad
  from public.org_unidad u
  where u.instalacion_organizacion_id = p_instalacion_id
    and u.id = p_unidad_id;
  if not found then
    return null;
  end if;

  if coalesce(v_unidad.codigo_sistema, '') not in ('DIRECCION', 'ADMINISTRACION') then
    return null;
  end if;

  v_identidad_id := nullif(trim(v_unidad.responsable_identidad_ref), '');
  if v_identidad_id is null then
    return null;
  end if;

  -- Resolver identidad por UUID o correo (por si llegó un valor legado).
  if not exists (
    select 1 from public.identidad_principal i where i.id::text = v_identidad_id
  ) then
    select i.id::text into v_identidad_id
    from public.identidad_principal i
    where lower(i.correo) = lower(v_unidad.responsable_identidad_ref)
    limit 1;
  end if;
  if v_identidad_id is null then
    raise exception
      'El responsable de % no corresponde a una identidad Auth válida.',
      v_unidad.codigo_sistema;
  end if;

  perform public.org_asegurar_perfiles_base(p_instalacion_id);

  if v_unidad.codigo_sistema = 'DIRECCION' then
    v_perfil_id := 'perfil-direccion';
    v_plantilla := 'DIRECCION';
  else
    v_perfil_id := 'perfil-administracion';
    v_plantilla := 'ADMINISTRACION';
  end if;

  if not exists (
    select 1
    from public.org_perfil p
    where p.instalacion_organizacion_id = p_instalacion_id
      and p.id = v_perfil_id
  ) then
    -- Fallback por plantilla si el id base no existe en la instalación.
    select p.id into v_perfil_id
    from public.org_perfil p
    where p.instalacion_organizacion_id = p_instalacion_id
      and upper(p.plantilla) = v_plantilla
      and p.es_sistema = true
    order by p.creado_en
    limit 1;
  end if;

  if v_perfil_id is null then
    raise exception 'No existe el perfil institucional de % en la entidad.', v_plantilla;
  end if;

  -- Asignación estable por identidad + perfil de gobierno.
  v_asig_id := 'asig-gob-' || v_perfil_id || '-' || replace(v_identidad_id, '-', '');

  insert into public.org_asignacion_perfil as a (
    instalacion_organizacion_id, id, identidad_ref, perfil_id,
    unidad_ids, sede_ids, incluir_descendientes, es_principal, estado, actualizado_en
  ) values (
    p_instalacion_id,
    v_asig_id,
    v_identidad_id,
    v_perfil_id,
    jsonb_build_array(v_unidad.id),
    '[]'::jsonb,
    false,
    true,
    'ACTIVA',
    now()
  )
  on conflict (instalacion_organizacion_id, id) do update set
    identidad_ref = excluded.identidad_ref,
    perfil_id = excluded.perfil_id,
    unidad_ids = excluded.unidad_ids,
    estado = 'ACTIVA',
    es_principal = true,
    actualizado_en = now();

  v_funcion_id := public.org_sincronizar_funcion_desde_asignacion(
    p_instalacion_id,
    v_asig_id
  );

  -- También deja la persona vinculada al nodo (para métricas y Personas).
  insert into public.org_vinculacion_unidad as v (
    instalacion_organizacion_id, id, identidad_ref, unidad_id,
    sede_id, tipo, origen, estado, fecha_inicio, actualizado_en
  ) values (
    p_instalacion_id,
    'vinc-gob-' || v_unidad.id || '-' || replace(v_identidad_id, '-', ''),
    v_identidad_id,
    v_unidad.id,
    null,
    'PRINCIPAL',
    'ASIGNACION_ADMINISTRATIVA',
    'ACTIVA',
    current_date,
    now()
  )
  on conflict (instalacion_organizacion_id, id) do update set
    identidad_ref = excluded.identidad_ref,
    unidad_id = excluded.unidad_id,
    estado = 'ACTIVA',
    actualizado_en = now();

  return v_funcion_id;
end;
$$;

create or replace function public.org_guardar_unidad(
  p_instalacion_id uuid,
  p_unidad jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id text := coalesce(nullif(trim(p_unidad->>'id'), ''), 'unidad-' || replace(gen_random_uuid()::text, '-', ''));
  v_existente public.org_unidad%rowtype;
  v_nuevo_responsable text := nullif(trim(p_unidad->>'responsableUsuarioId'), '');
  v_codigo_sistema text;
  v_resultado jsonb;
begin
  if p_instalacion_id is null
    or not public.org_tiene_permiso(p_instalacion_id, 'equipos.administrar')
  then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  select * into v_existente
  from public.org_unidad u
  where u.instalacion_organizacion_id = p_instalacion_id
    and u.id = v_id;

  v_codigo_sistema := coalesce(
    v_existente.codigo_sistema,
    nullif(trim(p_unidad->>'codigoSistema'), '')
  );

  -- Solo Dirección puede cambiar quién es Dirección / Administración.
  if v_codigo_sistema in ('DIRECCION', 'ADMINISTRACION')
    and coalesce(v_existente.responsable_identidad_ref, '') is distinct from coalesce(v_nuevo_responsable, '')
    and not public.org_puede_designar_gobierno(p_instalacion_id)
  then
    raise exception
      'Solo Dirección puede designar los responsables de Dirección o Administración.'
      using errcode = '42501';
  end if;

  insert into public.org_unidad as u (
    instalacion_organizacion_id, id, nombre, descripcion, codigo,
    tipo_unidad_id, estructura_id, nivel_id, unidad_padre_id,
    codigo_sistema, es_sistema, responsable_identidad_ref,
    politica_incorporacion_id, permite_subunidades, orden, estado, actualizado_en
  ) values (
    p_instalacion_id,
    v_id,
    coalesce(nullif(trim(p_unidad->>'nombre'), ''), 'Unidad'),
    nullif(trim(p_unidad->>'descripcion'), ''),
    nullif(trim(p_unidad->>'codigo'), ''),
    coalesce(
      nullif(trim(p_unidad->>'tipoUnidadId'), ''),
      v_existente.tipo_unidad_id,
      'tipo-area'
    ),
    nullif(trim(p_unidad->>'estructuraId'), ''),
    nullif(trim(p_unidad->>'nivelId'), ''),
    nullif(trim(p_unidad->>'unidadPadreId'), ''),
    coalesce(v_existente.codigo_sistema, nullif(trim(p_unidad->>'codigoSistema'), '')),
    coalesce(v_existente.es_sistema, coalesce((p_unidad->>'esSistema')::boolean, false)),
    v_nuevo_responsable,
    nullif(trim(p_unidad->>'politicaIncorporacionId'), ''),
    case
      when p_unidad ? 'permiteSubunidades'
        then (p_unidad->>'permiteSubunidades')::boolean
      else v_existente.permite_subunidades
    end,
    greatest(1, coalesce((p_unidad->>'orden')::int, v_existente.orden, 1)),
    coalesce(nullif(trim(p_unidad->>'estado'), ''), 'ACTIVA'),
    now()
  )
  on conflict (instalacion_organizacion_id, id) do update set
    nombre = case when u.es_sistema then u.nombre else excluded.nombre end,
    descripcion = excluded.descripcion,
    codigo = excluded.codigo,
    tipo_unidad_id = case when u.es_sistema then u.tipo_unidad_id else excluded.tipo_unidad_id end,
    estructura_id = case when u.es_sistema then u.estructura_id else excluded.estructura_id end,
    nivel_id = excluded.nivel_id,
    unidad_padre_id = case when u.es_sistema then u.unidad_padre_id else excluded.unidad_padre_id end,
    responsable_identidad_ref = excluded.responsable_identidad_ref,
    politica_incorporacion_id = excluded.politica_incorporacion_id,
    permite_subunidades = excluded.permite_subunidades,
    orden = excluded.orden,
    estado = case when u.es_sistema then u.estado else excluded.estado end,
    actualizado_en = now();

  -- Puente organigrama → auth: crea ORGANIZATION_OWNER / ORGANIZATION_ADMIN.
  perform public.org_sincronizar_responsable_gobierno(p_instalacion_id, v_id);

  select jsonb_build_object(
    'id', u.id,
    'nombre', u.nombre,
    'descripcion', u.descripcion,
    'codigo', u.codigo,
    'tipoUnidadId', u.tipo_unidad_id,
    'estructuraId', u.estructura_id,
    'nivelId', u.nivel_id,
    'unidadPadreId', u.unidad_padre_id,
    'codigoSistema', u.codigo_sistema,
    'esSistema', u.es_sistema,
    'responsableUsuarioId', u.responsable_identidad_ref,
    'politicaIncorporacionId', u.politica_incorporacion_id,
    'permiteSubunidades', u.permite_subunidades,
    'orden', u.orden,
    'estado', u.estado
  )
  into v_resultado
  from public.org_unidad u
  where u.instalacion_organizacion_id = p_instalacion_id
    and u.id = v_id;

  return v_resultado;
end;
$$;

-- Reparación: responsables ya guardados en gobierno sin función de acceso.
do $$
declare
  v_u record;
begin
  for v_u in
    select u.instalacion_organizacion_id, u.id
    from public.org_unidad u
    where u.codigo_sistema in ('DIRECCION', 'ADMINISTRACION')
      and nullif(trim(u.responsable_identidad_ref), '') is not null
      and u.estado = 'ACTIVA'
  loop
    begin
      perform public.org_sincronizar_responsable_gobierno(
        v_u.instalacion_organizacion_id,
        v_u.id
      );
    exception when others then
      raise notice 'No se pudo sincronizar gobierno %/%: %',
        v_u.instalacion_organizacion_id, v_u.id, SQLERRM;
    end;
  end loop;
end;
$$;

revoke all on function public.org_sincronizar_responsable_gobierno(uuid, text) from public;
grant execute on function public.org_sincronizar_responsable_gobierno(uuid, text) to authenticated;

commit;
