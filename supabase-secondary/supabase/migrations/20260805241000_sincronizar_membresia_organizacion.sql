-- Fase 1 · sincronizar membresia_organizacion (+ perfiles) desde la principal.
-- Ejecutar en el SQL Editor del proyecto SECUNDARIO.
begin;

-- Una identidad = una membresía local en esta instalación.
create unique index if not exists membresia_organizacion_identidad_uq
  on public.membresia_organizacion (identidad_usuario_ref);

create unique index if not exists membresia_organizacion_principal_ref_uq
  on public.membresia_organizacion (membresia_principal_ref)
  where membresia_principal_ref is not null
    and btrim(membresia_principal_ref) <> '';

create unique index if not exists asignacion_perfil_membresia_perfil_uq
  on public.asignacion_perfil_membresia (membresia_id, perfil_principal_ref);

create or replace function public.servicio_sincronizar_membresia_organizacion(
  p_identidad_principal_ref uuid,
  p_membresia_principal_ref uuid,
  p_perfiles jsonb default '[]'::jsonb,
  p_version_autorizacion bigint default 1,
  p_estado text default 'ACTIVO',
  p_cargo text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_membresia_id uuid;
  v_estado_texto text;
  v_estado_membresia public.membresia_organizacion;
  v_estado_perfil public.asignacion_perfil_membresia;
  v_perfil text;
  v_perfil_principal boolean := true;
  v_perfiles_sync integer := 0;
  v_activo boolean;
begin
  if p_identidad_principal_ref is null then
    raise exception 'Identidad principal requerida';
  end if;
  if p_membresia_principal_ref is null then
    raise exception 'Membresia principal requerida';
  end if;
  if coalesce(p_version_autorizacion, 0) < 1 then
    raise exception 'Version de autorizacion invalida';
  end if;

  v_activo := upper(coalesce(p_estado, 'ACTIVO')) in ('ACTIVO', 'ACTIVA');
  v_estado_texto := case when v_activo then 'ACTIVO' else 'INACTIVO' end;

  begin
    select * into v_estado_membresia
    from jsonb_populate_record(
      null::public.membresia_organizacion,
      jsonb_build_object('estado', v_estado_texto)
    );
  exception
    when others then
      select * into v_estado_membresia
      from jsonb_populate_record(
        null::public.membresia_organizacion,
        jsonb_build_object('estado', 'ACTIVO')
      );
      v_estado_texto := 'ACTIVO';
  end;

  begin
    select * into v_estado_perfil
    from jsonb_populate_record(
      null::public.asignacion_perfil_membresia,
      jsonb_build_object('estado', v_estado_texto)
    );
  exception
    when others then
      select * into v_estado_perfil
      from jsonb_populate_record(
        null::public.asignacion_perfil_membresia,
        jsonb_build_object('estado', 'ACTIVO')
      );
  end;

  insert into public.membresia_organizacion (
    identidad_usuario_ref,
    membresia_principal_ref,
    cargo,
    estado,
    ingreso_en,
    actualizada_en,
    version_registro,
    version_autorizacion,
    autorizacion_sincronizada_en
  ) values (
    p_identidad_principal_ref,
    p_membresia_principal_ref::text,
    nullif(trim(coalesce(p_cargo, '')), ''),
    v_estado_membresia.estado,
    now(),
    now(),
    1,
    p_version_autorizacion::text,
    now()
  )
  on conflict (identidad_usuario_ref) do update set
    membresia_principal_ref = excluded.membresia_principal_ref,
    cargo = coalesce(excluded.cargo, public.membresia_organizacion.cargo),
    estado = excluded.estado,
    version_autorizacion = excluded.version_autorizacion,
    autorizacion_sincronizada_en = now(),
    actualizada_en = now(),
    version_registro = public.membresia_organizacion.version_registro + 1
  where coalesce(nullif(public.membresia_organizacion.version_autorizacion, ''), '0')::bigint
        <= p_version_autorizacion
  returning id into v_membresia_id;

  if v_membresia_id is null then
    select id into v_membresia_id
    from public.membresia_organizacion
    where identidad_usuario_ref = p_identidad_principal_ref;
  end if;

  if v_membresia_id is null then
    raise exception 'No se pudo resolver la membresia organizacional';
  end if;

  for v_perfil in
    select distinct trim(valor)
    from jsonb_array_elements_text(coalesce(p_perfiles, '[]'::jsonb)) as valor
    where trim(valor) <> ''
  loop
    insert into public.asignacion_perfil_membresia (
      membresia_id,
      perfil_principal_ref,
      es_principal,
      incluye_descendientes,
      estado,
      vigente_desde,
      vigente_hasta,
      creada_en,
      actualizada_en
    ) values (
      v_membresia_id,
      v_perfil,
      v_perfil_principal,
      false,
      v_estado_perfil.estado,
      now(),
      case when v_activo then null else now() end,
      now(),
      now()
    )
    on conflict (membresia_id, perfil_principal_ref) do update set
      es_principal = excluded.es_principal or public.asignacion_perfil_membresia.es_principal,
      estado = excluded.estado,
      vigente_hasta = case
        when v_activo then null
        else coalesce(public.asignacion_perfil_membresia.vigente_hasta, now())
      end,
      actualizada_en = now();

    v_perfil_principal := false;
    v_perfiles_sync := v_perfiles_sync + 1;
  end loop;

  return jsonb_build_object(
    'ok', true,
    'membresiaOrganizacionId', v_membresia_id,
    'identidadPrincipalRef', p_identidad_principal_ref,
    'membresiaPrincipalRef', p_membresia_principal_ref,
    'perfilesSincronizados', v_perfiles_sync,
    'estado', v_estado_texto
  );
end;
$$;

create or replace function public.servicio_salud_secundaria()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'ok', true,
    'instalacionId', contexto.instalacion_principal_ref,
    'tenantId', contexto.tenant_principal_ref,
    'organizacion', contexto.nombre_organizacion,
    'versionEsquema', contexto.version_esquema,
    'estado', contexto.estado,
    'tablasPublicas', (
      select count(*) from pg_catalog.pg_tables where schemaname = 'public'
    ),
    'accesosSincronizados', (
      select count(*) from public.acceso_identidad_principal where estado = 'ACTIVO'
    ),
    'membresiasOrganizacion', (
      select count(*) from public.membresia_organizacion
    ),
    'generadoEn', now()
  )
  from public.contexto_instalacion contexto
  where contexto.id = true;
$$;

revoke all on function public.servicio_sincronizar_membresia_organizacion(uuid, uuid, jsonb, bigint, text, text)
  from public, anon, authenticated;
grant execute on function public.servicio_sincronizar_membresia_organizacion(uuid, uuid, jsonb, bigint, text, text)
  to service_role;

commit;
