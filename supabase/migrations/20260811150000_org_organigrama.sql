-- Organigrama institucional (portal organización).
-- Ejecutar en el SQL Editor del proyecto PRINCIPAL.
-- Persiste estructuras, niveles, tipos, unidades, políticas y vinculaciones.

begin;

-- ---------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------

create table if not exists public.org_estructura (
  instalacion_organizacion_id uuid not null
    references public.instalacion_organizacion (id) on delete cascade,
  id text not null,
  nombre text not null,
  descripcion text,
  tipo text not null
    check (tipo in ('FUNCIONAL', 'TERRITORIAL', 'PROYECTOS', 'GOBIERNO', 'PERSONALIZADA')),
  modo_jerarquia text not null default 'FLEXIBLE'
    check (modo_jerarquia in ('ESTRICTA', 'FLEXIBLE')),
  es_sistema boolean not null default false,
  estado text not null default 'ACTIVA'
    check (estado in ('ACTIVA', 'INACTIVA')),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  primary key (instalacion_organizacion_id, id)
);

create table if not exists public.org_nivel_estructura (
  instalacion_organizacion_id uuid not null,
  id text not null,
  estructura_id text not null,
  nombre text not null,
  orden integer not null check (orden > 0),
  estado text not null default 'ACTIVO'
    check (estado in ('ACTIVO', 'INACTIVO')),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  primary key (instalacion_organizacion_id, id),
  foreign key (instalacion_organizacion_id, estructura_id)
    references public.org_estructura (instalacion_organizacion_id, id)
    on delete cascade
);

create unique index if not exists org_nivel_estructura_orden_uq
  on public.org_nivel_estructura (instalacion_organizacion_id, estructura_id, orden)
  where estado = 'ACTIVO';

create table if not exists public.org_tipo_unidad (
  instalacion_organizacion_id uuid not null
    references public.instalacion_organizacion (id) on delete cascade,
  id text not null,
  nombre_singular text not null,
  nombre_plural text not null,
  descripcion text,
  color text not null default '#0B3A78',
  permite_subunidades boolean not null default true,
  estado text not null default 'ACTIVO'
    check (estado in ('ACTIVO', 'INACTIVO')),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  primary key (instalacion_organizacion_id, id)
);

create table if not exists public.org_politica_incorporacion (
  instalacion_organizacion_id uuid not null
    references public.instalacion_organizacion (id) on delete cascade,
  id text not null,
  nombre text not null,
  modalidad text not null
    check (modalidad in (
      'AUTOMATICA', 'CON_APROBACION', 'ASIGNACION_ADMIN', 'ABIERTA'
    )),
  capacidad_maxima integer,
  especialidades_permitidas jsonb not null default '[]'::jsonb,
  requiere_colegiatura_activa boolean not null default false,
  estado text not null default 'ACTIVA'
    check (estado in ('ACTIVA', 'INACTIVA')),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  primary key (instalacion_organizacion_id, id)
);

create table if not exists public.org_unidad (
  instalacion_organizacion_id uuid not null,
  id text not null,
  nombre text not null,
  descripcion text,
  codigo text,
  tipo_unidad_id text not null,
  estructura_id text,
  nivel_id text,
  unidad_padre_id text,
  codigo_sistema text
    check (
      codigo_sistema is null
      or codigo_sistema in ('DIRECCION', 'ADMINISTRACION', 'CERTIFICACION')
    ),
  es_sistema boolean not null default false,
  responsable_identidad_ref text,
  politica_incorporacion_id text,
  permite_subunidades boolean,
  orden integer not null default 1 check (orden > 0),
  estado text not null default 'ACTIVA'
    check (estado in ('ACTIVA', 'INACTIVA')),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  primary key (instalacion_organizacion_id, id),
  foreign key (instalacion_organizacion_id, tipo_unidad_id)
    references public.org_tipo_unidad (instalacion_organizacion_id, id),
  foreign key (instalacion_organizacion_id, estructura_id)
    references public.org_estructura (instalacion_organizacion_id, id)
    on delete set null,
  foreign key (instalacion_organizacion_id, nivel_id)
    references public.org_nivel_estructura (instalacion_organizacion_id, id)
    on delete set null,
  foreign key (instalacion_organizacion_id, unidad_padre_id)
    references public.org_unidad (instalacion_organizacion_id, id)
    on delete restrict,
  foreign key (instalacion_organizacion_id, politica_incorporacion_id)
    references public.org_politica_incorporacion (instalacion_organizacion_id, id)
    on delete set null
);

create index if not exists org_unidad_estructura_idx
  on public.org_unidad (instalacion_organizacion_id, estructura_id, orden);

create table if not exists public.org_vinculacion_unidad (
  instalacion_organizacion_id uuid not null
    references public.instalacion_organizacion (id) on delete cascade,
  id text not null,
  identidad_ref text not null,
  unidad_id text not null,
  sede_id text,
  tipo text not null default 'PRINCIPAL'
    check (tipo in ('PRINCIPAL', 'SECUNDARIA', 'TEMPORAL')),
  origen text not null default 'ASIGNACION_ADMINISTRATIVA'
    check (origen in (
      'ASIGNACION_ADMINISTRATIVA',
      'SOLICITUD_USUARIO',
      'IMPORTACION',
      'REGLA_AUTOMATICA'
    )),
  estado text not null default 'ACTIVA'
    check (estado in ('PENDIENTE', 'ACTIVA', 'RECHAZADA', 'FINALIZADA')),
  fecha_inicio date,
  fecha_fin date,
  aprobada_por text,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  primary key (instalacion_organizacion_id, id),
  foreign key (instalacion_organizacion_id, unidad_id)
    references public.org_unidad (instalacion_organizacion_id, id)
    on delete cascade
);

create index if not exists org_vinculacion_identidad_idx
  on public.org_vinculacion_unidad (instalacion_organizacion_id, identidad_ref);

create index if not exists org_vinculacion_unidad_idx
  on public.org_vinculacion_unidad (instalacion_organizacion_id, unidad_id);

-- ---------------------------------------------------------------------------
-- Semilla gobierno (una vez por instalación)
-- ---------------------------------------------------------------------------

create or replace function public.org_asegurar_organigrama_base(
  p_instalacion_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_instalacion_id is null then
    raise exception 'Instalación requerida';
  end if;

  if exists (
    select 1
    from public.org_estructura e
    where e.instalacion_organizacion_id = p_instalacion_id
  ) then
    return;
  end if;

  insert into public.org_tipo_unidad (
    instalacion_organizacion_id, id, nombre_singular, nombre_plural,
    descripcion, color, permite_subunidades, estado
  ) values
    (p_instalacion_id, 'tipo-direccion', 'Dirección', 'Direcciones',
     'Unidad de conducción institucional.', '#B87A00', true, 'ACTIVO'),
    (p_instalacion_id, 'tipo-administracion', 'Administración', 'Administraciones',
     'Ejecuta la operación y administra la estructura.', '#C58A00', true, 'ACTIVO'),
    (p_instalacion_id, 'tipo-area', 'Área', 'Áreas',
     'Unidad operativa de la organización.', '#0B3A78', true, 'ACTIVO'),
    (p_instalacion_id, 'tipo-equipo', 'Equipo', 'Equipos',
     'Grupo de trabajo dentro de un área.', '#0E7490', true, 'ACTIVO');

  insert into public.org_politica_incorporacion (
    instalacion_organizacion_id, id, nombre, modalidad, capacidad_maxima, estado
  ) values
    (p_instalacion_id, 'pol-admin', 'Solo un administrador las agrega', 'ASIGNACION_ADMIN', null, 'ACTIVA'),
    (p_instalacion_id, 'pol-abierta', 'Cualquiera puede unirse', 'ABIERTA', 500, 'ACTIVA');

  insert into public.org_estructura (
    instalacion_organizacion_id, id, nombre, descripcion, tipo,
    modo_jerarquia, es_sistema, estado
  ) values (
    p_instalacion_id,
    'estructura-gobierno',
    'Gobierno y administración',
    'Funciones protegidas necesarias para operar la entidad.',
    'GOBIERNO',
    'FLEXIBLE',
    true,
    'ACTIVA'
  );

  insert into public.org_nivel_estructura (
    instalacion_organizacion_id, id, estructura_id, nombre, orden, estado
  ) values (
    p_instalacion_id,
    'nivel-gobierno',
    'estructura-gobierno',
    'Gobierno',
    1,
    'ACTIVO'
  );

  insert into public.org_unidad (
    instalacion_organizacion_id, id, nombre, codigo, tipo_unidad_id,
    estructura_id, nivel_id, unidad_padre_id, codigo_sistema, es_sistema,
    politica_incorporacion_id, orden, estado
  ) values
    (
      p_instalacion_id, 'unidad-direccion-gobierno', 'Dirección', 'DIR',
      'tipo-direccion', 'estructura-gobierno', 'nivel-gobierno', null,
      'DIRECCION', true, 'pol-admin', 1, 'ACTIVA'
    ),
    (
      p_instalacion_id, 'unidad-administracion', 'Administración', 'ADM',
      'tipo-administracion', 'estructura-gobierno', 'nivel-gobierno', null,
      'ADMINISTRACION', true, 'pol-admin', 2, 'ACTIVA'
    );
end;
$$;

-- ---------------------------------------------------------------------------
-- Lectura bootstrap
-- ---------------------------------------------------------------------------

create or replace function public.org_listar_organigrama(
  p_instalacion_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_estructuras jsonb;
  v_niveles jsonb;
  v_tipos jsonb;
  v_unidades jsonb;
  v_politicas jsonb;
  v_vinculaciones jsonb;
begin
  if p_instalacion_id is null
    or not public.org_es_miembro_instalacion(p_instalacion_id)
  then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  perform public.org_asegurar_organigrama_base(p_instalacion_id);

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', e.id,
    'nombre', e.nombre,
    'descripcion', e.descripcion,
    'tipo', e.tipo,
    'modoJerarquia', e.modo_jerarquia,
    'esSistema', e.es_sistema,
    'estado', e.estado
  ) order by e.es_sistema desc, e.nombre), '[]'::jsonb)
  into v_estructuras
  from public.org_estructura e
  where e.instalacion_organizacion_id = p_instalacion_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', n.id,
    'estructuraId', n.estructura_id,
    'nombre', n.nombre,
    'orden', n.orden,
    'estado', n.estado
  ) order by n.estructura_id, n.orden), '[]'::jsonb)
  into v_niveles
  from public.org_nivel_estructura n
  where n.instalacion_organizacion_id = p_instalacion_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', t.id,
    'nombreSingular', t.nombre_singular,
    'nombrePlural', t.nombre_plural,
    'descripcion', t.descripcion,
    'color', t.color,
    'permiteSubunidades', t.permite_subunidades,
    'estado', t.estado
  ) order by t.nombre_singular), '[]'::jsonb)
  into v_tipos
  from public.org_tipo_unidad t
  where t.instalacion_organizacion_id = p_instalacion_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', u.id,
    'nombre', u.nombre,
    'descripcion', u.descripcion,
    'codigo', u.codigo,
    'tipoUnidadId', u.tipo_unidad_id,
    'estructuraId', u.estructura_id,
    'nivelId', u.nivel_id,
    'unidadPadreId', u.unidad_padre_id,
    'codigoSistema', u.codigo_sistema,
    'esSistema', u.es_sistema,
    'responsableUsuarioId', u.responsable_identidad_ref,
    'politicaIncorporacionId', u.politica_incorporacion_id,
    'permiteSubunidades', u.permite_subunidades,
    'orden', u.orden,
    'estado', u.estado
  ) order by u.orden, u.nombre), '[]'::jsonb)
  into v_unidades
  from public.org_unidad u
  where u.instalacion_organizacion_id = p_instalacion_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', p.id,
    'nombre', p.nombre,
    'modalidad', p.modalidad,
    'capacidadMaxima', p.capacidad_maxima,
    'especialidadesPermitidas', p.especialidades_permitidas,
    'requiereColegiaturaActiva', p.requiere_colegiatura_activa,
    'estado', p.estado
  ) order by p.nombre), '[]'::jsonb)
  into v_politicas
  from public.org_politica_incorporacion p
  where p.instalacion_organizacion_id = p_instalacion_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', v.id,
    'usuarioId', v.identidad_ref,
    'unidadId', v.unidad_id,
    'sedeId', v.sede_id,
    'tipo', v.tipo,
    'origen', v.origen,
    'estado', v.estado,
    'fechaInicio', v.fecha_inicio,
    'fechaFin', v.fecha_fin,
    'aprobadaPor', v.aprobada_por
  ) order by v.creado_en desc), '[]'::jsonb)
  into v_vinculaciones
  from public.org_vinculacion_unidad v
  where v.instalacion_organizacion_id = p_instalacion_id;

  return jsonb_build_object(
    'ok', true,
    'estructuras', v_estructuras,
    'niveles', v_niveles,
    'tiposUnidad', v_tipos,
    'unidades', v_unidades,
    'politicasIncorporacion', v_politicas,
    'vinculaciones', v_vinculaciones
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Escrituras
-- ---------------------------------------------------------------------------

create or replace function public.org_guardar_estructura(
  p_instalacion_id uuid,
  p_estructura jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id text := coalesce(nullif(trim(p_estructura->>'id'), ''), 'estructura-' || replace(gen_random_uuid()::text, '-', ''));
begin
  if p_instalacion_id is null
    or not public.org_tiene_permiso(p_instalacion_id, 'equipos.administrar')
  then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  insert into public.org_estructura as e (
    instalacion_organizacion_id, id, nombre, descripcion, tipo,
    modo_jerarquia, es_sistema, estado, actualizado_en
  ) values (
    p_instalacion_id,
    v_id,
    coalesce(nullif(trim(p_estructura->>'nombre'), ''), 'Estructura'),
    nullif(trim(p_estructura->>'descripcion'), ''),
    coalesce(nullif(trim(p_estructura->>'tipo'), ''), 'FUNCIONAL'),
    coalesce(nullif(trim(p_estructura->>'modoJerarquia'), ''), 'FLEXIBLE'),
    coalesce((p_estructura->>'esSistema')::boolean, false),
    coalesce(nullif(trim(p_estructura->>'estado'), ''), 'ACTIVA'),
    now()
  )
  on conflict (instalacion_organizacion_id, id) do update set
    nombre = excluded.nombre,
    descripcion = excluded.descripcion,
    tipo = case when e.es_sistema then e.tipo else excluded.tipo end,
    modo_jerarquia = excluded.modo_jerarquia,
    estado = excluded.estado,
    actualizado_en = now();

  return (
    select jsonb_build_object(
      'id', e.id,
      'nombre', e.nombre,
      'descripcion', e.descripcion,
      'tipo', e.tipo,
      'modoJerarquia', e.modo_jerarquia,
      'esSistema', e.es_sistema,
      'estado', e.estado
    )
    from public.org_estructura e
    where e.instalacion_organizacion_id = p_instalacion_id
      and e.id = v_id
  );
end;
$$;

create or replace function public.org_guardar_nivel(
  p_instalacion_id uuid,
  p_nivel jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id text := coalesce(nullif(trim(p_nivel->>'id'), ''), 'nivel-' || replace(gen_random_uuid()::text, '-', ''));
  v_estructura text := nullif(trim(p_nivel->>'estructuraId'), '');
begin
  if p_instalacion_id is null
    or not public.org_tiene_permiso(p_instalacion_id, 'equipos.administrar')
  then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  if v_estructura is null then
    raise exception 'estructuraId requerido';
  end if;

  insert into public.org_nivel_estructura as n (
    instalacion_organizacion_id, id, estructura_id, nombre, orden, estado, actualizado_en
  ) values (
    p_instalacion_id,
    v_id,
    v_estructura,
    coalesce(nullif(trim(p_nivel->>'nombre'), ''), 'Nivel'),
    greatest(1, coalesce((p_nivel->>'orden')::int, 1)),
    coalesce(nullif(trim(p_nivel->>'estado'), ''), 'ACTIVO'),
    now()
  )
  on conflict (instalacion_organizacion_id, id) do update set
    nombre = excluded.nombre,
    orden = excluded.orden,
    estado = excluded.estado,
    actualizado_en = now();

  return (
    select jsonb_build_object(
      'id', n.id,
      'estructuraId', n.estructura_id,
      'nombre', n.nombre,
      'orden', n.orden,
      'estado', n.estado
    )
    from public.org_nivel_estructura n
    where n.instalacion_organizacion_id = p_instalacion_id
      and n.id = v_id
  );
end;
$$;

create or replace function public.org_guardar_tipo_unidad(
  p_instalacion_id uuid,
  p_tipo jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id text := coalesce(nullif(trim(p_tipo->>'id'), ''), 'tipo-' || replace(gen_random_uuid()::text, '-', ''));
begin
  if p_instalacion_id is null
    or not public.org_tiene_permiso(p_instalacion_id, 'equipos.administrar')
  then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  insert into public.org_tipo_unidad as t (
    instalacion_organizacion_id, id, nombre_singular, nombre_plural,
    descripcion, color, permite_subunidades, estado, actualizado_en
  ) values (
    p_instalacion_id,
    v_id,
    coalesce(nullif(trim(p_tipo->>'nombreSingular'), ''), 'Unidad'),
    coalesce(nullif(trim(p_tipo->>'nombrePlural'), ''), 'Unidades'),
    nullif(trim(p_tipo->>'descripcion'), ''),
    coalesce(nullif(trim(p_tipo->>'color'), ''), '#0B3A78'),
    coalesce((p_tipo->>'permiteSubunidades')::boolean, true),
    coalesce(nullif(trim(p_tipo->>'estado'), ''), 'ACTIVO'),
    now()
  )
  on conflict (instalacion_organizacion_id, id) do update set
    nombre_singular = excluded.nombre_singular,
    nombre_plural = excluded.nombre_plural,
    descripcion = excluded.descripcion,
    color = excluded.color,
    permite_subunidades = excluded.permite_subunidades,
    estado = excluded.estado,
    actualizado_en = now();

  return (
    select jsonb_build_object(
      'id', t.id,
      'nombreSingular', t.nombre_singular,
      'nombrePlural', t.nombre_plural,
      'descripcion', t.descripcion,
      'color', t.color,
      'permiteSubunidades', t.permite_subunidades,
      'estado', t.estado
    )
    from public.org_tipo_unidad t
    where t.instalacion_organizacion_id = p_instalacion_id
      and t.id = v_id
  );
end;
$$;

create or replace function public.org_guardar_politica_incorporacion(
  p_instalacion_id uuid,
  p_politica jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id text := coalesce(nullif(trim(p_politica->>'id'), ''), 'pol-' || replace(gen_random_uuid()::text, '-', ''));
begin
  if p_instalacion_id is null
    or not public.org_tiene_permiso(p_instalacion_id, 'equipos.administrar')
  then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  insert into public.org_politica_incorporacion as p (
    instalacion_organizacion_id, id, nombre, modalidad, capacidad_maxima,
    especialidades_permitidas, requiere_colegiatura_activa, estado, actualizado_en
  ) values (
    p_instalacion_id,
    v_id,
    coalesce(nullif(trim(p_politica->>'nombre'), ''), 'Política'),
    coalesce(nullif(trim(p_politica->>'modalidad'), ''), 'ASIGNACION_ADMIN'),
    nullif(p_politica->>'capacidadMaxima', '')::int,
    coalesce(p_politica->'especialidadesPermitidas', '[]'::jsonb),
    coalesce((p_politica->>'requiereColegiaturaActiva')::boolean, false),
    coalesce(nullif(trim(p_politica->>'estado'), ''), 'ACTIVA'),
    now()
  )
  on conflict (instalacion_organizacion_id, id) do update set
    nombre = excluded.nombre,
    modalidad = excluded.modalidad,
    capacidad_maxima = excluded.capacidad_maxima,
    especialidades_permitidas = excluded.especialidades_permitidas,
    requiere_colegiatura_activa = excluded.requiere_colegiatura_activa,
    estado = excluded.estado,
    actualizado_en = now();

  return (
    select jsonb_build_object(
      'id', p.id,
      'nombre', p.nombre,
      'modalidad', p.modalidad,
      'capacidadMaxima', p.capacidad_maxima,
      'especialidadesPermitidas', p.especialidades_permitidas,
      'requiereColegiaturaActiva', p.requiere_colegiatura_activa,
      'estado', p.estado
    )
    from public.org_politica_incorporacion p
    where p.instalacion_organizacion_id = p_instalacion_id
      and p.id = v_id
  );
end;
$$;

create or replace function public.org_guardar_unidad(
  p_instalacion_id uuid,
  p_unidad jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id text := coalesce(nullif(trim(p_unidad->>'id'), ''), 'unidad-' || replace(gen_random_uuid()::text, '-', ''));
  v_existente public.org_unidad%rowtype;
begin
  if p_instalacion_id is null
    or not public.org_tiene_permiso(p_instalacion_id, 'equipos.administrar')
  then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  select * into v_existente
  from public.org_unidad u
  where u.instalacion_organizacion_id = p_instalacion_id
    and u.id = v_id;

  insert into public.org_unidad as u (
    instalacion_organizacion_id, id, nombre, descripcion, codigo,
    tipo_unidad_id, estructura_id, nivel_id, unidad_padre_id,
    codigo_sistema, es_sistema, responsable_identidad_ref,
    politica_incorporacion_id, permite_subunidades, orden, estado, actualizado_en
  ) values (
    p_instalacion_id,
    v_id,
    coalesce(nullif(trim(p_unidad->>'nombre'), ''), 'Unidad'),
    nullif(trim(p_unidad->>'descripcion'), ''),
    nullif(trim(p_unidad->>'codigo'), ''),
    coalesce(
      nullif(trim(p_unidad->>'tipoUnidadId'), ''),
      v_existente.tipo_unidad_id,
      'tipo-area'
    ),
    nullif(trim(p_unidad->>'estructuraId'), ''),
    nullif(trim(p_unidad->>'nivelId'), ''),
    nullif(trim(p_unidad->>'unidadPadreId'), ''),
    coalesce(v_existente.codigo_sistema, nullif(trim(p_unidad->>'codigoSistema'), '')),
    coalesce(v_existente.es_sistema, coalesce((p_unidad->>'esSistema')::boolean, false)),
    nullif(trim(p_unidad->>'responsableUsuarioId'), ''),
    nullif(trim(p_unidad->>'politicaIncorporacionId'), ''),
    case
      when p_unidad ? 'permiteSubunidades'
        then (p_unidad->>'permiteSubunidades')::boolean
      else v_existente.permite_subunidades
    end,
    greatest(1, coalesce((p_unidad->>'orden')::int, v_existente.orden, 1)),
    coalesce(nullif(trim(p_unidad->>'estado'), ''), 'ACTIVA'),
    now()
  )
  on conflict (instalacion_organizacion_id, id) do update set
    nombre = case when u.es_sistema then u.nombre else excluded.nombre end,
    descripcion = excluded.descripcion,
    codigo = excluded.codigo,
    tipo_unidad_id = case when u.es_sistema then u.tipo_unidad_id else excluded.tipo_unidad_id end,
    estructura_id = case when u.es_sistema then u.estructura_id else excluded.estructura_id end,
    nivel_id = excluded.nivel_id,
    unidad_padre_id = case when u.es_sistema then u.unidad_padre_id else excluded.unidad_padre_id end,
    responsable_identidad_ref = excluded.responsable_identidad_ref,
    politica_incorporacion_id = excluded.politica_incorporacion_id,
    permite_subunidades = excluded.permite_subunidades,
    orden = excluded.orden,
    estado = case when u.es_sistema then u.estado else excluded.estado end,
    actualizado_en = now();

  return (
    select jsonb_build_object(
      'id', u.id,
      'nombre', u.nombre,
      'descripcion', u.descripcion,
      'codigo', u.codigo,
      'tipoUnidadId', u.tipo_unidad_id,
      'estructuraId', u.estructura_id,
      'nivelId', u.nivel_id,
      'unidadPadreId', u.unidad_padre_id,
      'codigoSistema', u.codigo_sistema,
      'esSistema', u.es_sistema,
      'responsableUsuarioId', u.responsable_identidad_ref,
      'politicaIncorporacionId', u.politica_incorporacion_id,
      'permiteSubunidades', u.permite_subunidades,
      'orden', u.orden,
      'estado', u.estado
    )
    from public.org_unidad u
    where u.instalacion_organizacion_id = p_instalacion_id
      and u.id = v_id
  );
end;
$$;

create or replace function public.org_eliminar_unidad(
  p_instalacion_id uuid,
  p_unidad_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_unidad public.org_unidad%rowtype;
  v_hijos integer;
  v_vincs integer;
begin
  if p_instalacion_id is null
    or not public.org_tiene_permiso(p_instalacion_id, 'equipos.administrar')
  then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  select * into v_unidad
  from public.org_unidad u
  where u.instalacion_organizacion_id = p_instalacion_id
    and u.id = p_unidad_id;

  if not found then
    raise exception 'Unidad inexistente';
  end if;
  if v_unidad.es_sistema then
    raise exception 'No se pueden eliminar unidades de sistema';
  end if;

  select count(*)::int into v_hijos
  from public.org_unidad u
  where u.instalacion_organizacion_id = p_instalacion_id
    and u.unidad_padre_id = p_unidad_id;

  if v_hijos > 0 then
    raise exception 'La unidad tiene nodos descendientes';
  end if;

  delete from public.org_vinculacion_unidad v
  where v.instalacion_organizacion_id = p_instalacion_id
    and v.unidad_id = p_unidad_id;
  get diagnostics v_vincs = row_count;

  delete from public.org_unidad u
  where u.instalacion_organizacion_id = p_instalacion_id
    and u.id = p_unidad_id;

  return jsonb_build_object(
    'ok', true,
    'unidadId', p_unidad_id,
    'vinculacionesEliminadas', v_vincs
  );
end;
$$;

create or replace function public.org_guardar_vinculacion(
  p_instalacion_id uuid,
  p_vinculacion jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id text := coalesce(nullif(trim(p_vinculacion->>'id'), ''), 'vinc-' || replace(gen_random_uuid()::text, '-', ''));
  v_usuario text := nullif(trim(p_vinculacion->>'usuarioId'), '');
  v_unidad text := nullif(trim(p_vinculacion->>'unidadId'), '');
begin
  if p_instalacion_id is null
    or not public.org_tiene_permiso(p_instalacion_id, 'equipos.administrar')
  then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  if v_usuario is null or v_unidad is null then
    raise exception 'usuarioId y unidadId son requeridos';
  end if;

  insert into public.org_vinculacion_unidad as v (
    instalacion_organizacion_id, id, identidad_ref, unidad_id, sede_id,
    tipo, origen, estado, fecha_inicio, fecha_fin, aprobada_por, actualizado_en
  ) values (
    p_instalacion_id,
    v_id,
    v_usuario,
    v_unidad,
    nullif(trim(p_vinculacion->>'sedeId'), ''),
    coalesce(nullif(trim(p_vinculacion->>'tipo'), ''), 'PRINCIPAL'),
    coalesce(nullif(trim(p_vinculacion->>'origen'), ''), 'ASIGNACION_ADMINISTRATIVA'),
    coalesce(nullif(trim(p_vinculacion->>'estado'), ''), 'ACTIVA'),
    nullif(p_vinculacion->>'fechaInicio', '')::date,
    nullif(p_vinculacion->>'fechaFin', '')::date,
    nullif(trim(p_vinculacion->>'aprobadaPor'), ''),
    now()
  )
  on conflict (instalacion_organizacion_id, id) do update set
    identidad_ref = excluded.identidad_ref,
    unidad_id = excluded.unidad_id,
    sede_id = excluded.sede_id,
    tipo = excluded.tipo,
    origen = excluded.origen,
    estado = excluded.estado,
    fecha_inicio = excluded.fecha_inicio,
    fecha_fin = excluded.fecha_fin,
    aprobada_por = excluded.aprobada_por,
    actualizado_en = now();

  return (
    select jsonb_build_object(
      'id', v.id,
      'usuarioId', v.identidad_ref,
      'unidadId', v.unidad_id,
      'sedeId', v.sede_id,
      'tipo', v.tipo,
      'origen', v.origen,
      'estado', v.estado,
      'fechaInicio', v.fecha_inicio,
      'fechaFin', v.fecha_fin,
      'aprobadaPor', v.aprobada_por
    )
    from public.org_vinculacion_unidad v
    where v.instalacion_organizacion_id = p_instalacion_id
      and v.id = v_id
  );
end;
$$;

create or replace function public.org_eliminar_vinculacion(
  p_instalacion_id uuid,
  p_vinculacion_id text
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

  delete from public.org_vinculacion_unidad v
  where v.instalacion_organizacion_id = p_instalacion_id
    and v.id = p_vinculacion_id;

  return jsonb_build_object('ok', true, 'vinculacionId', p_vinculacion_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

revoke all on function public.org_asegurar_organigrama_base(uuid) from public;
revoke all on function public.org_listar_organigrama(uuid) from public;
revoke all on function public.org_guardar_estructura(uuid, jsonb) from public;
revoke all on function public.org_guardar_nivel(uuid, jsonb) from public;
revoke all on function public.org_guardar_tipo_unidad(uuid, jsonb) from public;
revoke all on function public.org_guardar_politica_incorporacion(uuid, jsonb) from public;
revoke all on function public.org_guardar_unidad(uuid, jsonb) from public;
revoke all on function public.org_eliminar_unidad(uuid, text) from public;
revoke all on function public.org_guardar_vinculacion(uuid, jsonb) from public;
revoke all on function public.org_eliminar_vinculacion(uuid, text) from public;

grant execute on function public.org_listar_organigrama(uuid) to authenticated;
grant execute on function public.org_guardar_estructura(uuid, jsonb) to authenticated;
grant execute on function public.org_guardar_nivel(uuid, jsonb) to authenticated;
grant execute on function public.org_guardar_tipo_unidad(uuid, jsonb) to authenticated;
grant execute on function public.org_guardar_politica_incorporacion(uuid, jsonb) to authenticated;
grant execute on function public.org_guardar_unidad(uuid, jsonb) to authenticated;
grant execute on function public.org_eliminar_unidad(uuid, text) to authenticated;
grant execute on function public.org_guardar_vinculacion(uuid, jsonb) to authenticated;
grant execute on function public.org_eliminar_vinculacion(uuid, text) to authenticated;

commit;
