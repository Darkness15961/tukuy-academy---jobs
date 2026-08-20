-- Intereses sugeridos por nodo (puente estructura ↔ categorías).
-- No embebe intereses en el nodo: relación N:M con org_categoria_curso.
-- Ejecutar en el SQL Editor del proyecto PRINCIPAL.

begin;

create table if not exists public.org_unidad_interes_sugerido (
  instalacion_organizacion_id uuid not null,
  unidad_id text not null,
  categoria_id text not null,
  peso integer not null default 1 check (peso between 1 and 5),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  primary key (instalacion_organizacion_id, unidad_id, categoria_id),
  foreign key (instalacion_organizacion_id, unidad_id)
    references public.org_unidad (instalacion_organizacion_id, id)
    on delete cascade,
  foreign key (instalacion_organizacion_id, categoria_id)
    references public.org_categoria_curso (instalacion_organizacion_id, id)
    on delete cascade
);

create index if not exists org_unidad_interes_sugerido_unidad_idx
  on public.org_unidad_interes_sugerido (instalacion_organizacion_id, unidad_id);

create index if not exists org_unidad_interes_sugerido_categoria_idx
  on public.org_unidad_interes_sugerido (instalacion_organizacion_id, categoria_id);

create or replace function public.org_listar_intereses_sugeridos_unidad(
  p_instalacion_id uuid,
  p_unidad_id text default null
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
  if p_instalacion_id is null
    or not (
      public.org_es_miembro_instalacion(p_instalacion_id)
      or public.org_tiene_permiso(p_instalacion_id, 'estructura.administrar')
      or public.org_tiene_permiso(p_instalacion_id, 'estructura.ver')
      or public.org_tiene_permiso(p_instalacion_id, 'cursos.ver')
      or public.org_tiene_permiso(p_instalacion_id, 'categorias.ver')
    )
  then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'unidadId', s.unidad_id,
      'categoriaId', s.categoria_id,
      'peso', s.peso,
      'categoriaNombre', c.nombre,
      'categoriaColor', c.color,
      'seleccionableComoInteres', c.seleccionable_como_interes
    )
    order by c.orden, c.nombre
  ), '[]'::jsonb)
  into v_items
  from public.org_unidad_interes_sugerido s
  join public.org_categoria_curso c
    on c.instalacion_organizacion_id = s.instalacion_organizacion_id
   and c.id = s.categoria_id
  where s.instalacion_organizacion_id = p_instalacion_id
    and (p_unidad_id is null or s.unidad_id = p_unidad_id)
    and c.estado = 'ACTIVA';

  return jsonb_build_object('ok', true, 'sugeridos', v_items);
end;
$$;

create or replace function public.org_guardar_intereses_sugeridos_unidad(
  p_instalacion_id uuid,
  p_unidad_id text,
  p_categoria_ids jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ids text[];
  v_id text;
begin
  if p_instalacion_id is null or nullif(trim(p_unidad_id), '') is null then
    raise exception 'Instalación y unidad requeridas';
  end if;

  if not (
    public.org_tiene_permiso(p_instalacion_id, 'estructura.administrar')
    or public.org_tiene_permiso(p_instalacion_id, 'equipos.administrar')
    or public.es_super_admin_actual()
  ) then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.org_unidad u
    where u.instalacion_organizacion_id = p_instalacion_id
      and u.id = p_unidad_id
  ) then
    raise exception 'Unidad no encontrada';
  end if;

  select coalesce(array_agg(distinct trim(x)), '{}'::text[])
  into v_ids
  from jsonb_array_elements_text(coalesce(p_categoria_ids, '[]'::jsonb)) as t(x)
  where nullif(trim(x), '') is not null;

  -- Solo categorías activas y seleccionables como interés
  v_ids := coalesce((
    select array_agg(c.id)
    from public.org_categoria_curso c
    where c.instalacion_organizacion_id = p_instalacion_id
      and c.id = any(v_ids)
      and c.estado = 'ACTIVA'
      and c.seleccionable_como_interes
  ), '{}'::text[]);

  delete from public.org_unidad_interes_sugerido s
  where s.instalacion_organizacion_id = p_instalacion_id
    and s.unidad_id = p_unidad_id
    and not (s.categoria_id = any(v_ids));

  foreach v_id in array v_ids loop
    insert into public.org_unidad_interes_sugerido (
      instalacion_organizacion_id, unidad_id, categoria_id, peso, actualizado_en
    ) values (
      p_instalacion_id, p_unidad_id, v_id, 1, now()
    )
    on conflict (instalacion_organizacion_id, unidad_id, categoria_id)
    do update set actualizado_en = now();
  end loop;

  return public.org_listar_intereses_sugeridos_unidad(p_instalacion_id, p_unidad_id);
end;
$$;

revoke all on function public.org_listar_intereses_sugeridos_unidad(uuid, text) from public;
revoke all on function public.org_guardar_intereses_sugeridos_unidad(uuid, text, jsonb) from public;
grant execute on function public.org_listar_intereses_sugeridos_unidad(uuid, text) to authenticated;
grant execute on function public.org_guardar_intereses_sugeridos_unidad(uuid, text, jsonb) to authenticated;

commit;
