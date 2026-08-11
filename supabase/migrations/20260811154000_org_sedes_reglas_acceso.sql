-- WP3 · Sedes + reglas de acceso a cursos por organización (PRINCIPAL).
-- Ejecutar en el SQL Editor del proyecto PRINCIPAL.

begin;

create table if not exists public.org_sede (
  instalacion_organizacion_id uuid not null
    references public.instalacion_organizacion (id) on delete cascade,
  id text not null,
  nombre text not null,
  ciudad text not null default '',
  usuarios integer not null default 0,
  areas integer not null default 0,
  estado text not null default 'ACTIVA'
    check (estado in ('ACTIVA', 'INACTIVA')),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  primary key (instalacion_organizacion_id, id)
);

create table if not exists public.org_regla_acceso_curso (
  instalacion_organizacion_id uuid not null
    references public.instalacion_organizacion (id) on delete cascade,
  id text not null,
  curso_id text not null,
  curso_titulo text not null default '',
  publico text not null default 'TODA_LA_ENTIDAD'
    check (publico in ('TODA_LA_ENTIDAD', 'UNIDADES', 'ESPECIALIDADES', 'PERFILES')),
  publico_ids jsonb not null default '[]'::jsonb,
  incluir_descendientes boolean not null default false,
  modalidad text not null default 'LIBRE'
    check (modalidad in ('LIBRE', 'CON_APROBACION', 'SOLO_ASIGNACION', 'INVITACION')),
  cupo integer,
  estado text not null default 'ACTIVA'
    check (estado in ('ACTIVA', 'INACTIVA')),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  primary key (instalacion_organizacion_id, id)
);

create index if not exists org_regla_acceso_curso_curso_idx
  on public.org_regla_acceso_curso (instalacion_organizacion_id, curso_id);

create or replace function public.org_listar_sedes_reglas(
  p_instalacion_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sedes jsonb;
  v_reglas jsonb;
begin
  if p_instalacion_id is null
    or not public.org_es_miembro_instalacion(p_instalacion_id)
  then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', s.id,
    'nombre', s.nombre,
    'ciudad', s.ciudad,
    'usuarios', s.usuarios,
    'areas', s.areas,
    'estado', s.estado
  ) order by s.nombre), '[]'::jsonb)
  into v_sedes
  from public.org_sede s
  where s.instalacion_organizacion_id = p_instalacion_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', r.id,
    'cursoId', r.curso_id,
    'cursoTitulo', r.curso_titulo,
    'publico', r.publico,
    'publicoIds', r.publico_ids,
    'incluirDescendientes', r.incluir_descendientes,
    'modalidad', r.modalidad,
    'cupo', r.cupo,
    'estado', r.estado
  ) order by r.curso_titulo, r.id), '[]'::jsonb)
  into v_reglas
  from public.org_regla_acceso_curso r
  where r.instalacion_organizacion_id = p_instalacion_id;

  return jsonb_build_object(
    'ok', true,
    'sedes', v_sedes,
    'reglas', v_reglas
  );
end;
$$;

create or replace function public.org_guardar_sede(
  p_instalacion_id uuid,
  p_sede jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id text := coalesce(nullif(trim(p_sede->>'id'), ''), 'sede-' || replace(gen_random_uuid()::text, '-', ''));
begin
  if p_instalacion_id is null
    or not public.org_tiene_permiso(p_instalacion_id, 'equipos.administrar')
  then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  insert into public.org_sede as s (
    instalacion_organizacion_id, id, nombre, ciudad, usuarios, areas, estado, actualizado_en
  ) values (
    p_instalacion_id,
    v_id,
    coalesce(nullif(trim(p_sede->>'nombre'), ''), 'Sede'),
    coalesce(p_sede->>'ciudad', ''),
    coalesce((p_sede->>'usuarios')::int, 0),
    coalesce((p_sede->>'areas')::int, 0),
    coalesce(nullif(trim(p_sede->>'estado'), ''), 'ACTIVA'),
    now()
  )
  on conflict (instalacion_organizacion_id, id) do update set
    nombre = excluded.nombre,
    ciudad = excluded.ciudad,
    usuarios = excluded.usuarios,
    areas = excluded.areas,
    estado = excluded.estado,
    actualizado_en = now();

  return (
    select jsonb_build_object(
      'id', s.id,
      'nombre', s.nombre,
      'ciudad', s.ciudad,
      'usuarios', s.usuarios,
      'areas', s.areas,
      'estado', s.estado
    )
    from public.org_sede s
    where s.instalacion_organizacion_id = p_instalacion_id
      and s.id = v_id
  );
end;
$$;

create or replace function public.org_eliminar_sede(
  p_instalacion_id uuid,
  p_sede_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_instalacion_id is null
    or not public.org_tiene_permiso(p_instalacion_id, 'equipos.administrar')
  then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  delete from public.org_sede s
  where s.instalacion_organizacion_id = p_instalacion_id
    and s.id = p_sede_id;

  return jsonb_build_object('ok', true, 'sedeId', p_sede_id);
end;
$$;

create or replace function public.org_guardar_regla_acceso(
  p_instalacion_id uuid,
  p_regla jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id text := coalesce(nullif(trim(p_regla->>'id'), ''), 'regla-' || replace(gen_random_uuid()::text, '-', ''));
  v_curso text := nullif(trim(p_regla->>'cursoId'), '');
begin
  if p_instalacion_id is null
    or not public.org_tiene_permiso(p_instalacion_id, 'equipos.administrar')
  then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  if v_curso is null then
    raise exception 'cursoId es requerido';
  end if;

  insert into public.org_regla_acceso_curso as r (
    instalacion_organizacion_id, id, curso_id, curso_titulo, publico,
    publico_ids, incluir_descendientes, modalidad, cupo, estado, actualizado_en
  ) values (
    p_instalacion_id,
    v_id,
    v_curso,
    coalesce(p_regla->>'cursoTitulo', ''),
    coalesce(nullif(trim(p_regla->>'publico'), ''), 'TODA_LA_ENTIDAD'),
    coalesce(p_regla->'publicoIds', '[]'::jsonb),
    coalesce((p_regla->>'incluirDescendientes')::boolean, false),
    coalesce(nullif(trim(p_regla->>'modalidad'), ''), 'LIBRE'),
    nullif(p_regla->>'cupo', '')::int,
    coalesce(nullif(trim(p_regla->>'estado'), ''), 'ACTIVA'),
    now()
  )
  on conflict (instalacion_organizacion_id, id) do update set
    curso_id = excluded.curso_id,
    curso_titulo = excluded.curso_titulo,
    publico = excluded.publico,
    publico_ids = excluded.publico_ids,
    incluir_descendientes = excluded.incluir_descendientes,
    modalidad = excluded.modalidad,
    cupo = excluded.cupo,
    estado = excluded.estado,
    actualizado_en = now();

  return (
    select jsonb_build_object(
      'id', r.id,
      'cursoId', r.curso_id,
      'cursoTitulo', r.curso_titulo,
      'publico', r.publico,
      'publicoIds', r.publico_ids,
      'incluirDescendientes', r.incluir_descendientes,
      'modalidad', r.modalidad,
      'cupo', r.cupo,
      'estado', r.estado
    )
    from public.org_regla_acceso_curso r
    where r.instalacion_organizacion_id = p_instalacion_id
      and r.id = v_id
  );
end;
$$;

create or replace function public.org_eliminar_regla_acceso(
  p_instalacion_id uuid,
  p_regla_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_instalacion_id is null
    or not public.org_tiene_permiso(p_instalacion_id, 'equipos.administrar')
  then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  delete from public.org_regla_acceso_curso r
  where r.instalacion_organizacion_id = p_instalacion_id
    and r.id = p_regla_id;

  return jsonb_build_object('ok', true, 'reglaId', p_regla_id);
end;
$$;

revoke all on function public.org_listar_sedes_reglas(uuid) from public;
revoke all on function public.org_guardar_sede(uuid, jsonb) from public;
revoke all on function public.org_eliminar_sede(uuid, text) from public;
revoke all on function public.org_guardar_regla_acceso(uuid, jsonb) from public;
revoke all on function public.org_eliminar_regla_acceso(uuid, text) from public;

grant execute on function public.org_listar_sedes_reglas(uuid) to authenticated;
grant execute on function public.org_guardar_sede(uuid, jsonb) to authenticated;
grant execute on function public.org_eliminar_sede(uuid, text) to authenticated;
grant execute on function public.org_guardar_regla_acceso(uuid, jsonb) to authenticated;
grant execute on function public.org_eliminar_regla_acceso(uuid, text) to authenticated;

commit;
