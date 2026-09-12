-- PRINCIPAL: Administración también puede crear perfiles (Docente, etc.).
-- Amplía permisos de org_guardar_perfil y del perfil Administración.

begin;

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
    or (
      not public.org_tiene_permiso(p_instalacion_id, 'equipos.administrar')
      and not public.org_tiene_permiso(p_instalacion_id, 'perfiles.administrar')
      and not public.org_tiene_permiso(p_instalacion_id, 'entidad.gobernar')
    )
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

-- Asegura permisos de gestión de perfiles en el perfil Administración (org).
update public.org_perfil p
set
  permisos = (
    select coalesce(jsonb_agg(distinct value), '[]'::jsonb)
    from jsonb_array_elements(
      coalesce(p.permisos, '[]'::jsonb) ||
      '["perfiles.administrar","equipos.administrar","usuarios.invitar","usuarios.administrar","estructura.administrar"]'::jsonb
    )
  ),
  actualizado_en = now()
where upper(coalesce(p.plantilla, '')) = 'ADMINISTRACION'
   or p.id = 'perfil-administracion';

commit;
