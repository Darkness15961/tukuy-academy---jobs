-- Fondos de certificado reutilizables por organización (PRINCIPAL).
-- Ejecutar en el SQL Editor del proyecto PRINCIPAL (después de plantillas).

begin;

create table if not exists public.org_fondo_certificado (
  id uuid primary key default gen_random_uuid(),
  instalacion_organizacion_id uuid not null
    references public.instalacion_organizacion (id) on delete cascade,
  nombre text not null default 'Fondo',
  fondo_url text not null,
  creado_por uuid null,
  activo boolean not null default true,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create index if not exists org_fondo_certificado_instalacion_idx
  on public.org_fondo_certificado (instalacion_organizacion_id)
  where activo;

create or replace function public.org_listar_fondos_certificado(
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
        'id', f.id,
        'instalacionId', f.instalacion_organizacion_id,
        'nombre', f.nombre,
        'fondoUrl', f.fondo_url,
        'creadoEn', f.creado_en,
        'creadoPor', f.creado_por
      )
      order by f.creado_en desc
    ),
    '[]'::jsonb
  )
  into v_items
  from public.org_fondo_certificado f
  where f.instalacion_organizacion_id = p_instalacion_id
    and f.activo
    and nullif(trim(f.fondo_url), '') is not null;

  return jsonb_build_object('ok', true, 'fondos', v_items);
end;
$$;

create or replace function public.org_registrar_fondo_certificado(
  p_instalacion_id uuid,
  p_fondo_url text,
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
  v_id uuid;
  v_existente uuid;
begin
  if auth.uid() is null then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  if not public._org_puede_configurar_certificados(p_instalacion_id) then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  v_url := nullif(trim(p_fondo_url), '');
  if v_url is null then
    raise exception 'URL de fondo requerida';
  end if;
  -- No persistir data URLs enormes en BD (usar storage + URL pública).
  if left(v_url, 5) = 'data:' and length(v_url) > 4000 then
    raise exception 'Sube el fondo a almacenamiento y registra la URL pública';
  end if;

  v_nombre := coalesce(nullif(trim(p_nombre), ''), 'Fondo ' || to_char(now(), 'DD/MM/YYYY HH24:MI'));

  select f.id into v_existente
  from public.org_fondo_certificado f
  where f.instalacion_organizacion_id = p_instalacion_id
    and f.activo
    and f.fondo_url = v_url
  limit 1;

  if v_existente is not null then
    update public.org_fondo_certificado
    set nombre = v_nombre, actualizado_en = now()
    where id = v_existente
    returning id into v_id;
  else
    insert into public.org_fondo_certificado (
      instalacion_organizacion_id,
      nombre,
      fondo_url,
      creado_por
    ) values (
      p_instalacion_id,
      v_nombre,
      v_url,
      auth.uid()
    )
    returning id into v_id;
  end if;

  return public.org_listar_fondos_certificado(p_instalacion_id)
    || jsonb_build_object('fondoId', v_id);
end;
$$;

create or replace function public.org_eliminar_fondo_certificado(
  p_instalacion_id uuid,
  p_fondo_id uuid
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

  update public.org_fondo_certificado
  set activo = false, actualizado_en = now()
  where instalacion_organizacion_id = p_instalacion_id
    and id = p_fondo_id;

  return public.org_listar_fondos_certificado(p_instalacion_id);
end;
$$;

revoke all on function public.org_listar_fondos_certificado(uuid) from public;
revoke all on function public.org_registrar_fondo_certificado(uuid, text, text) from public;
revoke all on function public.org_eliminar_fondo_certificado(uuid, uuid) from public;

grant execute on function public.org_listar_fondos_certificado(uuid) to authenticated;
grant execute on function public.org_registrar_fondo_certificado(uuid, text, text) to authenticated;
grant execute on function public.org_eliminar_fondo_certificado(uuid, uuid) to authenticated;

commit;
