-- Plantillas de certificado por organización (PRINCIPAL).
-- Dirección/Administración configuran fondos + layout; docentes si la org lo autoriza.
-- Ejecutar en el SQL Editor del proyecto PRINCIPAL.

begin;

create table if not exists public.org_config_certificados (
  instalacion_organizacion_id uuid primary key
    references public.instalacion_organizacion (id) on delete cascade,
  docentes_pueden_configurar boolean not null default false,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create table if not exists public.org_plantilla_certificado (
  id uuid primary key default gen_random_uuid(),
  instalacion_organizacion_id uuid not null
    references public.instalacion_organizacion (id) on delete cascade,
  nombre text not null,
  es_default boolean not null default false,
  alcance text not null default 'ORGANIZACION'
    check (alcance in ('ORGANIZACION', 'DOCENTE')),
  autor_identidad_ref uuid null,
  fondo_url text not null default '',
  fondo_especificacion text not null default
    'Imagen horizontal PNG/JPG · recomendado 3508×2480 px (A4 300 dpi) · máx. 8 MB',
  usar_logo_entidad boolean not null default true,
  logo_override_url text null,
  layout jsonb not null default '{}'::jsonb,
  activa boolean not null default true,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create index if not exists org_plantilla_certificado_instalacion_idx
  on public.org_plantilla_certificado (instalacion_organizacion_id);

create unique index if not exists org_plantilla_certificado_default_uq
  on public.org_plantilla_certificado (instalacion_organizacion_id)
  where es_default and activa;

-- Layout default A4 landscape (mm).
create or replace function public._org_layout_certificado_default()
returns jsonb
language sql
immutable
as $$
  select '{
    "orientacion":"landscape",
    "formato":"a4",
    "anchoMm":297,
    "altoMm":210,
    "campos":{
      "tituloDocumento":{"xMm":148.5,"yMm":42,"fontSize":12,"align":"center","visible":true},
      "introduccion":{"xMm":148.5,"yMm":58,"fontSize":10,"align":"center","visible":true},
      "titular":{"xMm":148.5,"yMm":78,"fontSize":24,"align":"center","visible":true},
      "curso":{"xMm":148.5,"yMm":106,"fontSize":15,"align":"center","visible":true},
      "detalle":{"xMm":148.5,"yMm":122,"fontSize":10,"align":"center","visible":true},
      "fecha":{"xMm":70,"yMm":155,"fontSize":10,"align":"center","visible":true},
      "codigo":{"xMm":148.5,"yMm":155,"fontSize":9,"align":"center","visible":true},
      "logo":{"xMm":28,"yMm":18,"widthMm":28,"heightMm":18,"visible":true},
      "qr":{"xMm":250,"yMm":16,"widthMm":28,"heightMm":28,"visible":true}
    },
    "firmantes":[
      {
        "id":"firma-default-1",
        "etiqueta":"Firma 1",
        "nombreMostrar":"",
        "xMm":148.5,
        "yMm":172,
        "fontSize":10,
        "align":"center",
        "visible":true,
        "anchoLineaMm":58
      }
    ],
    "cantidadFirmantesActiva":1,
    "modelosFirmantes":{
      "1":[{"id":"firma-m1-1","etiqueta":"Firma 1","nombreMostrar":"","xMm":148.5,"yMm":172,"fontSize":10,"align":"center","visible":true,"anchoLineaMm":58}],
      "2":[
        {"id":"firma-m2-1","etiqueta":"Firma 1","nombreMostrar":"","xMm":85,"yMm":172,"fontSize":10,"align":"center","visible":true,"anchoLineaMm":52},
        {"id":"firma-m2-2","etiqueta":"Firma 2","nombreMostrar":"","xMm":212,"yMm":172,"fontSize":10,"align":"center","visible":true,"anchoLineaMm":52}
      ],
      "3":[
        {"id":"firma-m3-1","etiqueta":"Firma 1","nombreMostrar":"","xMm":55,"yMm":172,"fontSize":9,"align":"center","visible":true,"anchoLineaMm":42},
        {"id":"firma-m3-2","etiqueta":"Firma 2","nombreMostrar":"","xMm":148.5,"yMm":172,"fontSize":9,"align":"center","visible":true,"anchoLineaMm":42},
        {"id":"firma-m3-3","etiqueta":"Firma 3","nombreMostrar":"","xMm":242,"yMm":172,"fontSize":9,"align":"center","visible":true,"anchoLineaMm":42}
      ]
    }
  }'::jsonb;
$$;

create or replace function public._org_plantilla_certificado_a_json(
  p_row public.org_plantilla_certificado
)
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
    'id', p_row.id,
    'instalacionId', p_row.instalacion_organizacion_id,
    'nombre', p_row.nombre,
    'esDefault', p_row.es_default,
    'alcance', p_row.alcance,
    'autorIdentidadRef', p_row.autor_identidad_ref,
    'fondoUrl', p_row.fondo_url,
    'fondoEspecificacion', p_row.fondo_especificacion,
    'usarLogoEntidad', p_row.usar_logo_entidad,
    'logoOverrideUrl', p_row.logo_override_url,
    'layout', p_row.layout,
    'creadoEn', p_row.creado_en,
    'actualizadoEn', p_row.actualizado_en
  );
$$;

create or replace function public._org_puede_configurar_certificados(
  p_instalacion_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_flag boolean := false;
begin
  if auth.uid() is null or p_instalacion_id is null then
    return false;
  end if;
  if public.es_super_admin_actual() then
    return true;
  end if;
  if public.org_tiene_permiso(p_instalacion_id, 'certificados.configurar')
     or public.org_tiene_permiso(p_instalacion_id, 'certificados.emitir')
     or public.org_tiene_permiso(p_instalacion_id, 'equipos.administrar')
     or public.org_tiene_permiso(p_instalacion_id, 'entidad.gobernar')
  then
    return true;
  end if;

  select c.docentes_pueden_configurar into v_flag
  from public.org_config_certificados c
  where c.instalacion_organizacion_id = p_instalacion_id;

  if coalesce(v_flag, false)
     and public.org_es_miembro_instalacion(p_instalacion_id)
  then
    return true;
  end if;

  return false;
end;
$$;

create or replace function public.org_asegurar_config_certificados(
  p_instalacion_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if p_instalacion_id is null then
    raise exception 'Instalación requerida';
  end if;

  insert into public.org_config_certificados (instalacion_organizacion_id)
  values (p_instalacion_id)
  on conflict (instalacion_organizacion_id) do nothing;

  if not exists (
    select 1
    from public.org_plantilla_certificado p
    where p.instalacion_organizacion_id = p_instalacion_id
      and p.activa
  ) then
    insert into public.org_plantilla_certificado (
      instalacion_organizacion_id,
      nombre,
      es_default,
      alcance,
      layout
    ) values (
      p_instalacion_id,
      'Plantilla institucional',
      true,
      'ORGANIZACION',
      public._org_layout_certificado_default()
    )
    returning id into v_id;
  elsif not exists (
    select 1
    from public.org_plantilla_certificado p
    where p.instalacion_organizacion_id = p_instalacion_id
      and p.activa
      and p.es_default
  ) then
    update public.org_plantilla_certificado p
    set es_default = true, actualizado_en = now()
    where p.id = (
      select q.id
      from public.org_plantilla_certificado q
      where q.instalacion_organizacion_id = p_instalacion_id
        and q.activa
      order by q.creado_en
      limit 1
    );
  end if;
end;
$$;

create or replace function public.org_obtener_config_certificados(
  p_instalacion_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_flag boolean := false;
  v_items jsonb;
begin
  if auth.uid() is null then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  if p_instalacion_id is null then
    raise exception 'Instalación requerida';
  end if;
  if not public.es_super_admin_actual()
     and not public.org_es_miembro_instalacion(p_instalacion_id)
  then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  perform public.org_asegurar_config_certificados(p_instalacion_id);

  select c.docentes_pueden_configurar into v_flag
  from public.org_config_certificados c
  where c.instalacion_organizacion_id = p_instalacion_id;

  select coalesce(jsonb_agg(public._org_plantilla_certificado_a_json(p) order by p.es_default desc, p.nombre), '[]'::jsonb)
  into v_items
  from public.org_plantilla_certificado p
  where p.instalacion_organizacion_id = p_instalacion_id
    and p.activa;

  return jsonb_build_object(
    'ok', true,
    'instalacionId', p_instalacion_id,
    'docentesPuedenConfigurar', coalesce(v_flag, false),
    'plantillas', v_items,
    'actualizadoEn', now()
  );
end;
$$;

create or replace function public.org_obtener_plantilla_certificado_default(
  p_instalacion_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.org_plantilla_certificado%rowtype;
begin
  if auth.uid() is null then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  if p_instalacion_id is null then
    raise exception 'Instalación requerida';
  end if;
  -- Emisión: miembro, o superadmin (emite sin configurar).
  if not public.es_super_admin_actual()
     and not public.org_es_miembro_instalacion(p_instalacion_id)
  then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  perform public.org_asegurar_config_certificados(p_instalacion_id);

  select * into v_row
  from public.org_plantilla_certificado p
  where p.instalacion_organizacion_id = p_instalacion_id
    and p.activa
    and p.es_default
  limit 1;

  if not found then
    select * into v_row
    from public.org_plantilla_certificado p
    where p.instalacion_organizacion_id = p_instalacion_id
      and p.activa
    order by p.creado_en
    limit 1;
  end if;

  if not found then
    return jsonb_build_object('ok', true, 'plantilla', null);
  end if;

  return jsonb_build_object(
    'ok', true,
    'plantilla', public._org_plantilla_certificado_a_json(v_row)
  );
end;
$$;

create or replace function public.org_set_docentes_config_certificados(
  p_instalacion_id uuid,
  p_permitir boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  if not public._org_puede_configurar_certificados(p_instalacion_id) then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  perform public.org_asegurar_config_certificados(p_instalacion_id);

  update public.org_config_certificados
  set
    docentes_pueden_configurar = coalesce(p_permitir, false),
    actualizado_en = now()
  where instalacion_organizacion_id = p_instalacion_id;

  return public.org_obtener_config_certificados(p_instalacion_id);
end;
$$;

create or replace function public.org_upsert_plantilla_certificado(
  p_instalacion_id uuid,
  p_plantilla jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_nombre text;
  v_es_default boolean;
  v_alcance text;
  v_autor uuid;
  v_row public.org_plantilla_certificado%rowtype;
begin
  if auth.uid() is null then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  if not public._org_puede_configurar_certificados(p_instalacion_id) then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  if p_plantilla is null then
    raise exception 'Plantilla requerida';
  end if;

  perform public.org_asegurar_config_certificados(p_instalacion_id);

  begin
    v_id := nullif(trim(p_plantilla->>'id'), '')::uuid;
  exception when others then
    v_id := null;
  end;

  v_nombre := coalesce(nullif(trim(p_plantilla->>'nombre'), ''), 'Plantilla');
  v_es_default := coalesce((p_plantilla->>'esDefault')::boolean, false);
  v_alcance := upper(coalesce(nullif(trim(p_plantilla->>'alcance'), ''), 'ORGANIZACION'));
  if v_alcance not in ('ORGANIZACION', 'DOCENTE') then
    v_alcance := 'ORGANIZACION';
  end if;

  begin
    v_autor := nullif(trim(p_plantilla->>'autorIdentidadRef'), '')::uuid;
  exception when others then
    v_autor := null;
  end;
  if v_alcance = 'DOCENTE' and v_autor is null then
    v_autor := auth.uid();
  end if;

  if v_es_default then
    update public.org_plantilla_certificado
    set es_default = false, actualizado_en = now()
    where instalacion_organizacion_id = p_instalacion_id
      and activa
      and (v_id is null or id <> v_id);
  end if;

  insert into public.org_plantilla_certificado as t (
    id,
    instalacion_organizacion_id,
    nombre,
    es_default,
    alcance,
    autor_identidad_ref,
    fondo_url,
    fondo_especificacion,
    usar_logo_entidad,
    logo_override_url,
    layout,
    activa,
    actualizado_en
  ) values (
    coalesce(v_id, gen_random_uuid()),
    p_instalacion_id,
    v_nombre,
    v_es_default,
    v_alcance,
    v_autor,
    coalesce(p_plantilla->>'fondoUrl', ''),
    coalesce(
      nullif(trim(p_plantilla->>'fondoEspecificacion'), ''),
      'Imagen horizontal PNG/JPG · recomendado 3508×2480 px (A4 300 dpi) · máx. 8 MB'
    ),
    coalesce((p_plantilla->>'usarLogoEntidad')::boolean, true),
    nullif(trim(p_plantilla->>'logoOverrideUrl'), ''),
    coalesce(p_plantilla->'layout', public._org_layout_certificado_default()),
    true,
    now()
  )
  on conflict (id) do update set
    nombre = excluded.nombre,
    es_default = excluded.es_default,
    alcance = excluded.alcance,
    autor_identidad_ref = excluded.autor_identidad_ref,
    fondo_url = excluded.fondo_url,
    fondo_especificacion = excluded.fondo_especificacion,
    usar_logo_entidad = excluded.usar_logo_entidad,
    logo_override_url = excluded.logo_override_url,
    layout = excluded.layout,
    activa = true,
    actualizado_en = now()
  where t.instalacion_organizacion_id = p_instalacion_id
  returning * into v_row;

  if v_row.id is null then
    raise exception 'No se pudo guardar la plantilla';
  end if;

  return jsonb_build_object(
    'ok', true,
    'plantilla', public._org_plantilla_certificado_a_json(v_row),
    'config', public.org_obtener_config_certificados(p_instalacion_id)
  );
end;
$$;

create or replace function public.org_marcar_plantilla_certificado_default(
  p_instalacion_id uuid,
  p_plantilla_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  if not public._org_puede_configurar_certificados(p_instalacion_id) then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  if p_plantilla_id is null then
    raise exception 'Plantilla requerida';
  end if;

  update public.org_plantilla_certificado
  set es_default = false, actualizado_en = now()
  where instalacion_organizacion_id = p_instalacion_id
    and activa
    and id <> p_plantilla_id;

  update public.org_plantilla_certificado
  set es_default = true, actualizado_en = now()
  where instalacion_organizacion_id = p_instalacion_id
    and id = p_plantilla_id
    and activa;

  if not found then
    raise exception 'Plantilla no encontrada';
  end if;

  return public.org_obtener_config_certificados(p_instalacion_id);
end;
$$;

create or replace function public.org_eliminar_plantilla_certificado(
  p_instalacion_id uuid,
  p_plantilla_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_quedan int;
begin
  if auth.uid() is null then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  if not public._org_puede_configurar_certificados(p_instalacion_id) then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  select count(*) into v_quedan
  from public.org_plantilla_certificado
  where instalacion_organizacion_id = p_instalacion_id
    and activa
    and id <> p_plantilla_id;

  if v_quedan < 1 then
    raise exception 'Debe quedar al menos una plantilla activa';
  end if;

  update public.org_plantilla_certificado
  set activa = false, es_default = false, actualizado_en = now()
  where instalacion_organizacion_id = p_instalacion_id
    and id = p_plantilla_id;

  -- Asegura una default.
  if not exists (
    select 1 from public.org_plantilla_certificado
    where instalacion_organizacion_id = p_instalacion_id
      and activa and es_default
  ) then
    update public.org_plantilla_certificado
    set es_default = true, actualizado_en = now()
    where id = (
      select id from public.org_plantilla_certificado
      where instalacion_organizacion_id = p_instalacion_id and activa
      order by creado_en limit 1
    );
  end if;

  return public.org_obtener_config_certificados(p_instalacion_id);
end;
$$;

revoke all on function public.org_obtener_config_certificados(uuid) from public;
revoke all on function public.org_obtener_plantilla_certificado_default(uuid) from public;
revoke all on function public.org_set_docentes_config_certificados(uuid, boolean) from public;
revoke all on function public.org_upsert_plantilla_certificado(uuid, jsonb) from public;
revoke all on function public.org_marcar_plantilla_certificado_default(uuid, uuid) from public;
revoke all on function public.org_eliminar_plantilla_certificado(uuid, uuid) from public;
revoke all on function public.org_asegurar_config_certificados(uuid) from public;

grant execute on function public.org_obtener_config_certificados(uuid) to authenticated;
grant execute on function public.org_obtener_plantilla_certificado_default(uuid) to authenticated;
grant execute on function public.org_set_docentes_config_certificados(uuid, boolean) to authenticated;
grant execute on function public.org_upsert_plantilla_certificado(uuid, jsonb) to authenticated;
grant execute on function public.org_marcar_plantilla_certificado_default(uuid, uuid) to authenticated;
grant execute on function public.org_eliminar_plantilla_certificado(uuid, uuid) to authenticated;

commit;
