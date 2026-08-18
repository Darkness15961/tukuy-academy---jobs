-- PRINCIPAL: Carrusel / banners del portal alumno (gestionados por la ORGANIZACIÓN).
-- Tipos por slide: ANUNCIO | CURSO | INFORMACION | PROMO
-- Máximo 8 slides activos por instalación.
-- Aplicar en SQL Editor del proyecto PRINCIPAL.
-- Si ya corriste una versión anterior (Admin Tukuy), vuelve a ejecutar este script completo.

begin;

create table if not exists public.portal_banner_alumno (
  id uuid primary key default gen_random_uuid(),
  instalacion_organizacion_id uuid null
    references public.instalacion_organizacion (id) on delete cascade,
  orden integer not null default 0,
  activo boolean not null default true,
  tipo text not null default 'ANUNCIO'
    check (tipo in ('ANUNCIO', 'CURSO', 'INFORMACION', 'PROMO')),
  etiqueta text not null default '',
  titulo text not null,
  subtitulo text,
  imagen_url text not null default '',
  badges jsonb not null default '[]'::jsonb,
  cta_texto text not null default 'Ver más',
  cta_url text,
  curso_ref text,
  vigencia_desde timestamptz,
  vigencia_hasta timestamptz,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint portal_banner_alumno_titulo_chk check (length(trim(titulo)) > 0)
);

-- Migración desde versión global (sin instalación).
alter table public.portal_banner_alumno
  add column if not exists instalacion_organizacion_id uuid
    references public.instalacion_organizacion (id) on delete cascade;

create index if not exists portal_banner_alumno_instalacion_orden_idx
  on public.portal_banner_alumno (instalacion_organizacion_id, activo, orden);

comment on table public.portal_banner_alumno is
  'Slides del carrusel superior del portal alumno. CRUD por organización (instalación).';

create or replace function public._portal_banner_a_json(p_row public.portal_banner_alumno)
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
    'id', p_row.id,
    'instalacionId', p_row.instalacion_organizacion_id,
    'orden', p_row.orden,
    'activo', p_row.activo,
    'tipo', p_row.tipo,
    'etiqueta', p_row.etiqueta,
    'titulo', p_row.titulo,
    'subtitulo', p_row.subtitulo,
    'imagenUrl', p_row.imagen_url,
    'badges', coalesce(p_row.badges, '[]'::jsonb),
    'ctaTexto', p_row.cta_texto,
    'ctaUrl', p_row.cta_url,
    'cursoRef', p_row.curso_ref,
    'vigenciaDesde', p_row.vigencia_desde,
    'vigenciaHasta', p_row.vigencia_hasta,
    'creadoEn', p_row.creado_en,
    'actualizadoEn', p_row.actualizado_en
  );
$$;

-- ---------------------------------------------------------------------------
-- CRUD organización
-- ---------------------------------------------------------------------------

create or replace function public.org_listar_banners_portal(
  p_instalacion_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
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

  select coalesce(
    jsonb_agg(public._portal_banner_a_json(b) order by b.orden, b.creado_en),
    '[]'::jsonb
  )
  into v_items
  from public.portal_banner_alumno b
  where b.instalacion_organizacion_id = p_instalacion_id;

  return jsonb_build_object('ok', true, 'total', jsonb_array_length(v_items), 'banners', v_items);
end;
$$;

create or replace function public.alumno_listar_banners_portal(
  p_instalacion_id uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_items jsonb;
begin
  if auth.uid() is null then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  if p_instalacion_id is null then
    return jsonb_build_object('ok', true, 'total', 0, 'banners', '[]'::jsonb);
  end if;

  -- Contenido de portada: cualquier alumno autenticado puede leer banners activos
  -- de la instalación de su contexto (no requiere rol admin de org).

  select coalesce(
    jsonb_agg(public._portal_banner_a_json(b) order by b.orden, b.creado_en),
    '[]'::jsonb
  )
  into v_items
  from public.portal_banner_alumno b
  where b.instalacion_organizacion_id = p_instalacion_id
    and b.activo
    and nullif(trim(b.imagen_url), '') is not null
    and (b.vigencia_desde is null or b.vigencia_desde <= now())
    and (b.vigencia_hasta is null or b.vigencia_hasta >= now());

  return jsonb_build_object(
    'ok', true,
    'total', jsonb_array_length(v_items),
    'banners', v_items
  );
end;
$$;

create or replace function public.org_upsert_banner_portal(
  p_instalacion_id uuid,
  p_banner jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_tipo text;
  v_orden int;
  v_total int;
  v_row public.portal_banner_alumno%rowtype;
begin
  if auth.uid() is null then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  if p_instalacion_id is null then
    raise exception 'Instalación requerida';
  end if;
  if not public.es_super_admin_actual()
     and not (
       public.org_es_miembro_instalacion(p_instalacion_id)
       and (
         public.org_tiene_permiso(p_instalacion_id, 'configuracion.editar')
         or public.org_tiene_permiso(p_instalacion_id, 'cursos.revisar')
       )
     )
  then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  if p_banner is null then
    raise exception 'Banner requerido';
  end if;

  begin
    v_id := nullif(trim(p_banner->>'id'), '')::uuid;
  exception when others then
    v_id := null;
  end;

  v_tipo := upper(coalesce(nullif(trim(p_banner->>'tipo'), ''), 'ANUNCIO'));
  if v_tipo not in ('ANUNCIO', 'CURSO', 'INFORMACION', 'PROMO') then
    v_tipo := 'ANUNCIO';
  end if;

  v_orden := greatest(0, coalesce((p_banner->>'orden')::int, 0));

  select count(*)::int into v_total
  from public.portal_banner_alumno
  where instalacion_organizacion_id = p_instalacion_id;

  if v_id is null and v_total >= 8 then
    raise exception 'Máximo 8 slides en el carrusel';
  end if;

  -- Si edita, debe pertenecer a la misma instalación.
  if v_id is not null and not exists (
    select 1 from public.portal_banner_alumno b
    where b.id = v_id and b.instalacion_organizacion_id = p_instalacion_id
  ) then
    raise exception 'Banner no pertenece a la instalación';
  end if;

  insert into public.portal_banner_alumno as t (
    id,
    instalacion_organizacion_id,
    orden,
    activo,
    tipo,
    etiqueta,
    titulo,
    subtitulo,
    imagen_url,
    badges,
    cta_texto,
    cta_url,
    curso_ref,
    vigencia_desde,
    vigencia_hasta,
    actualizado_en
  ) values (
    coalesce(v_id, gen_random_uuid()),
    p_instalacion_id,
    v_orden,
    coalesce((p_banner->>'activo')::boolean, true),
    v_tipo,
    coalesce(nullif(trim(p_banner->>'etiqueta'), ''), ''),
    coalesce(nullif(trim(p_banner->>'titulo'), ''), 'Banner'),
    nullif(trim(p_banner->>'subtitulo'), ''),
    coalesce(nullif(trim(p_banner->>'imagenUrl'), ''), ''),
    coalesce(p_banner->'badges', '[]'::jsonb),
    coalesce(nullif(trim(p_banner->>'ctaTexto'), ''), 'Ver más'),
    nullif(trim(p_banner->>'ctaUrl'), ''),
    nullif(trim(p_banner->>'cursoRef'), ''),
    nullif(p_banner->>'vigenciaDesde', '')::timestamptz,
    nullif(p_banner->>'vigenciaHasta', '')::timestamptz,
    now()
  )
  on conflict (id) do update set
    instalacion_organizacion_id = excluded.instalacion_organizacion_id,
    orden = excluded.orden,
    activo = excluded.activo,
    tipo = excluded.tipo,
    etiqueta = excluded.etiqueta,
    titulo = excluded.titulo,
    subtitulo = excluded.subtitulo,
    imagen_url = excluded.imagen_url,
    badges = excluded.badges,
    cta_texto = excluded.cta_texto,
    cta_url = excluded.cta_url,
    curso_ref = excluded.curso_ref,
    vigencia_desde = excluded.vigencia_desde,
    vigencia_hasta = excluded.vigencia_hasta,
    actualizado_en = now()
  returning * into v_row;

  return jsonb_build_object(
    'ok', true,
    'banner', public._portal_banner_a_json(v_row)
  );
end;
$$;

create or replace function public.org_eliminar_banner_portal(
  p_instalacion_id uuid,
  p_banner_id uuid
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
  if p_instalacion_id is null or p_banner_id is null then
    raise exception 'instalacionId y bannerId requeridos';
  end if;
  if not public.es_super_admin_actual()
     and not (
       public.org_es_miembro_instalacion(p_instalacion_id)
       and (
         public.org_tiene_permiso(p_instalacion_id, 'configuracion.editar')
         or public.org_tiene_permiso(p_instalacion_id, 'cursos.revisar')
       )
     )
  then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  delete from public.portal_banner_alumno
  where id = p_banner_id
    and instalacion_organizacion_id = p_instalacion_id;

  return jsonb_build_object('ok', true, 'id', p_banner_id);
end;
$$;

create or replace function public.org_reordenar_banners_portal(
  p_instalacion_id uuid,
  p_ids uuid[]
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_i int;
begin
  if auth.uid() is null then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  if p_instalacion_id is null then
    raise exception 'Instalación requerida';
  end if;
  if not public.es_super_admin_actual()
     and not (
       public.org_es_miembro_instalacion(p_instalacion_id)
       and (
         public.org_tiene_permiso(p_instalacion_id, 'configuracion.editar')
         or public.org_tiene_permiso(p_instalacion_id, 'cursos.revisar')
       )
     )
  then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  if p_ids is null then
    raise exception 'ids requeridos';
  end if;

  for v_i in 1 .. coalesce(array_length(p_ids, 1), 0) loop
    update public.portal_banner_alumno
    set orden = v_i - 1, actualizado_en = now()
    where id = p_ids[v_i]
      and instalacion_organizacion_id = p_instalacion_id;
  end loop;

  return public.org_listar_banners_portal(p_instalacion_id);
end;
$$;

-- Quitar RPCs globales de la versión Admin Tukuy (si existen).
drop function if exists public.admin_listar_banners_portal();
drop function if exists public.admin_upsert_banner_portal(jsonb);
drop function if exists public.admin_eliminar_banner_portal(uuid);
drop function if exists public.admin_reordenar_banners_portal(uuid[]);
-- Firma antigua sin parámetro.
drop function if exists public.alumno_listar_banners_portal();

revoke all on function public.org_listar_banners_portal(uuid) from public;
revoke all on function public.alumno_listar_banners_portal(uuid) from public;
revoke all on function public.org_upsert_banner_portal(uuid, jsonb) from public;
revoke all on function public.org_eliminar_banner_portal(uuid, uuid) from public;
revoke all on function public.org_reordenar_banners_portal(uuid, uuid[]) from public;

grant execute on function public.org_listar_banners_portal(uuid) to authenticated;
grant execute on function public.alumno_listar_banners_portal(uuid) to authenticated;
grant execute on function public.org_upsert_banner_portal(uuid, jsonb) to authenticated;
grant execute on function public.org_eliminar_banner_portal(uuid, uuid) to authenticated;
grant execute on function public.org_reordenar_banners_portal(uuid, uuid[]) to authenticated;

commit;
