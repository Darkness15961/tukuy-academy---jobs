-- PRINCIPAL: filtro de imagen en el anuncio + galería privada por usuario.
-- SQL Editor del proyecto PRINCIPAL (nidkyztqapeqdplzvnkc).

begin;

alter table public.portal_banner_alumno
  add column if not exists filtro_imagen text not null default 'clasico';

comment on column public.portal_banner_alumno.filtro_imagen is
  'Estilo de overlay sobre la foto: ninguno | clasico | suave | …';

alter table public.portal_banner_imagen
  add column if not exists creado_por uuid;

comment on column public.portal_banner_imagen.creado_por is
  'auth.users.id de quien subió la imagen. La galería solo lista las propias.';

-- Dueño desde la ruta S3: anuncios-portal/{org}/{userId}/archivo
update public.portal_banner_imagen
set creado_por = substring(
  imagen_url
  from 'anuncios-portal/[^/]+/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/'
)::uuid
where creado_por is null
  and imagen_url ~* 'anuncios-portal/[^/]+/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/';

-- Índice único legacy (instalación + url, sin dueño).
drop index if exists public.portal_banner_imagen_instalacion_url_uq;

alter table public.portal_banner_imagen
  drop constraint if exists portal_banner_imagen_instalacion_url_uq;

-- La restricción dueno_url_uq posee el índice homónimo: drop constraint, no drop index.
alter table public.portal_banner_imagen
  drop constraint if exists portal_banner_imagen_dueno_url_uq;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'portal_banner_imagen_dueno_url_uq'
      and conrelid = 'public.portal_banner_imagen'::regclass
  ) then
    alter table public.portal_banner_imagen
      add constraint portal_banner_imagen_dueno_url_uq
      unique (instalacion_organizacion_id, creado_por, imagen_url);
  end if;
end $$;

create index if not exists portal_banner_imagen_dueno_idx
  on public.portal_banner_imagen (instalacion_organizacion_id, creado_por, creado_en desc);

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
    'filtroImagen', coalesce(nullif(trim(p_row.filtro_imagen), ''), 'clasico'),
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
        'creadoEn', i.creado_en,
        'creadoPor', i.creado_por
      )
      order by i.creado_en desc
    ),
    '[]'::jsonb
  )
  into v_items
  from public.portal_banner_imagen i
  where i.instalacion_organizacion_id = p_instalacion_id
    and i.creado_por = auth.uid();

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
    nombre,
    creado_por
  ) values (
    p_instalacion_id,
    v_url,
    v_nombre,
    auth.uid()
  )
  on conflict (instalacion_organizacion_id, creado_por, imagen_url) do update set
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
      'creadoEn', v_row.creado_en,
      'creadoPor', v_row.creado_por
    )
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
  v_img text;
  v_filtro text;
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
  v_filtro := lower(coalesce(nullif(trim(p_banner->>'filtroImagen'), ''), 'clasico'));
  if length(v_filtro) > 32 then
    v_filtro := 'clasico';
  end if;

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
    filtro_imagen,
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
    v_filtro,
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
    filtro_imagen = excluded.filtro_imagen,
    badges = excluded.badges,
    cta_texto = excluded.cta_texto,
    cta_url = excluded.cta_url,
    curso_ref = excluded.curso_ref,
    vigencia_desde = excluded.vigencia_desde,
    vigencia_hasta = excluded.vigencia_hasta,
    actualizado_en = now()
  returning * into v_row;

  v_img := nullif(trim(v_row.imagen_url), '');
  if v_img is not null and auth.uid() is not null then
    insert into public.portal_banner_imagen (
      instalacion_organizacion_id,
      imagen_url,
      nombre,
      creado_por
    ) values (
      p_instalacion_id,
      v_img,
      coalesce(nullif(trim(v_row.etiqueta), ''), left(v_row.titulo, 40), 'Imagen'),
      auth.uid()
    )
    on conflict (instalacion_organizacion_id, creado_por, imagen_url) do nothing;
  end if;

  return jsonb_build_object(
    'ok', true,
    'banner', public._portal_banner_a_json(v_row)
  );
end;
$$;

commit;
