-- Categorías de cursos por organización (PRINCIPAL).
-- Ejecutar en el SQL Editor del proyecto PRINCIPAL.

begin;

create table if not exists public.org_categoria_curso (
  instalacion_organizacion_id uuid not null
    references public.instalacion_organizacion (id) on delete cascade,
  id text not null,
  nombre text not null,
  descripcion text not null default '',
  color text not null default '#0B3A78',
  visible_en_catalogo boolean not null default true,
  seleccionable_como_interes boolean not null default true,
  orden integer not null default 1,
  estado text not null default 'ACTIVA'
    check (estado in ('ACTIVA', 'INACTIVA')),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  primary key (instalacion_organizacion_id, id),
  unique (instalacion_organizacion_id, nombre)
);

create index if not exists org_categoria_curso_estado_idx
  on public.org_categoria_curso (instalacion_organizacion_id, estado, orden);

create or replace function public.org_categoria_a_json(
  p_row public.org_categoria_curso
)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', p_row.id,
    'organizacionId', p_row.instalacion_organizacion_id,
    'nombre', p_row.nombre,
    'descripcion', p_row.descripcion,
    'color', p_row.color,
    'visibleEnCatalogo', p_row.visible_en_catalogo,
    'seleccionableComoInteres', p_row.seleccionable_como_interes,
    'orden', p_row.orden,
    'estado', p_row.estado
  );
$$;

create or replace function public.org_listar_categorias_cursos(
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
  if p_instalacion_id is null
    or not (
      public.org_es_miembro_instalacion(p_instalacion_id)
      or public.org_tiene_permiso(p_instalacion_id, 'categorias.gestionar')
      or public.org_tiene_permiso(p_instalacion_id, 'categorias.ver')
      or public.org_tiene_permiso(p_instalacion_id, 'cursos.ver')
    )
  then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  select coalesce(
    jsonb_agg(public.org_categoria_a_json(c) order by c.orden, c.nombre),
    '[]'::jsonb
  )
  into v_items
  from public.org_categoria_curso c
  where c.instalacion_organizacion_id = p_instalacion_id;

  return jsonb_build_object('ok', true, 'categorias', v_items);
end;
$$;

-- Catálogo público (comunidad): solo activas visibles.
create or replace function public.org_listar_categorias_catalogo(
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
  if p_instalacion_id is null then
    raise exception 'Instalación requerida';
  end if;

  if not exists (
    select 1
    from public.instalacion_organizacion i
    where i.id = p_instalacion_id
  ) then
    raise exception 'La instalación indicada no existe.';
  end if;

  select coalesce(
    jsonb_agg(public.org_categoria_a_json(c) order by c.orden, c.nombre),
    '[]'::jsonb
  )
  into v_items
  from public.org_categoria_curso c
  where c.instalacion_organizacion_id = p_instalacion_id
    and c.estado = 'ACTIVA'
    and c.visible_en_catalogo;

  return jsonb_build_object('ok', true, 'categorias', v_items);
end;
$$;

create or replace function public.org_guardar_categoria_curso(
  p_instalacion_id uuid,
  p_categoria jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id text := coalesce(
    nullif(trim(p_categoria->>'id'), ''),
    'cat-' || replace(gen_random_uuid()::text, '-', '')
  );
  v_nombre text := nullif(trim(p_categoria->>'nombre'), '');
  v_estado text := upper(coalesce(nullif(trim(p_categoria->>'estado'), ''), 'ACTIVA'));
  v_orden integer;
  v_row public.org_categoria_curso;
begin
  if p_instalacion_id is null
    or not (
      public.org_tiene_permiso(p_instalacion_id, 'categorias.gestionar')
      or public.org_tiene_permiso(p_instalacion_id, 'cursos.editar')
      or public.org_tiene_permiso(p_instalacion_id, 'cursos.aprobar')
    )
  then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  if v_nombre is null then
    raise exception 'El nombre es obligatorio.';
  end if;

  if v_estado not in ('ACTIVA', 'INACTIVA') then
    v_estado := 'ACTIVA';
  end if;

  v_orden := coalesce(
    nullif(p_categoria->>'orden', '')::integer,
    (
      select coalesce(max(c.orden), 0) + 1
      from public.org_categoria_curso c
      where c.instalacion_organizacion_id = p_instalacion_id
    )
  );

  if exists (
    select 1
    from public.org_categoria_curso c
    where c.instalacion_organizacion_id = p_instalacion_id
      and lower(c.nombre) = lower(v_nombre)
      and c.id <> v_id
  ) then
    raise exception 'Ya existe una categoría con ese nombre.';
  end if;

  insert into public.org_categoria_curso as c (
    instalacion_organizacion_id,
    id,
    nombre,
    descripcion,
    color,
    visible_en_catalogo,
    seleccionable_como_interes,
    orden,
    estado,
    actualizado_en
  ) values (
    p_instalacion_id,
    v_id,
    v_nombre,
    coalesce(nullif(trim(p_categoria->>'descripcion'), ''), ''),
    coalesce(nullif(trim(p_categoria->>'color'), ''), '#0B3A78'),
    coalesce((p_categoria->>'visibleEnCatalogo')::boolean, true),
    coalesce((p_categoria->>'seleccionableComoInteres')::boolean, true),
    v_orden,
    v_estado,
    now()
  )
  on conflict (instalacion_organizacion_id, id) do update set
    nombre = excluded.nombre,
    descripcion = excluded.descripcion,
    color = excluded.color,
    visible_en_catalogo = excluded.visible_en_catalogo,
    seleccionable_como_interes = excluded.seleccionable_como_interes,
    orden = excluded.orden,
    estado = excluded.estado,
    actualizado_en = now()
  returning * into v_row;

  return public.org_categoria_a_json(v_row);
end;
$$;

create or replace function public.org_eliminar_categoria_curso(
  p_instalacion_id uuid,
  p_categoria_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_nombre text;
  v_usos bigint := 0;
begin
  if p_instalacion_id is null
    or nullif(trim(p_categoria_id), '') is null
    or not (
      public.org_tiene_permiso(p_instalacion_id, 'categorias.gestionar')
      or public.org_tiene_permiso(p_instalacion_id, 'cursos.editar')
      or public.org_tiene_permiso(p_instalacion_id, 'cursos.aprobar')
    )
  then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  select c.nombre into v_nombre
  from public.org_categoria_curso c
  where c.instalacion_organizacion_id = p_instalacion_id
    and c.id = p_categoria_id;
  if not found then
    raise exception 'No se encontró la categoría.';
  end if;

  -- Evitar borrar si el catálogo tipado aún referencia el nombre (texto libre).
  if to_regclass('public.curso_catalogo') is not null then
    select count(*) into v_usos
    from public.curso_catalogo cc
    where cc.instalacion_proveedora_id = p_instalacion_id
      and cc.estado_publicacion::text <> 'RETIRADO'
      and (
        lower(coalesce(cc.datos_historicos->>'categoria', '')) = lower(v_nombre)
        or lower(coalesce(cc.datos_historicos->>'categoriaNombre', '')) = lower(v_nombre)
        or exists (
          select 1
          from jsonb_array_elements_text(
            coalesce(cc.datos_historicos->'categoriaIds', '[]'::jsonb)
          ) x
          where x = p_categoria_id
        )
      );
  end if;

  if coalesce(v_usos, 0) > 0 then
    raise exception
      'No se puede eliminar: hay cursos con esta categoría. Desactívala o reasigna los cursos.';
  end if;

  delete from public.org_categoria_curso c
  where c.instalacion_organizacion_id = p_instalacion_id
    and c.id = p_categoria_id;

  return jsonb_build_object('ok', true, 'id', p_categoria_id);
end;
$$;

revoke all on function public.org_categoria_a_json(public.org_categoria_curso)
  from public;
revoke all on function public.org_listar_categorias_cursos(uuid) from public;
revoke all on function public.org_listar_categorias_catalogo(uuid) from public;
revoke all on function public.org_guardar_categoria_curso(uuid, jsonb) from public;
revoke all on function public.org_eliminar_categoria_curso(uuid, text) from public;

grant execute on function public.org_listar_categorias_cursos(uuid) to authenticated;
grant execute on function public.org_listar_categorias_catalogo(uuid) to authenticated;
grant execute on function public.org_listar_categorias_catalogo(uuid) to anon;
grant execute on function public.org_guardar_categoria_curso(uuid, jsonb) to authenticated;
grant execute on function public.org_eliminar_categoria_curso(uuid, text) to authenticated;

commit;
