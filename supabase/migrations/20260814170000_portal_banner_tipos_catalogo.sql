-- PRINCIPAL: Catálogo real de tipos de banner (nada hardcodeado en UI).
-- Ejecutar DESPUÉS de 20260814160000_portal_banners_alumno.sql

begin;

create table if not exists public.portal_banner_tipo (
  codigo text primary key,
  nombre text not null,
  descripcion text not null default '',
  requiere_curso_ref boolean not null default false,
  orden integer not null default 0,
  activo boolean not null default true,
  constraint portal_banner_tipo_codigo_chk check (length(trim(codigo)) > 0),
  constraint portal_banner_tipo_nombre_chk check (length(trim(nombre)) > 0)
);

comment on table public.portal_banner_tipo is
  'Catálogo de tipos de slide del carrusel portal alumno (fuente de verdad en BD).';

insert into public.portal_banner_tipo (codigo, nombre, descripcion, requiere_curso_ref, orden, activo)
values
  (
    'ANUNCIO',
    'Anuncio',
    'Comunicado general (evento, novedad, aviso).',
    false,
    10,
    true
  ),
  (
    'CURSO',
    'Curso',
    'Destaca un curso: el CTA lleva al detalle o matrícula.',
    true,
    20,
    true
  ),
  (
    'INFORMACION',
    'Información',
    'Mensaje institucional o guía del portal.',
    false,
    30,
    true
  ),
  (
    'PROMO',
    'Promo',
    'Campaña o beneficio temporal.',
    false,
    40,
    true
  )
on conflict (codigo) do update set
  nombre = excluded.nombre,
  descripcion = excluded.descripcion,
  requiere_curso_ref = excluded.requiere_curso_ref,
  orden = excluded.orden,
  activo = excluded.activo;

-- Quitar CHECK fijo y enlazar FK al catálogo.
alter table public.portal_banner_alumno
  drop constraint if exists portal_banner_alumno_tipo_check;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'portal_banner_alumno_tipo_fk'
  ) then
    alter table public.portal_banner_alumno
      add constraint portal_banner_alumno_tipo_fk
      foreign key (tipo) references public.portal_banner_tipo (codigo);
  end if;
end $$;

create or replace function public.listar_tipos_banner_portal()
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

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'codigo', t.codigo,
        'nombre', t.nombre,
        'descripcion', t.descripcion,
        'requiereCursoRef', t.requiere_curso_ref,
        'orden', t.orden,
        'activo', t.activo
      )
      order by t.orden, t.codigo
    ),
    '[]'::jsonb
  )
  into v_items
  from public.portal_banner_tipo t
  where t.activo;

  return jsonb_build_object('ok', true, 'tipos', v_items);
end;
$$;

-- Validar tipo contra catálogo al guardar (reemplaza lista fija).
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

  return jsonb_build_object(
    'ok', true,
    'banner', public._portal_banner_a_json(v_row)
  );
end;
$$;

revoke all on function public.listar_tipos_banner_portal() from public;
grant execute on function public.listar_tipos_banner_portal() to authenticated;

commit;
