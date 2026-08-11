-- Asistencia a sesiones en vivo (compatible con esquema existente).
-- Ejecutar en el SQL Editor del proyecto SECUNDARIO.
--
-- Si ya corriste una versión fallida de este archivo, vuelve a ejecutar
-- este script completo: es idempotente.

begin;

-- ---------------------------------------------------------------------------
-- Tabla: asegura columnas aunque asistencia_sesion ya existiera
-- ---------------------------------------------------------------------------

create table if not exists public.asistencia_sesion (
  id uuid primary key default gen_random_uuid(),
  sesion_en_vivo_id uuid not null,
  estudiante_identidad_ref uuid,
  estado text not null default 'AUSENTE',
  marcado_en timestamptz not null default now(),
  marcado_por uuid,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

alter table public.asistencia_sesion
  add column if not exists sesion_en_vivo_id uuid,
  add column if not exists estudiante_identidad_ref uuid,
  add column if not exists estado text default 'AUSENTE',
  add column if not exists marcado_en timestamptz default now(),
  add column if not exists marcado_por uuid,
  add column if not exists creado_en timestamptz default now(),
  add column if not exists actualizado_en timestamptz default now();

-- Si el esquema viejo usaba otro nombre de alumno, cópialo a la columna canónica.
do $$
declare
  v_col text;
begin
  select c.column_name into v_col
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = 'asistencia_sesion'
    and c.column_name in (
      'estudiante_id',
      'estudiante_ref',
      'identidad_estudiante_ref',
      'identidad_principal_ref',
      'persona_identidad_ref',
      'alumno_identidad_ref'
    )
  order by array_position(
    array[
      'estudiante_id',
      'estudiante_ref',
      'identidad_estudiante_ref',
      'identidad_principal_ref',
      'persona_identidad_ref',
      'alumno_identidad_ref'
    ],
    c.column_name
  )
  limit 1;

  if v_col is not null then
    execute format(
      'update public.asistencia_sesion
       set estudiante_identidad_ref = coalesce(estudiante_identidad_ref, %I)
       where estudiante_identidad_ref is null and %I is not null',
      v_col,
      v_col
    );
  end if;
end;
$$;

create unique index if not exists asistencia_sesion_unica_idx
  on public.asistencia_sesion (sesion_en_vivo_id, estudiante_identidad_ref)
  where estudiante_identidad_ref is not null;

create index if not exists asistencia_sesion_sesion_idx
  on public.asistencia_sesion (sesion_en_vivo_id);

-- ---------------------------------------------------------------------------
-- Helper: columna de estudiante en matricula_curso
-- ---------------------------------------------------------------------------

create or replace function public._servicio_columna_estudiante_matricula()
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_col text;
begin
  select c.column_name into v_col
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = 'matricula_curso'
    and c.column_name in (
      'estudiante_identidad_ref',
      'identidad_principal_ref',
      'estudiante_ref',
      'alumno_identidad_ref',
      'persona_identidad_ref',
      'estudiante_id'
    )
  order by array_position(
    array[
      'estudiante_identidad_ref',
      'identidad_principal_ref',
      'estudiante_ref',
      'alumno_identidad_ref',
      'persona_identidad_ref',
      'estudiante_id'
    ],
    c.column_name
  )
  limit 1;

  if v_col is null then
    raise exception 'No se encontro columna de estudiante en matricula_curso';
  end if;
  return v_col;
end;
$$;

-- ---------------------------------------------------------------------------
-- Listar roster de la sesión
-- ---------------------------------------------------------------------------

create or replace function public.servicio_listar_asistencia_sesion(
  p_sesion_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_sesion public.sesion_en_vivo;
  v_curso_id uuid;
  v_items jsonb;
  v_col_est text := public._servicio_columna_estudiante_matricula();
begin
  if p_sesion_id is null then
    raise exception 'Sesion requerida';
  end if;

  select * into v_sesion
  from public.sesion_en_vivo
  where id = p_sesion_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Sesion no encontrada');
  end if;

  select c.id into v_curso_id
  from public.edicion_curso e
  join public.version_curso v on v.id = e.version_curso_id
  join public.curso c on c.id = v.curso_id
  where e.id = v_sesion.edicion_curso_id;

  execute format(
    $q$
    select coalesce(jsonb_agg(item order by item->>'nombre'), '[]'::jsonb)
    from (
      select jsonb_build_object(
        'estudianteId', m.%1$I,
        'matriculaId', m.id,
        'nombre', coalesce(a.nombre_mostrar, a.correo, 'Estudiante'),
        'correo', a.correo,
        'iniciales', upper(left(coalesce(a.nombre_mostrar, a.correo, 'ES'), 2)),
        'estado', coalesce(asg.estado, 'SIN_MARCAR'),
        'marcadoEn', asg.marcado_en,
        'marcadoPor', asg.marcado_por
      ) as item
      from public.matricula_curso m
      left join public.acceso_identidad_principal a
        on a.identidad_principal_ref = m.%1$I
      left join public.asistencia_sesion asg
        on asg.sesion_en_vivo_id = $1
       and asg.estudiante_identidad_ref = m.%1$I
      where m.edicion_curso_id = $2
    ) listado
    $q$,
    v_col_est
  )
  into v_items
  using p_sesion_id, v_sesion.edicion_curso_id;

  return jsonb_build_object(
    'ok', true,
    'sesionId', p_sesion_id,
    'cursoId', v_curso_id,
    'total', jsonb_array_length(coalesce(v_items, '[]'::jsonb)),
    'presentes', (
      select count(*)::int
      from jsonb_array_elements(coalesce(v_items, '[]'::jsonb)) x
      where upper(x.value->>'estado') = 'PRESENTE'
    ),
    'asistencias', coalesce(v_items, '[]'::jsonb)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Marcar asistencia masiva
-- p_items: [{ "estudianteId": uuid, "estado": "PRESENTE"|"AUSENTE"|"TARDANZA" }]
-- ---------------------------------------------------------------------------

create or replace function public.servicio_marcar_asistencia_sesion(
  p_sesion_id uuid,
  p_marcador_identidad_ref uuid,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sesion public.sesion_en_vivo;
  v_item jsonb;
  v_estudiante uuid;
  v_estado text;
  v_count integer := 0;
  v_col_est text := public._servicio_columna_estudiante_matricula();
  v_existe boolean;
begin
  if p_sesion_id is null then
    raise exception 'Sesion requerida';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Se requiere al menos un item de asistencia';
  end if;

  select * into v_sesion
  from public.sesion_en_vivo
  where id = p_sesion_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Sesion no encontrada');
  end if;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    begin
      v_estudiante := nullif(trim(coalesce(v_item->>'estudianteId', '')), '')::uuid;
    exception
      when others then
        continue;
    end;
    if v_estudiante is null then
      continue;
    end if;

    execute format(
      'select exists(
         select 1
         from public.matricula_curso m
         where m.edicion_curso_id = $1
           and m.%I = $2
       )',
      v_col_est
    )
    into v_existe
    using v_sesion.edicion_curso_id, v_estudiante;

    if not coalesce(v_existe, false) then
      continue;
    end if;

    v_estado := upper(trim(coalesce(v_item->>'estado', 'AUSENTE')));
    if v_estado not in ('PRESENTE', 'AUSENTE', 'TARDANZA') then
      v_estado := 'AUSENTE';
    end if;

    insert into public.asistencia_sesion (
      id,
      sesion_en_vivo_id,
      estudiante_identidad_ref,
      estado,
      marcado_en,
      marcado_por,
      creado_en,
      actualizado_en
    ) values (
      gen_random_uuid(),
      p_sesion_id,
      v_estudiante,
      v_estado,
      now(),
      p_marcador_identidad_ref,
      now(),
      now()
    )
    on conflict (sesion_en_vivo_id, estudiante_identidad_ref)
      where (estudiante_identidad_ref is not null)
    do update set
      estado = excluded.estado,
      marcado_en = now(),
      marcado_por = excluded.marcado_por,
      actualizado_en = now();

    v_count := v_count + 1;
  end loop;

  return public.servicio_listar_asistencia_sesion(p_sesion_id)
    || jsonb_build_object('marcados', v_count);
end;
$$;

revoke all on function public._servicio_columna_estudiante_matricula()
  from public, anon, authenticated;
revoke all on function public.servicio_listar_asistencia_sesion(uuid)
  from public, anon, authenticated;
revoke all on function public.servicio_marcar_asistencia_sesion(uuid, uuid, jsonb)
  from public, anon, authenticated;

grant execute on function public._servicio_columna_estudiante_matricula() to service_role;
grant execute on function public.servicio_listar_asistencia_sesion(uuid) to service_role;
grant execute on function public.servicio_marcar_asistencia_sesion(uuid, uuid, jsonb) to service_role;

commit;
