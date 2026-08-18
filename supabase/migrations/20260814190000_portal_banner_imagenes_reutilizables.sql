-- PRINCIPAL: Biblioteca de imágenes reutilizables del carrusel (por organización).
-- Ejecutar DESPUÉS de 20260814160000 / 170000 / 180000.

begin;

create table if not exists public.portal_banner_imagen (
  id uuid primary key default gen_random_uuid(),
  instalacion_organizacion_id uuid not null
    references public.instalacion_organizacion (id) on delete cascade,
  imagen_url text not null,
  nombre text not null default '',
  creado_en timestamptz not null default now(),
  constraint portal_banner_imagen_url_chk check (length(trim(imagen_url)) > 0)
);

create unique index if not exists portal_banner_imagen_instalacion_url_uq
  on public.portal_banner_imagen (instalacion_organizacion_id, imagen_url);

create index if not exists portal_banner_imagen_instalacion_idx
  on public.portal_banner_imagen (instalacion_organizacion_id, creado_en desc);

comment on table public.portal_banner_imagen is
  'Imágenes S3 (u URL) ya subidas para reutilizar en anuncios del portal alumno.';

-- Backfill desde banners existentes.
insert into public.portal_banner_imagen (
  instalacion_organizacion_id,
  imagen_url,
  nombre
)
select distinct
  b.instalacion_organizacion_id,
  trim(b.imagen_url),
  coalesce(nullif(trim(b.etiqueta), ''), left(trim(b.titulo), 40), 'Imagen')
from public.portal_banner_alumno b
where b.instalacion_organizacion_id is not null
  and nullif(trim(b.imagen_url), '') is not null
on conflict (instalacion_organizacion_id, imagen_url) do nothing;

create or replace function public.org_listar_imagenes_banners_portal(
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
    jsonb_agg(
      jsonb_build_object(
        'id', i.id,
        'instalacionId', i.instalacion_organizacion_id,
        'imagenUrl', i.imagen_url,
        'nombre', i.nombre,
        'creadoEn', i.creado_en
      )
      order by i.creado_en desc
    ),
    '[]'::jsonb
  )
  into v_items
  from public.portal_banner_imagen i
  where i.instalacion_organizacion_id = p_instalacion_id;

  return jsonb_build_object('ok', true, 'imagenes', v_items);
end;
$$;

create or replace function public.org_registrar_imagen_banner_portal(
  p_instalacion_id uuid,
  p_imagen_url text,
  p_nombre text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_nombre text;
  v_row public.portal_banner_imagen%rowtype;
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

  v_url := nullif(trim(p_imagen_url), '');
  if v_url is null then
    raise exception 'imagenUrl requerida';
  end if;
  v_nombre := coalesce(nullif(trim(p_nombre), ''), 'Imagen');

  insert into public.portal_banner_imagen as t (
    instalacion_organizacion_id,
    imagen_url,
    nombre
  ) values (
    p_instalacion_id,
    v_url,
    v_nombre
  )
  on conflict (instalacion_organizacion_id, imagen_url) do update set
    nombre = case
      when nullif(trim(excluded.nombre), '') is null then t.nombre
      when excluded.nombre = 'Imagen' then t.nombre
      else excluded.nombre
    end
  returning * into v_row;

  return jsonb_build_object(
    'ok', true,
    'imagen', jsonb_build_object(
      'id', v_row.id,
      'instalacionId', v_row.instalacion_organizacion_id,
      'imagenUrl', v_row.imagen_url,
      'nombre', v_row.nombre,
      'creadoEn', v_row.creado_en
    )
  );
end;
$$;

-- Al guardar un banner, registrar su imagen en la biblioteca.
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
  v_img text;
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
  if not exists (
    select 1
    from public.portal_banner_tipo t
    where t.codigo = v_tipo
      and t.activo
  ) then
    raise exception 'Tipo de banner no válido: %', v_tipo;
  end if;

  v_orden := greatest(0, coalesce((p_banner->>'orden')::int, 0));

  select count(*)::int into v_total
  from public.portal_banner_alumno
  where instalacion_organizacion_id = p_instalacion_id;

  if v_id is null and v_total >= 8 then
    raise exception 'Máximo 8 slides en el carrusel';
  end if;

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

  v_img := nullif(trim(v_row.imagen_url), '');
  if v_img is not null then
    insert into public.portal_banner_imagen (
      instalacion_organizacion_id,
      imagen_url,
      nombre
    ) values (
      p_instalacion_id,
      v_img,
      coalesce(nullif(trim(v_row.etiqueta), ''), left(v_row.titulo, 40), 'Imagen')
    )
    on conflict (instalacion_organizacion_id, imagen_url) do nothing;
  end if;

  return jsonb_build_object(
    'ok', true,
    'banner', public._portal_banner_a_json(v_row)
  );
end;
$$;

revoke all on function public.org_listar_imagenes_banners_portal(uuid) from public;
revoke all on function public.org_registrar_imagen_banner_portal(uuid, text, text) from public;
grant execute on function public.org_listar_imagenes_banners_portal(uuid) to authenticated;
grant execute on function public.org_registrar_imagen_banner_portal(uuid, text, text) to authenticated;

commit;
