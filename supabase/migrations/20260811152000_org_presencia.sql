-- Identidad institucional + presencia pública por organización (PRINCIPAL).
-- Ejecutar en el SQL Editor del proyecto PRINCIPAL.

begin;

create table if not exists public.org_presencia (
  instalacion_organizacion_id uuid primary key
    references public.instalacion_organizacion (id) on delete cascade,
  nombre_publico text not null default '',
  logo_url text not null default '',
  portada_url text not null default '',
  ruc text not null default '',
  dominio text not null default '',
  zona_horaria text not null default 'America/Lima',
  restringir_dominio boolean not null default false,
  requiere_dni_enrolamiento boolean not null default true,
  sector text not null default '',
  ciudad text not null default '',
  region text not null default '',
  descripcion_corta text not null default '',
  descripcion text not null default '',
  sitio_web text not null default '',
  correo_contacto text not null default '',
  etiquetas jsonb not null default '[]'::jsonb,
  tipo text not null default 'EMPRESA',
  slug text not null default '',
  verificada boolean not null default false,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create index if not exists org_presencia_nombre_idx
  on public.org_presencia (nombre_publico);

create or replace function public.org_asegurar_presencia_base(
  p_instalacion_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_nombre text;
begin
  if p_instalacion_id is null then
    raise exception 'Instalación requerida';
  end if;

  if exists (
    select 1 from public.org_presencia p
    where p.instalacion_organizacion_id = p_instalacion_id
  ) then
    return;
  end if;

  select coalesce(nullif(trim(i.nombre_organizacion), ''), 'Organización')
  into v_nombre
  from public.instalacion_organizacion i
  where i.id = p_instalacion_id;

  if v_nombre is null then
    raise exception 'Instalación no encontrada';
  end if;

  insert into public.org_presencia (
    instalacion_organizacion_id,
    nombre_publico,
    slug
  ) values (
    p_instalacion_id,
    v_nombre,
    lower(regexp_replace(v_nombre, '[^a-zA-Z0-9]+', '-', 'g'))
  );
end;
$$;

create or replace function public.org_presencia_a_json(
  p_row public.org_presencia
)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', p_row.instalacion_organizacion_id,
    'nombre', p_row.nombre_publico,
    'nombrePublico', p_row.nombre_publico,
    'logo', p_row.logo_url,
    'portada', p_row.portada_url,
    'ruc', p_row.ruc,
    'dominio', p_row.dominio,
    'zonaHoraria', p_row.zona_horaria,
    'restringirDominio', p_row.restringir_dominio,
    'requiereDniEnrolamiento', p_row.requiere_dni_enrolamiento,
    'sector', p_row.sector,
    'ciudad', p_row.ciudad,
    'region', p_row.region,
    'descripcionCorta', p_row.descripcion_corta,
    'descripcion', p_row.descripcion,
    'sitioWeb', nullif(p_row.sitio_web, ''),
    'correoContacto', p_row.correo_contacto,
    'etiquetas', coalesce(p_row.etiquetas, '[]'::jsonb),
    'tipo', p_row.tipo,
    'slug', p_row.slug,
    'verificada', p_row.verificada,
    'miembros', 0,
    'publicaciones', 0,
    'cursosActivos', 0,
    'vacantesAbiertas', 0
  );
$$;

create or replace function public.org_obtener_presencia(
  p_instalacion_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.org_presencia%rowtype;
begin
  if p_instalacion_id is null or auth.uid() is null then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  perform public.org_asegurar_presencia_base(p_instalacion_id);

  select * into v_row
  from public.org_presencia p
  where p.instalacion_organizacion_id = p_instalacion_id;

  return public.org_presencia_a_json(v_row);
end;
$$;

create or replace function public.org_guardar_presencia(
  p_instalacion_id uuid,
  p_presencia jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.org_presencia%rowtype;
  v_nombre text;
  v_slug text;
begin
  if p_instalacion_id is null
    or (
      not public.org_tiene_permiso(p_instalacion_id, 'configuracion.editar')
      and not public.org_tiene_permiso(p_instalacion_id, 'equipos.administrar')
    )
  then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  perform public.org_asegurar_presencia_base(p_instalacion_id);

  select * into v_row
  from public.org_presencia p
  where p.instalacion_organizacion_id = p_instalacion_id;

  v_nombre := coalesce(
    nullif(trim(coalesce(p_presencia->>'nombre', p_presencia->>'nombrePublico', '')), ''),
    nullif(trim(v_row.nombre_publico), ''),
    'Organización'
  );
  v_slug := coalesce(
    nullif(trim(p_presencia->>'slug'), ''),
    lower(regexp_replace(v_nombre, '[^a-zA-Z0-9]+', '-', 'g'))
  );

  update public.org_presencia p set
    nombre_publico = v_nombre,
    logo_url = coalesce(p_presencia->>'logo', v_row.logo_url, ''),
    portada_url = coalesce(p_presencia->>'portada', v_row.portada_url, ''),
    ruc = coalesce(p_presencia->>'ruc', v_row.ruc, ''),
    dominio = coalesce(p_presencia->>'dominio', v_row.dominio, ''),
    zona_horaria = coalesce(
      nullif(trim(p_presencia->>'zonaHoraria'), ''),
      v_row.zona_horaria,
      'America/Lima'
    ),
    restringir_dominio = coalesce(
      (p_presencia->>'restringirDominio')::boolean,
      v_row.restringir_dominio,
      false
    ),
    requiere_dni_enrolamiento = coalesce(
      (p_presencia->>'requiereDniEnrolamiento')::boolean,
      v_row.requiere_dni_enrolamiento,
      true
    ),
    sector = coalesce(p_presencia->>'sector', v_row.sector, ''),
    ciudad = coalesce(p_presencia->>'ciudad', v_row.ciudad, ''),
    region = coalesce(p_presencia->>'region', v_row.region, ''),
    descripcion_corta = coalesce(
      p_presencia->>'descripcionCorta',
      v_row.descripcion_corta,
      ''
    ),
    descripcion = coalesce(p_presencia->>'descripcion', v_row.descripcion, ''),
    sitio_web = coalesce(p_presencia->>'sitioWeb', v_row.sitio_web, ''),
    correo_contacto = coalesce(
      p_presencia->>'correoContacto',
      v_row.correo_contacto,
      ''
    ),
    etiquetas = case
      when jsonb_typeof(p_presencia->'etiquetas') = 'array' then p_presencia->'etiquetas'
      else coalesce(v_row.etiquetas, '[]'::jsonb)
    end,
    tipo = coalesce(nullif(trim(p_presencia->>'tipo'), ''), v_row.tipo, 'EMPRESA'),
    slug = v_slug,
    actualizado_en = now()
  where p.instalacion_organizacion_id = p_instalacion_id
  returning * into v_row;

  update public.instalacion_organizacion i
  set
    nombre_organizacion = v_nombre,
    actualizada_en = now(),
    version_registro = coalesce(i.version_registro, 0) + 1
  where i.id = p_instalacion_id;

  return public.org_presencia_a_json(v_row);
end;
$$;

create or replace function public.org_listar_presencias_publicas()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_items jsonb;
begin
  if auth.uid() is null then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  -- Asegura ficha mínima para instalaciones activas sin presencia.
  insert into public.org_presencia (
    instalacion_organizacion_id, nombre_publico, slug
  )
  select
    i.id,
    coalesce(nullif(trim(i.nombre_organizacion), ''), 'Organización'),
    lower(regexp_replace(
      coalesce(nullif(trim(i.nombre_organizacion), ''), 'organizacion'),
      '[^a-zA-Z0-9]+', '-', 'g'
    ))
  from public.instalacion_organizacion i
  where i.estado::text = 'ACTIVA'
    and not exists (
      select 1 from public.org_presencia p
      where p.instalacion_organizacion_id = i.id
    );

  select coalesce(jsonb_agg(public.org_presencia_a_json(p) order by p.nombre_publico), '[]'::jsonb)
  into v_items
  from public.org_presencia p
  join public.instalacion_organizacion i
    on i.id = p.instalacion_organizacion_id
  where i.estado::text = 'ACTIVA';

  return jsonb_build_object('ok', true, 'entidades', v_items);
end;
$$;

revoke all on function public.org_asegurar_presencia_base(uuid) from public;
revoke all on function public.org_presencia_a_json(public.org_presencia) from public;
revoke all on function public.org_obtener_presencia(uuid) from public;
revoke all on function public.org_guardar_presencia(uuid, jsonb) from public;
revoke all on function public.org_listar_presencias_publicas() from public;

grant execute on function public.org_obtener_presencia(uuid) to authenticated;
grant execute on function public.org_guardar_presencia(uuid, jsonb) to authenticated;
grant execute on function public.org_listar_presencias_publicas() to authenticated;

commit;
