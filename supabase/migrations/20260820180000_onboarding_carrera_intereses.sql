-- Onboarding de aprendizaje (primer acceso): carrera + intereses.
-- Catálogos de plataforma (no viven dentro de la estructura/nodos).
-- Ejecutar en el SQL Editor del proyecto PRINCIPAL.

begin;

-- ---------------------------------------------------------------------------
-- Catálogos
-- ---------------------------------------------------------------------------

create table if not exists public.carrera_catalogo (
  id text primary key,
  codigo text not null unique,
  nombre text not null,
  descripcion text not null default '',
  familia text not null default 'GENERAL',
  orden integer not null default 1,
  activa boolean not null default true,
  creado_en timestamptz not null default now()
);

create table if not exists public.interes_catalogo (
  id text primary key,
  codigo text not null unique,
  nombre text not null,
  descripcion text not null default '',
  color text not null default '#0B3A78',
  orden integer not null default 1,
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);

create table if not exists public.carrera_interes_sugerido (
  carrera_id text not null references public.carrera_catalogo (id) on delete cascade,
  interes_id text not null references public.interes_catalogo (id) on delete cascade,
  peso integer not null default 1 check (peso between 1 and 5),
  primary key (carrera_id, interes_id)
);

-- ---------------------------------------------------------------------------
-- Perfil de aprendizaje por identidad
-- ---------------------------------------------------------------------------

create table if not exists public.identidad_perfil_aprendizaje (
  identidad_id uuid primary key
    references public.identidad_principal (id) on delete cascade,
  carrera_id text references public.carrera_catalogo (id),
  situacion text not null default 'EXPLORA'
    check (situacion in ('EJERCE', 'ESTUDIA', 'EXPLORA')),
  onboarding_completado_en timestamptz,
  actualizado_en timestamptz not null default now()
);

create table if not exists public.identidad_interes (
  identidad_id uuid not null
    references public.identidad_principal (id) on delete cascade,
  interes_id text not null
    references public.interes_catalogo (id) on delete cascade,
  fuente text not null default 'MANUAL'
    check (fuente in ('MANUAL', 'CARRERA', 'NODO', 'COMPORTAMIENTO')),
  creado_en timestamptz not null default now(),
  primary key (identidad_id, interes_id)
);

create index if not exists identidad_interes_identidad_idx
  on public.identidad_interes (identidad_id);

-- ---------------------------------------------------------------------------
-- Seed inicial (construcción / ingeniería / tecnología — Tukuy)
-- ---------------------------------------------------------------------------

insert into public.carrera_catalogo (id, codigo, nombre, descripcion, familia, orden) values
  ('carr-ing-civil', 'ING_CIVIL', 'Ingeniería Civil', 'Diseño, construcción y gestión de obras.', 'INGENIERIA', 1),
  ('carr-arquitectura', 'ARQUITECTURA', 'Arquitectura', 'Diseño arquitectónico y proyectos.', 'DISENO', 2),
  ('carr-ing-industrial', 'ING_INDUSTRIAL', 'Ingeniería Industrial', 'Procesos, operaciones y mejora continua.', 'INGENIERIA', 3),
  ('carr-ing-sistemas', 'ING_SISTEMAS', 'Ingeniería de Sistemas / Software', 'Desarrollo, datos y tecnología.', 'TECNOLOGIA', 4),
  ('carr-admin', 'ADMINISTRACION', 'Administración / Gestión', 'Gestión de empresas, proyectos y equipos.', 'GESTION', 5),
  ('carr-contabilidad', 'CONTABILIDAD', 'Contabilidad / Finanzas', 'Costos, presupuestos y finanzas.', 'GESTION', 6),
  ('carr-seguridad', 'SEGURIDAD', 'Seguridad y Salud Ocupacional', 'Prevención y gestión de riesgos.', 'SEGURIDAD', 7),
  ('carr-tecnico-obra', 'TECNICO_OBRA', 'Técnico / Especialista de obra', 'Ejecución y supervisión en campo.', 'OBRA', 8),
  ('carr-docencia', 'DOCENCIA', 'Docencia / Formación', 'Enseñanza y facilitación de aprendizajes.', 'EDUCACION', 9),
  ('carr-estudiante', 'ESTUDIANTE', 'Estudiante (aún elijo especialidad)', 'Explorando hacia una carrera profesional.', 'FORMACION', 10),
  ('carr-otra', 'OTRA', 'Otra carrera / área', 'Otra profesión no listada.', 'GENERAL', 99)
on conflict (id) do nothing;

insert into public.interes_catalogo (id, codigo, nombre, descripcion, color, orden) values
  ('int-bim', 'BIM', 'BIM / Modelado', 'Revit, Navisworks, coordinación BIM.', '#6D28D9', 1),
  ('int-costos', 'COSTOS', 'Costos y presupuestos', 'Presupuestos, valorizaciones y control de costos.', '#0B3A78', 2),
  ('int-planificacion', 'PLANIFICACION', 'Planificación de proyectos', 'Cronogramas, MS Project, gestión de proyectos.', '#0E7490', 3),
  ('int-seguridad', 'SEGURIDAD_OBRA', 'Seguridad en obra', 'Prevención, normativas y protocolos.', '#B91C1C', 4),
  ('int-calidad', 'CALIDAD', 'Calidad', 'Control de calidad y mejora de procesos.', '#166534', 5),
  ('int-excel', 'EXCEL_DATOS', 'Excel / datos', 'Hojas de cálculo, Power BI y análisis.', '#B87A00', 6),
  ('int-construccion', 'CONSTRUCCION', 'Construcción civil', 'Ejecución, supervisión y métodos constructivos.', '#9A3412', 7),
  ('int-estructuras', 'ESTRUCTURAS', 'Estructuras', 'Análisis y diseño estructural.', '#1E3A8A', 8),
  ('int-gestion', 'GESTION', 'Gestión y liderazgo', 'Equipos, operaciones y administración.', '#334155', 9),
  ('int-tecnologia', 'TECNOLOGIA', 'Tecnología / digital', 'Herramientas digitales e innovación.', '#7C3AED', 10),
  ('int-empleabilidad', 'EMPLEABILIDAD', 'Empleabilidad / CV', 'Perfil profesional, entrevistas y oportunidades.', '#0369A1', 11),
  ('int-docencia', 'DOCENCIA', 'Docencia / tutoría', 'Diseño de cursos y acompañamiento.', '#0F766E', 12)
on conflict (id) do nothing;

insert into public.carrera_interes_sugerido (carrera_id, interes_id, peso) values
  ('carr-ing-civil', 'int-bim', 5),
  ('carr-ing-civil', 'int-costos', 4),
  ('carr-ing-civil', 'int-planificacion', 4),
  ('carr-ing-civil', 'int-construccion', 5),
  ('carr-ing-civil', 'int-estructuras', 4),
  ('carr-ing-civil', 'int-seguridad', 3),
  ('carr-arquitectura', 'int-bim', 5),
  ('carr-arquitectura', 'int-construccion', 3),
  ('carr-arquitectura', 'int-planificacion', 3),
  ('carr-arquitectura', 'int-tecnologia', 3),
  ('carr-ing-industrial', 'int-planificacion', 4),
  ('carr-ing-industrial', 'int-excel', 4),
  ('carr-ing-industrial', 'int-gestion', 5),
  ('carr-ing-industrial', 'int-calidad', 4),
  ('carr-ing-sistemas', 'int-tecnologia', 5),
  ('carr-ing-sistemas', 'int-excel', 3),
  ('carr-ing-sistemas', 'int-gestion', 2),
  ('carr-admin', 'int-gestion', 5),
  ('carr-admin', 'int-excel', 4),
  ('carr-admin', 'int-planificacion', 3),
  ('carr-admin', 'int-empleabilidad', 3),
  ('carr-contabilidad', 'int-costos', 5),
  ('carr-contabilidad', 'int-excel', 5),
  ('carr-contabilidad', 'int-gestion', 3),
  ('carr-seguridad', 'int-seguridad', 5),
  ('carr-seguridad', 'int-calidad', 3),
  ('carr-seguridad', 'int-construccion', 3),
  ('carr-tecnico-obra', 'int-construccion', 5),
  ('carr-tecnico-obra', 'int-seguridad', 4),
  ('carr-tecnico-obra', 'int-calidad', 3),
  ('carr-docencia', 'int-docencia', 5),
  ('carr-docencia', 'int-empleabilidad', 3),
  ('carr-estudiante', 'int-empleabilidad', 4),
  ('carr-estudiante', 'int-tecnologia', 3),
  ('carr-estudiante', 'int-excel', 3),
  ('carr-otra', 'int-empleabilidad', 3),
  ('carr-otra', 'int-gestion', 2)
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------

create or replace function public.listar_catalogo_onboarding_aprendizaje()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_carreras jsonb;
  v_intereses jsonb;
begin
  if auth.uid() is null then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', c.id,
      'codigo', c.codigo,
      'nombre', c.nombre,
      'descripcion', c.descripcion,
      'familia', c.familia,
      'orden', c.orden,
      'interesesSugeridos', coalesce((
        select jsonb_agg(s.interes_id order by s.peso desc)
        from public.carrera_interes_sugerido s
        where s.carrera_id = c.id
      ), '[]'::jsonb)
    )
    order by c.orden, c.nombre
  ), '[]'::jsonb)
  into v_carreras
  from public.carrera_catalogo c
  where c.activa;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', i.id,
      'codigo', i.codigo,
      'nombre', i.nombre,
      'descripcion', i.descripcion,
      'color', i.color,
      'orden', i.orden
    )
    order by i.orden, i.nombre
  ), '[]'::jsonb)
  into v_intereses
  from public.interes_catalogo i
  where i.activo;

  return jsonb_build_object(
    'ok', true,
    'carreras', v_carreras,
    'intereses', v_intereses
  );
end;
$$;

create or replace function public.obtener_mi_onboarding_aprendizaje()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_identidad uuid;
  v_perfil public.identidad_perfil_aprendizaje%rowtype;
  v_intereses jsonb;
begin
  if auth.uid() is null then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  select id into v_identidad
  from public.identidad_principal
  where auth_usuario_ref = auth.uid();

  if v_identidad is null then
    return jsonb_build_object(
      'ok', true,
      'completado', false,
      'requiereOnboarding', true
    );
  end if;

  select * into v_perfil
  from public.identidad_perfil_aprendizaje p
  where p.identidad_id = v_identidad;

  if not found or v_perfil.onboarding_completado_en is null then
    select coalesce(jsonb_agg(ii.interes_id order by ii.interes_id), '[]'::jsonb)
    into v_intereses
    from public.identidad_interes ii
    where ii.identidad_id = v_identidad;

    return jsonb_build_object(
      'ok', true,
      'completado', false,
      'requiereOnboarding', true,
      'carreraId', v_perfil.carrera_id,
      'situacion', coalesce(v_perfil.situacion, 'EXPLORA'),
      'interesIds', coalesce(v_intereses, '[]'::jsonb)
    );
  end if;

  select coalesce(jsonb_agg(ii.interes_id order by ii.interes_id), '[]'::jsonb)
  into v_intereses
  from public.identidad_interes ii
  where ii.identidad_id = v_identidad;

  return jsonb_build_object(
    'ok', true,
    'completado', true,
    'requiereOnboarding', false,
    'carreraId', v_perfil.carrera_id,
    'situacion', v_perfil.situacion,
    'interesIds', coalesce(v_intereses, '[]'::jsonb),
    'completadoEn', v_perfil.onboarding_completado_en
  );
end;
$$;

create or replace function public.completar_mi_onboarding_aprendizaje(
  p_carrera_id text,
  p_situacion text,
  p_interes_ids jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_identidad uuid;
  v_situacion text := upper(trim(coalesce(p_situacion, 'EXPLORA')));
  v_ids text[];
  v_id text;
begin
  if auth.uid() is null then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  select id into v_identidad
  from public.identidad_principal
  where auth_usuario_ref = auth.uid();

  if v_identidad is null then
    raise exception 'Identidad no encontrada';
  end if;

  if nullif(trim(p_carrera_id), '') is null then
    raise exception 'Carrera requerida';
  end if;

  if not exists (
    select 1 from public.carrera_catalogo c
    where c.id = p_carrera_id and c.activa
  ) then
    raise exception 'Carrera inválida';
  end if;

  if v_situacion not in ('EJERCE', 'ESTUDIA', 'EXPLORA') then
    v_situacion := 'EXPLORA';
  end if;

  select coalesce(array_agg(distinct trim(x)), '{}'::text[])
  into v_ids
  from jsonb_array_elements_text(coalesce(p_interes_ids, '[]'::jsonb)) as t(x)
  where nullif(trim(x), '') is not null;

  v_ids := coalesce((
    select array_agg(i.id)
    from public.interes_catalogo i
    where i.id = any(v_ids) and i.activo
  ), '{}'::text[]);

  if coalesce(array_length(v_ids, 1), 0) < 1 then
    raise exception 'Selecciona al menos un interés';
  end if;

  insert into public.identidad_perfil_aprendizaje (
    identidad_id, carrera_id, situacion, onboarding_completado_en, actualizado_en
  ) values (
    v_identidad, p_carrera_id, v_situacion, now(), now()
  )
  on conflict (identidad_id) do update set
    carrera_id = excluded.carrera_id,
    situacion = excluded.situacion,
    onboarding_completado_en = coalesce(
      public.identidad_perfil_aprendizaje.onboarding_completado_en,
      excluded.onboarding_completado_en
    ),
    actualizado_en = now();

  -- Si ya estaba completado, no reabrimos el flujo; igual actualizamos intereses.
  update public.identidad_perfil_aprendizaje
  set onboarding_completado_en = coalesce(onboarding_completado_en, now()),
      actualizado_en = now()
  where identidad_id = v_identidad;

  delete from public.identidad_interes
  where identidad_id = v_identidad;

  foreach v_id in array v_ids loop
    insert into public.identidad_interes (identidad_id, interes_id, fuente)
    values (
      v_identidad,
      v_id,
      case
        when exists (
          select 1 from public.carrera_interes_sugerido s
          where s.carrera_id = p_carrera_id and s.interes_id = v_id
        ) then 'CARRERA'
        else 'MANUAL'
      end
    );
  end loop;

  return public.obtener_mi_onboarding_aprendizaje();
end;
$$;

revoke all on function public.listar_catalogo_onboarding_aprendizaje() from public;
revoke all on function public.obtener_mi_onboarding_aprendizaje() from public;
revoke all on function public.completar_mi_onboarding_aprendizaje(text, text, jsonb) from public;
grant execute on function public.listar_catalogo_onboarding_aprendizaje() to authenticated;
grant execute on function public.obtener_mi_onboarding_aprendizaje() to authenticated;
grant execute on function public.completar_mi_onboarding_aprendizaje(text, text, jsonb) to authenticated;

commit;
