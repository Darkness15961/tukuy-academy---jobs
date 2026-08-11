-- WP4 · Asignaciones de formación + rutas de aprendizaje por organización (PRINCIPAL).
-- Ejecutar en el SQL Editor del proyecto PRINCIPAL.

begin;

create table if not exists public.org_asignacion (
  instalacion_organizacion_id uuid not null
    references public.instalacion_organizacion (id) on delete cascade,
  id text not null,
  curso_id text not null default '',
  curso_titulo text not null,
  destino_label text not null default '',
  destino_unidad_id text,
  incluir_descendientes boolean not null default true,
  asignados integer not null default 0,
  completados integer not null default 0,
  vence text not null default 'Sin fecha límite',
  obligatorio boolean not null default false,
  estado text not null default 'ACTIVA'
    check (estado in ('ACTIVA', 'FINALIZADA', 'CANCELADA')),
  creada_en text not null default to_char(now() at time zone 'UTC', 'YYYY-MM-DD'),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  primary key (instalacion_organizacion_id, id)
);

create index if not exists org_asignacion_curso_idx
  on public.org_asignacion (instalacion_organizacion_id, curso_id);

create index if not exists org_asignacion_estado_idx
  on public.org_asignacion (instalacion_organizacion_id, estado);

create table if not exists public.org_ruta (
  instalacion_organizacion_id uuid not null
    references public.instalacion_organizacion (id) on delete cascade,
  id text not null,
  nombre text not null,
  descripcion text not null default '',
  imagen text not null default '',
  cursos_count integer not null default 0,
  cursos_seleccionados jsonb not null default '[]'::jsonb,
  usuarios integer not null default 0,
  progreso integer not null default 0,
  certificado boolean not null default false,
  precio numeric(12, 2),
  gratuito boolean not null default false,
  moneda text not null default 'PEN'
    check (moneda in ('PEN', 'USD')),
  alcance text not null default 'ORGANIZACION'
    check (alcance in ('ORGANIZACION', 'AREA', 'EXTERNO', 'TODOS')),
  destino_area text,
  descuento_interno numeric(5, 2),
  descuento_aplica_a text,
  descuento_area text,
  politica_descuentos jsonb,
  descuentos jsonb not null default '[]'::jsonb,
  estado text not null default 'BORRADOR'
    check (estado in ('BORRADOR', 'PUBLICADA', 'ARCHIVADA')),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  primary key (instalacion_organizacion_id, id)
);

create index if not exists org_ruta_estado_idx
  on public.org_ruta (instalacion_organizacion_id, estado);

create or replace function public.org_listar_asignaciones_rutas(
  p_instalacion_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_asignaciones jsonb;
  v_rutas jsonb;
begin
  if p_instalacion_id is null
    or not public.org_es_miembro_instalacion(p_instalacion_id)
  then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', a.id,
    'cursoId', nullif(a.curso_id, ''),
    'curso', a.curso_titulo,
    'destino', a.destino_label,
    'destinoUnidadId', a.destino_unidad_id,
    'incluirDescendientes', a.incluir_descendientes,
    'asignados', a.asignados,
    'completados', a.completados,
    'vence', a.vence,
    'obligatorio', a.obligatorio,
    'estado', a.estado,
    'creadaEn', a.creada_en
  ) order by a.creado_en desc, a.id), '[]'::jsonb)
  into v_asignaciones
  from public.org_asignacion a
  where a.instalacion_organizacion_id = p_instalacion_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', r.id,
    'nombre', r.nombre,
    'descripcion', nullif(r.descripcion, ''),
    'imagen', nullif(r.imagen, ''),
    'cursos', r.cursos_count,
    'cursosSeleccionados', r.cursos_seleccionados,
    'usuarios', r.usuarios,
    'progreso', r.progreso,
    'certificado', r.certificado,
    'precio', r.precio,
    'gratuito', r.gratuito,
    'moneda', r.moneda,
    'alcance', r.alcance,
    'destinoArea', r.destino_area,
    'descuentoInterno', r.descuento_interno,
    'descuentoAplicaA', r.descuento_aplica_a,
    'descuentoArea', r.descuento_area,
    'politicaDescuentos', r.politica_descuentos,
    'descuentos', r.descuentos,
    'estado', r.estado
  ) order by r.nombre, r.id), '[]'::jsonb)
  into v_rutas
  from public.org_ruta r
  where r.instalacion_organizacion_id = p_instalacion_id;

  return jsonb_build_object(
    'ok', true,
    'asignaciones', v_asignaciones,
    'rutas', v_rutas
  );
end;
$$;

create or replace function public.org_guardar_asignacion(
  p_instalacion_id uuid,
  p_asignacion jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id text := coalesce(
    nullif(trim(p_asignacion->>'id'), ''),
    'asig-' || replace(gen_random_uuid()::text, '-', '')
  );
  v_curso text := coalesce(
    nullif(trim(p_asignacion->>'curso'), ''),
    nullif(trim(p_asignacion->>'cursoTitulo'), ''),
    'Curso'
  );
begin
  if p_instalacion_id is null
    or not (
      public.org_tiene_permiso(p_instalacion_id, 'asignaciones.crear')
      or public.org_tiene_permiso(p_instalacion_id, 'asignaciones.ver')
      or public.org_tiene_permiso(p_instalacion_id, 'equipos.administrar')
    )
  then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  insert into public.org_asignacion as a (
    instalacion_organizacion_id, id, curso_id, curso_titulo, destino_label,
    destino_unidad_id, incluir_descendientes, asignados, completados, vence,
    obligatorio, estado, creada_en, actualizado_en
  ) values (
    p_instalacion_id,
    v_id,
    coalesce(p_asignacion->>'cursoId', ''),
    v_curso,
    coalesce(p_asignacion->>'destino', ''),
    nullif(trim(p_asignacion->>'destinoUnidadId'), ''),
    coalesce((p_asignacion->>'incluirDescendientes')::boolean, true),
    coalesce((p_asignacion->>'asignados')::int, 0),
    coalesce((p_asignacion->>'completados')::int, 0),
    coalesce(nullif(trim(p_asignacion->>'vence'), ''), 'Sin fecha límite'),
    coalesce((p_asignacion->>'obligatorio')::boolean, false),
    coalesce(nullif(trim(p_asignacion->>'estado'), ''), 'ACTIVA'),
    coalesce(
      nullif(trim(p_asignacion->>'creadaEn'), ''),
      to_char(now() at time zone 'UTC', 'YYYY-MM-DD')
    ),
    now()
  )
  on conflict (instalacion_organizacion_id, id) do update set
    curso_id = excluded.curso_id,
    curso_titulo = excluded.curso_titulo,
    destino_label = excluded.destino_label,
    destino_unidad_id = excluded.destino_unidad_id,
    incluir_descendientes = excluded.incluir_descendientes,
    asignados = excluded.asignados,
    completados = excluded.completados,
    vence = excluded.vence,
    obligatorio = excluded.obligatorio,
    estado = excluded.estado,
    creada_en = excluded.creada_en,
    actualizado_en = now();

  return (
    select jsonb_build_object(
      'id', a.id,
      'cursoId', nullif(a.curso_id, ''),
      'curso', a.curso_titulo,
      'destino', a.destino_label,
      'destinoUnidadId', a.destino_unidad_id,
      'incluirDescendientes', a.incluir_descendientes,
      'asignados', a.asignados,
      'completados', a.completados,
      'vence', a.vence,
      'obligatorio', a.obligatorio,
      'estado', a.estado,
      'creadaEn', a.creada_en
    )
    from public.org_asignacion a
    where a.instalacion_organizacion_id = p_instalacion_id
      and a.id = v_id
  );
end;
$$;

create or replace function public.org_eliminar_asignacion(
  p_instalacion_id uuid,
  p_asignacion_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_instalacion_id is null
    or not (
      public.org_tiene_permiso(p_instalacion_id, 'asignaciones.crear')
      or public.org_tiene_permiso(p_instalacion_id, 'equipos.administrar')
    )
  then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  delete from public.org_asignacion a
  where a.instalacion_organizacion_id = p_instalacion_id
    and a.id = p_asignacion_id;

  return jsonb_build_object('ok', true, 'asignacionId', p_asignacion_id);
end;
$$;

create or replace function public.org_guardar_ruta(
  p_instalacion_id uuid,
  p_ruta jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id text := coalesce(
    nullif(trim(p_ruta->>'id'), ''),
    'ruta-' || replace(gen_random_uuid()::text, '-', '')
  );
  v_cursos jsonb := coalesce(p_ruta->'cursosSeleccionados', '[]'::jsonb);
  v_count int;
begin
  if p_instalacion_id is null
    or not (
      public.org_tiene_permiso(p_instalacion_id, 'rutas.administrar')
      or public.org_tiene_permiso(p_instalacion_id, 'equipos.administrar')
    )
  then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  if nullif(trim(coalesce(p_ruta->>'cursos', '')), '') is not null then
    v_count := (p_ruta->>'cursos')::int;
  else
    v_count := jsonb_array_length(v_cursos);
  end if;

  insert into public.org_ruta as r (
    instalacion_organizacion_id, id, nombre, descripcion, imagen,
    cursos_count, cursos_seleccionados, usuarios, progreso, certificado,
    precio, gratuito, moneda, alcance, destino_area,
    descuento_interno, descuento_aplica_a, descuento_area,
    politica_descuentos, descuentos, estado, actualizado_en
  ) values (
    p_instalacion_id,
    v_id,
    coalesce(nullif(trim(p_ruta->>'nombre'), ''), 'Ruta'),
    coalesce(p_ruta->>'descripcion', ''),
    coalesce(p_ruta->>'imagen', ''),
    v_count,
    v_cursos,
    coalesce((p_ruta->>'usuarios')::int, 0),
    coalesce((p_ruta->>'progreso')::int, 0),
    coalesce((p_ruta->>'certificado')::boolean, false),
    nullif(p_ruta->>'precio', '')::numeric,
    coalesce((p_ruta->>'gratuito')::boolean, false),
    coalesce(nullif(trim(p_ruta->>'moneda'), ''), 'PEN'),
    coalesce(nullif(trim(p_ruta->>'alcance'), ''), 'ORGANIZACION'),
    nullif(trim(p_ruta->>'destinoArea'), ''),
    nullif(p_ruta->>'descuentoInterno', '')::numeric,
    nullif(trim(p_ruta->>'descuentoAplicaA'), ''),
    nullif(trim(p_ruta->>'descuentoArea'), ''),
    p_ruta->'politicaDescuentos',
    coalesce(p_ruta->'descuentos', '[]'::jsonb),
    coalesce(nullif(trim(p_ruta->>'estado'), ''), 'BORRADOR'),
    now()
  )
  on conflict (instalacion_organizacion_id, id) do update set
    nombre = excluded.nombre,
    descripcion = excluded.descripcion,
    imagen = excluded.imagen,
    cursos_count = excluded.cursos_count,
    cursos_seleccionados = excluded.cursos_seleccionados,
    usuarios = excluded.usuarios,
    progreso = excluded.progreso,
    certificado = excluded.certificado,
    precio = excluded.precio,
    gratuito = excluded.gratuito,
    moneda = excluded.moneda,
    alcance = excluded.alcance,
    destino_area = excluded.destino_area,
    descuento_interno = excluded.descuento_interno,
    descuento_aplica_a = excluded.descuento_aplica_a,
    descuento_area = excluded.descuento_area,
    politica_descuentos = excluded.politica_descuentos,
    descuentos = excluded.descuentos,
    estado = excluded.estado,
    actualizado_en = now();

  return (
    select jsonb_build_object(
      'id', r.id,
      'nombre', r.nombre,
      'descripcion', nullif(r.descripcion, ''),
      'imagen', nullif(r.imagen, ''),
      'cursos', r.cursos_count,
      'cursosSeleccionados', r.cursos_seleccionados,
      'usuarios', r.usuarios,
      'progreso', r.progreso,
      'certificado', r.certificado,
      'precio', r.precio,
      'gratuito', r.gratuito,
      'moneda', r.moneda,
      'alcance', r.alcance,
      'destinoArea', r.destino_area,
      'descuentoInterno', r.descuento_interno,
      'descuentoAplicaA', r.descuento_aplica_a,
      'descuentoArea', r.descuento_area,
      'politicaDescuentos', r.politica_descuentos,
      'descuentos', r.descuentos,
      'estado', r.estado
    )
    from public.org_ruta r
    where r.instalacion_organizacion_id = p_instalacion_id
      and r.id = v_id
  );
end;
$$;

create or replace function public.org_eliminar_ruta(
  p_instalacion_id uuid,
  p_ruta_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_instalacion_id is null
    or not (
      public.org_tiene_permiso(p_instalacion_id, 'rutas.administrar')
      or public.org_tiene_permiso(p_instalacion_id, 'equipos.administrar')
    )
  then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  delete from public.org_ruta r
  where r.instalacion_organizacion_id = p_instalacion_id
    and r.id = p_ruta_id;

  return jsonb_build_object('ok', true, 'rutaId', p_ruta_id);
end;
$$;

revoke all on function public.org_listar_asignaciones_rutas(uuid) from public;
revoke all on function public.org_guardar_asignacion(uuid, jsonb) from public;
revoke all on function public.org_eliminar_asignacion(uuid, text) from public;
revoke all on function public.org_guardar_ruta(uuid, jsonb) from public;
revoke all on function public.org_eliminar_ruta(uuid, text) from public;

grant execute on function public.org_listar_asignaciones_rutas(uuid) to authenticated;
grant execute on function public.org_guardar_asignacion(uuid, jsonb) to authenticated;
grant execute on function public.org_eliminar_asignacion(uuid, text) to authenticated;
grant execute on function public.org_guardar_ruta(uuid, jsonb) to authenticated;
grant execute on function public.org_eliminar_ruta(uuid, text) to authenticated;

commit;
