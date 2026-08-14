-- Permisos generales de perfil (Dir/Admin) + excepciones por persona.
-- Incluye cursos.definir_precio para que el docente proponga precio al enviar a revisión.
-- Ejecutar en el SQL Editor del proyecto PRINCIPAL.

begin;

insert into public.permiso_principal (codigo, nombre, descripcion, modulo_codigo)
values
  (
    'cursos.definir_precio',
    'Definir precio de curso',
    'El docente puede proponer el precio al enviar el curso a revisión. Sin descuentos.',
    'CURSOS'
  ),
  (
    'perfiles.administrar',
    'Administrar perfiles y permisos',
    'Configurar permisos generales de perfiles y excepciones por persona.',
    'SEGURIDAD'
  ),
  (
    'evaluaciones.calificar',
    'Calificar evaluaciones',
    'Revisar y calificar entregas de estudiantes.',
    'APRENDIZAJE'
  ),
  (
    'aprendizaje.consumir',
    'Consumir aprendizaje',
    'Acceder a cursos como estudiante.',
    'APRENDIZAJE'
  )
on conflict (codigo) do update set
  nombre = excluded.nombre,
  descripcion = excluded.descripcion,
  modulo_codigo = excluded.modulo_codigo,
  estado = 'ACTIVO',
  actualizado_en = now();

create table if not exists public.org_excepcion_permiso (
  instalacion_organizacion_id uuid not null
    references public.instalacion_organizacion (id) on delete cascade,
  id text not null,
  identidad_ref text not null,
  permiso_codigo text not null,
  efecto text not null
    check (efecto in ('CONCEDER', 'DENEGAR')),
  motivo text not null default '',
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  primary key (instalacion_organizacion_id, id),
  unique (instalacion_organizacion_id, identidad_ref, permiso_codigo)
);

create index if not exists org_excepcion_permiso_identidad_idx
  on public.org_excepcion_permiso (instalacion_organizacion_id, identidad_ref);

create or replace function public.org_puede_gestionar_accesos(
  p_instalacion_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  return public.org_tiene_permiso(p_instalacion_id, 'perfiles.administrar')
    or public.org_tiene_permiso(p_instalacion_id, 'equipos.administrar')
    or public.org_tiene_permiso(p_instalacion_id, 'entidad.gobernar');
end;
$$;

create or replace function public.org_aplicar_excepciones_a_funcion(
  p_instalacion_id uuid,
  p_identidad_ref text,
  p_funcion_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_exc record;
  v_perm_norm text;
  v_permiso_id uuid;
  v_identidad_id uuid;
begin
  if p_funcion_id is null or nullif(trim(p_identidad_ref), '') is null then
    return;
  end if;

  select i.id into v_identidad_id
  from public.identidad_principal i
  where i.id::text = p_identidad_ref
     or lower(i.correo) = lower(p_identidad_ref)
  limit 1;

  for v_exc in
    select e.permiso_codigo, e.efecto
    from public.org_excepcion_permiso e
    where e.instalacion_organizacion_id = p_instalacion_id
      and (
        e.identidad_ref = p_identidad_ref
        or (v_identidad_id is not null and e.identidad_ref = v_identidad_id::text)
      )
  loop
    v_perm_norm := public.org_normalizar_codigo_permiso(v_exc.permiso_codigo);
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
    ) values (p_funcion_id, v_permiso_id, v_exc.efecto)
    on conflict (funcion_principal_id, permiso_principal_id) do update set
      efecto = excluded.efecto;
  end loop;

  update public.membresia_principal m
  set
    version_autorizacion = version_autorizacion + 1,
    actualizada_en = now()
  where m.id = (
    select f.membresia_principal_id
    from public.funcion_principal f
    where f.id = p_funcion_id
  );
end;
$$;

-- Envuelve el sync existente para reaplicar excepciones tras la plantilla del perfil.
do $$
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'org_sincronizar_funcion_desde_asignacion'
      and pg_get_function_identity_arguments(p.oid) = 'uuid, text'
  ) and not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'org_sincronizar_funcion_desde_asignacion_core'
  ) then
    execute
      'alter function public.org_sincronizar_funcion_desde_asignacion(uuid, text)
       rename to org_sincronizar_funcion_desde_asignacion_core';
  end if;
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

  select a.identidad_ref into v_identidad
  from public.org_asignacion_perfil a
  where a.instalacion_organizacion_id = p_instalacion_id
    and a.id = p_asignacion_id;

  perform public.org_aplicar_excepciones_a_funcion(
    p_instalacion_id,
    v_identidad,
    v_funcion_id
  );
  return v_funcion_id;
end;
$$;

create or replace function public.org_listar_excepciones_permiso(
  p_instalacion_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_items jsonb;
begin
  if p_instalacion_id is null
    or not public.org_puede_gestionar_accesos(p_instalacion_id)
  then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', e.id,
    'identidadRef', e.identidad_ref,
    'permisoCodigo', e.permiso_codigo,
    'efecto', e.efecto,
    'motivo', e.motivo,
    'correo', i.correo,
    'nombre', coalesce(
      nullif(trim(coalesce(i.nombre_mostrar, '')), ''),
      nullif(trim(coalesce(i.nombres, '') || ' ' || coalesce(i.apellidos, '')), ''),
      i.correo
    ),
    'actualizadoEn', e.actualizado_en
  ) order by e.actualizado_en desc), '[]'::jsonb)
  into v_items
  from public.org_excepcion_permiso e
  left join public.identidad_principal i
    on i.id::text = e.identidad_ref
    or lower(i.correo) = lower(e.identidad_ref)
  where e.instalacion_organizacion_id = p_instalacion_id;

  return jsonb_build_object('ok', true, 'excepciones', v_items);
end;
$$;

create or replace function public.org_guardar_excepcion_permiso(
  p_instalacion_id uuid,
  p_excepcion jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id text := coalesce(
    nullif(trim(p_excepcion->>'id'), ''),
    'exc-' || replace(gen_random_uuid()::text, '-', '')
  );
  v_identidad text := nullif(trim(p_excepcion->>'identidadRef'), '');
  v_permiso text := public.org_normalizar_codigo_permiso(
    coalesce(p_excepcion->>'permisoCodigo', '')
  );
  v_efecto text := upper(coalesce(nullif(trim(p_excepcion->>'efecto'), ''), 'DENEGAR'));
  v_row public.org_excepcion_permiso%rowtype;
  v_asig record;
begin
  if p_instalacion_id is null
    or not public.org_puede_gestionar_accesos(p_instalacion_id)
  then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  if v_identidad is null or v_permiso = '' then
    raise exception 'identidadRef y permisoCodigo son requeridos';
  end if;
  if v_efecto not in ('CONCEDER', 'DENEGAR') then
    raise exception 'efecto inválido';
  end if;
  if not exists (
    select 1 from public.permiso_principal p
    where p.codigo = v_permiso and p.estado = 'ACTIVO'
  ) then
    raise exception 'Permiso % no existe en el catálogo', v_permiso;
  end if;

  insert into public.org_excepcion_permiso as e (
    instalacion_organizacion_id, id, identidad_ref, permiso_codigo,
    efecto, motivo, actualizado_en
  ) values (
    p_instalacion_id,
    v_id,
    v_identidad,
    v_permiso,
    v_efecto,
    coalesce(p_excepcion->>'motivo', ''),
    now()
  )
  on conflict (instalacion_organizacion_id, identidad_ref, permiso_codigo)
  do update set
    efecto = excluded.efecto,
    motivo = excluded.motivo,
    actualizado_en = now()
  returning * into v_row;

  for v_asig in
    select a.id
    from public.org_asignacion_perfil a
    where a.instalacion_organizacion_id = p_instalacion_id
      and a.estado = 'ACTIVA'
      and (
        a.identidad_ref = v_row.identidad_ref
        or lower(a.identidad_ref) = lower(v_row.identidad_ref)
      )
  loop
    perform public.org_sincronizar_funcion_desde_asignacion(
      p_instalacion_id, v_asig.id
    );
  end loop;

  return jsonb_build_object(
    'id', v_row.id,
    'identidadRef', v_row.identidad_ref,
    'permisoCodigo', v_row.permiso_codigo,
    'efecto', v_row.efecto,
    'motivo', v_row.motivo
  );
end;
$$;

create or replace function public.org_eliminar_excepcion_permiso(
  p_instalacion_id uuid,
  p_excepcion_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.org_excepcion_permiso%rowtype;
  v_asig record;
begin
  if p_instalacion_id is null
    or not public.org_puede_gestionar_accesos(p_instalacion_id)
  then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  select * into v_row
  from public.org_excepcion_permiso e
  where e.instalacion_organizacion_id = p_instalacion_id
    and e.id = p_excepcion_id;

  if not found then
    return jsonb_build_object('ok', true, 'excepcionId', p_excepcion_id);
  end if;

  delete from public.org_excepcion_permiso e
  where e.instalacion_organizacion_id = p_instalacion_id
    and e.id = p_excepcion_id;

  for v_asig in
    select a.id
    from public.org_asignacion_perfil a
    where a.instalacion_organizacion_id = p_instalacion_id
      and a.estado = 'ACTIVA'
      and (
        a.identidad_ref = v_row.identidad_ref
        or lower(a.identidad_ref) = lower(v_row.identidad_ref)
      )
  loop
    perform public.org_sincronizar_funcion_desde_asignacion(
      p_instalacion_id, v_asig.id
    );
  end loop;

  return jsonb_build_object('ok', true, 'excepcionId', p_excepcion_id);
end;
$$;

-- Dir/Admin gestionan permisos generales (no solo equipos.administrar).
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
    or not public.org_puede_gestionar_accesos(p_instalacion_id)
  then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  select * into v_existente
  from public.org_perfil p
  where p.instalacion_organizacion_id = p_instalacion_id
    and p.id = v_id;

  if found
    and v_existente.tipo = 'DIRECCION'
    and not public.org_tiene_permiso(p_instalacion_id, 'entidad.gobernar')
  then
    raise exception 'Solo Dirección puede modificar el perfil de Dirección'
      using errcode = '42501';
  end if;

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

revoke all on function public.org_puede_gestionar_accesos(uuid) from public;
revoke all on function public.org_aplicar_excepciones_a_funcion(uuid, text, uuid) from public;
revoke all on function public.org_sincronizar_funcion_desde_asignacion(uuid, text) from public;
revoke all on function public.org_listar_excepciones_permiso(uuid) from public;
revoke all on function public.org_guardar_excepcion_permiso(uuid, jsonb) from public;
revoke all on function public.org_eliminar_excepcion_permiso(uuid, text) from public;
revoke all on function public.org_guardar_perfil(uuid, jsonb) from public;

grant execute on function public.org_puede_gestionar_accesos(uuid) to authenticated;
grant execute on function public.org_aplicar_excepciones_a_funcion(uuid, text, uuid) to authenticated;
grant execute on function public.org_sincronizar_funcion_desde_asignacion(uuid, text) to authenticated;
grant execute on function public.org_listar_excepciones_permiso(uuid) to authenticated;
grant execute on function public.org_guardar_excepcion_permiso(uuid, jsonb) to authenticated;
grant execute on function public.org_eliminar_excepcion_permiso(uuid, text) to authenticated;
grant execute on function public.org_guardar_perfil(uuid, jsonb) to authenticated;

-- Asegura perfiles.administrar en Administración / Dirección existentes.
update public.org_perfil p
set
  permisos = coalesce(p.permisos, '[]'::jsonb) || '["perfiles.administrar"]'::jsonb,
  actualizado_en = now()
where p.plantilla in ('DIRECCION', 'ADMINISTRACION')
  and not (coalesce(p.permisos, '[]'::jsonb) @> '["perfiles.administrar"]'::jsonb);

commit;
