-- Pases de asistencia (múltiples llamadas de lista por sesión) + resumen.

begin;

create table if not exists public.pase_asistencia_sesion (
  id uuid primary key default gen_random_uuid(),
  sesion_en_vivo_id uuid not null references public.sesion_en_vivo(id) on delete cascade,
  numero integer not null,
  titulo text,
  estado text not null default 'ABIERTO',
  codigo text,
  abierto_en timestamptz not null default now(),
  cerrado_en timestamptz,
  abierto_por uuid,
  creado_en timestamptz not null default now(),
  constraint pase_asistencia_estado_chk check (estado in ('ABIERTO', 'CERRADO')),
  constraint pase_asistencia_numero_chk check (numero >= 1)
);

create unique index if not exists pase_asistencia_sesion_numero_uq
  on public.pase_asistencia_sesion (sesion_en_vivo_id, numero);

create index if not exists pase_asistencia_sesion_sesion_idx
  on public.pase_asistencia_sesion (sesion_en_vivo_id, numero desc);

create table if not exists public.asistencia_pase (
  id uuid primary key default gen_random_uuid(),
  pase_id uuid not null references public.pase_asistencia_sesion(id) on delete cascade,
  estudiante_identidad_ref uuid not null,
  matricula_ref uuid,
  estado text not null default 'AUSENTE',
  marcado_en timestamptz not null default now(),
  marcado_por uuid,
  constraint asistencia_pase_estado_chk check (
    estado in ('PRESENTE', 'AUSENTE', 'TARDANZA', 'SIN_MARCAR')
  )
);

create unique index if not exists asistencia_pase_unica_idx
  on public.asistencia_pase (pase_id, estudiante_identidad_ref);

create index if not exists asistencia_pase_pase_idx
  on public.asistencia_pase (pase_id);

-- ---------------------------------------------------------------------------
-- Abrir nuevo pase (llamar lista)
-- ---------------------------------------------------------------------------

create or replace function public.servicio_abrir_pase_asistencia(
  p_sesion_id uuid,
  p_abierto_por uuid default null,
  p_titulo text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_numero integer;
  v_pase public.pase_asistencia_sesion%rowtype;
  v_codigo text;
begin
  if p_sesion_id is null then
    raise exception 'Sesion requerida';
  end if;
  if not exists (select 1 from public.sesion_en_vivo where id = p_sesion_id) then
    raise exception 'Sesion no encontrada';
  end if;

  select coalesce(max(numero), 0) + 1 into v_numero
  from public.pase_asistencia_sesion
  where sesion_en_vivo_id = p_sesion_id;

  v_codigo := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));

  insert into public.pase_asistencia_sesion (
    sesion_en_vivo_id, numero, titulo, estado, codigo, abierto_por
  ) values (
    p_sesion_id,
    v_numero,
    coalesce(nullif(trim(p_titulo), ''), 'Llamada ' || v_numero::text),
    'ABIERTO',
    v_codigo,
    p_abierto_por
  )
  returning * into v_pase;

  return jsonb_build_object(
    'ok', true,
    'pase', jsonb_build_object(
      'id', v_pase.id,
      'sesionId', v_pase.sesion_en_vivo_id,
      'numero', v_pase.numero,
      'titulo', v_pase.titulo,
      'estado', v_pase.estado,
      'codigo', v_pase.codigo,
      'abiertoEn', v_pase.abierto_en,
      'cerradoEn', v_pase.cerrado_en
    )
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Cerrar pase
-- ---------------------------------------------------------------------------

create or replace function public.servicio_cerrar_pase_asistencia(
  p_pase_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pase public.pase_asistencia_sesion%rowtype;
begin
  if p_pase_id is null then
    raise exception 'Pase requerido';
  end if;

  update public.pase_asistencia_sesion
  set estado = 'CERRADO', cerrado_en = coalesce(cerrado_en, now())
  where id = p_pase_id
  returning * into v_pase;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Pase no encontrado');
  end if;

  perform public.servicio_sincronizar_resumen_asistencia_sesion(v_pase.sesion_en_vivo_id);

  return jsonb_build_object(
    'ok', true,
    'pase', jsonb_build_object(
      'id', v_pase.id,
      'sesionId', v_pase.sesion_en_vivo_id,
      'numero', v_pase.numero,
      'titulo', v_pase.titulo,
      'estado', v_pase.estado,
      'codigo', v_pase.codigo,
      'abiertoEn', v_pase.abierto_en,
      'cerradoEn', v_pase.cerrado_en
    )
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Listar pases + resumen por alumno
-- ---------------------------------------------------------------------------

create or replace function public.servicio_listar_pases_asistencia(
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
  v_pases jsonb;
  v_resumen jsonb;
  v_col_est text;
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

  select coalesce(jsonb_agg(item order by (item->>'numero')::int), '[]'::jsonb)
  into v_pases
  from (
    select jsonb_build_object(
      'id', p.id,
      'sesionId', p.sesion_en_vivo_id,
      'numero', p.numero,
      'titulo', p.titulo,
      'estado', p.estado,
      'codigo', p.codigo,
      'abiertoEn', p.abierto_en,
      'cerradoEn', p.cerrado_en,
      'presentes', (
        select count(*)::int from public.asistencia_pase a
        where a.pase_id = p.id and a.estado in ('PRESENTE', 'TARDANZA')
      )
    ) as item
    from public.pase_asistencia_sesion p
    where p.sesion_en_vivo_id = p_sesion_id
  ) listado;

  begin
    v_col_est := public._servicio_columna_estudiante_matricula();
  exception when others then
    v_col_est := 'estudiante_identidad_ref';
  end;

  execute format(
    $q$
    select coalesce(jsonb_agg(item order by item->>'nombre'), '[]'::jsonb)
    from (
      select jsonb_build_object(
        'estudianteId', m.%1$I,
        'matriculaId', m.id,
        'nombre', coalesce(a.nombre_mostrar, a.correo, 'Estudiante'),
        'iniciales', upper(left(coalesce(a.nombre_mostrar, a.correo, 'ES'), 2)),
        'pasesPresente', (
          select count(*)::int
          from public.asistencia_pase ap
          join public.pase_asistencia_sesion p on p.id = ap.pase_id
          where p.sesion_en_vivo_id = $1
            and ap.estudiante_identidad_ref = m.%1$I
            and ap.estado in ('PRESENTE', 'TARDANZA')
        ),
        'pasesTotales', (
          select count(*)::int
          from public.pase_asistencia_sesion p
          where p.sesion_en_vivo_id = $1
        ),
        'porcentajeAsistencia', case
          when (select count(*) from public.pase_asistencia_sesion p where p.sesion_en_vivo_id = $1) = 0
            then null
          else round(
            100.0 * (
              select count(*)::numeric
              from public.asistencia_pase ap
              join public.pase_asistencia_sesion p on p.id = ap.pase_id
              where p.sesion_en_vivo_id = $1
                and ap.estudiante_identidad_ref = m.%1$I
                and ap.estado in ('PRESENTE', 'TARDANZA')
            ) / nullif((
              select count(*)::numeric from public.pase_asistencia_sesion p
              where p.sesion_en_vivo_id = $1
            ), 0)
          , 0)
        end
      ) as item
      from public.matricula_curso m
      left join public.acceso_identidad_principal a
        on a.identidad_principal_ref = m.%1$I
      where m.edicion_curso_id = $2
        and upper(trim(coalesce(m.estado::text, 'ACTIVA'))) not in (
          'PENDIENTE', 'CANCELADA', 'INACTIVA', 'RETIRADA'
        )
    ) listado
    $q$,
    v_col_est
  )
  into v_resumen
  using p_sesion_id, v_sesion.edicion_curso_id;

  return jsonb_build_object(
    'ok', true,
    'sesionId', p_sesion_id,
    'totalPases', jsonb_array_length(coalesce(v_pases, '[]'::jsonb)),
    'pases', coalesce(v_pases, '[]'::jsonb),
    'resumenAlumnos', coalesce(v_resumen, '[]'::jsonb)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Listar / marcar asistencia de un pase
-- ---------------------------------------------------------------------------

create or replace function public.servicio_listar_asistencia_pase(
  p_pase_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_pase public.pase_asistencia_sesion;
  v_sesion public.sesion_en_vivo;
  v_items jsonb;
  v_col_est text;
begin
  if p_pase_id is null then
    raise exception 'Pase requerido';
  end if;

  select * into v_pase from public.pase_asistencia_sesion where id = p_pase_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Pase no encontrado');
  end if;

  select * into v_sesion from public.sesion_en_vivo where id = v_pase.sesion_en_vivo_id;

  begin
    v_col_est := public._servicio_columna_estudiante_matricula();
  exception when others then
    v_col_est := 'estudiante_identidad_ref';
  end;

  execute format(
    $q$
    select coalesce(jsonb_agg(item order by item->>'nombre'), '[]'::jsonb)
    from (
      select jsonb_build_object(
        'estudianteId', m.%1$I,
        'matriculaId', m.id,
        'nombre', coalesce(a.nombre_mostrar, a.correo, 'Estudiante'),
        'iniciales', upper(left(coalesce(a.nombre_mostrar, a.correo, 'ES'), 2)),
        'estado', coalesce(ap.estado, 'SIN_MARCAR'),
        'marcadoEn', ap.marcado_en
      ) as item
      from public.matricula_curso m
      left join public.acceso_identidad_principal a
        on a.identidad_principal_ref = m.%1$I
      left join public.asistencia_pase ap
        on ap.pase_id = $1 and ap.estudiante_identidad_ref = m.%1$I
      where m.edicion_curso_id = $2
        and upper(trim(coalesce(m.estado::text, 'ACTIVA'))) not in (
          'PENDIENTE', 'CANCELADA', 'INACTIVA', 'RETIRADA'
        )
    ) listado
    $q$,
    v_col_est
  )
  into v_items
  using p_pase_id, v_sesion.edicion_curso_id;

  return jsonb_build_object(
    'ok', true,
    'paseId', p_pase_id,
    'sesionId', v_pase.sesion_en_vivo_id,
    'numero', v_pase.numero,
    'titulo', v_pase.titulo,
    'estado', v_pase.estado,
    'codigo', v_pase.codigo,
    'total', jsonb_array_length(coalesce(v_items, '[]'::jsonb)),
    'presentes', (
      select count(*)::int
      from jsonb_array_elements(coalesce(v_items, '[]'::jsonb)) x
      where x->>'estado' in ('PRESENTE', 'TARDANZA')
    ),
    'asistencias', coalesce(v_items, '[]'::jsonb)
  );
end;
$$;

create or replace function public.servicio_marcar_asistencia_pase(
  p_pase_id uuid,
  p_marcador_identidad_ref uuid,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pase public.pase_asistencia_sesion;
  v_item jsonb;
  v_est uuid;
  v_mat uuid;
  v_estado text;
begin
  if p_pase_id is null then
    raise exception 'Pase requerido';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 then
    raise exception 'Se requiere al menos un item de asistencia';
  end if;

  select * into v_pase from public.pase_asistencia_sesion where id = p_pase_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Pase no encontrado');
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    begin
      v_est := nullif(trim(v_item->>'estudianteId'), '')::uuid;
    exception when others then
      v_est := null;
    end;
    begin
      v_mat := nullif(trim(v_item->>'matriculaId'), '')::uuid;
    exception when others then
      v_mat := null;
    end;
    v_estado := upper(trim(coalesce(v_item->>'estado', 'AUSENTE')));
    if v_estado not in ('PRESENTE', 'AUSENTE', 'TARDANZA') then
      v_estado := 'AUSENTE';
    end if;
    if v_est is null then
      continue;
    end if;

    insert into public.asistencia_pase as t (
      pase_id, estudiante_identidad_ref, matricula_ref, estado, marcado_por, marcado_en
    ) values (
      p_pase_id, v_est, v_mat, v_estado, p_marcador_identidad_ref, now()
    )
    on conflict (pase_id, estudiante_identidad_ref) do update set
      estado = excluded.estado,
      matricula_ref = coalesce(excluded.matricula_ref, t.matricula_ref),
      marcado_por = excluded.marcado_por,
      marcado_en = now();
  end loop;

  perform public.servicio_sincronizar_resumen_asistencia_sesion(v_pase.sesion_en_vivo_id);

  return public.servicio_listar_asistencia_pase(p_pase_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- Check-in alumno por código (opcional)
-- ---------------------------------------------------------------------------

create or replace function public.servicio_checkin_pase_por_codigo(
  p_sesion_id uuid,
  p_codigo text,
  p_estudiante_identidad_ref uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pase public.pase_asistencia_sesion;
  v_codigo text := upper(trim(coalesce(p_codigo, '')));
begin
  if p_sesion_id is null or p_estudiante_identidad_ref is null then
    raise exception 'Sesion y estudiante requeridos';
  end if;
  if v_codigo = '' then
    raise exception 'Codigo requerido';
  end if;

  select * into v_pase
  from public.pase_asistencia_sesion
  where sesion_en_vivo_id = p_sesion_id
    and estado = 'ABIERTO'
    and upper(coalesce(codigo, '')) = v_codigo
  order by numero desc
  limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Codigo invalido o pase cerrado');
  end if;

  insert into public.asistencia_pase as t (
    pase_id, estudiante_identidad_ref, estado, marcado_por, marcado_en
  ) values (
    v_pase.id, p_estudiante_identidad_ref, 'PRESENTE', p_estudiante_identidad_ref, now()
  )
  on conflict (pase_id, estudiante_identidad_ref) do update set
    estado = 'PRESENTE',
    marcado_por = excluded.marcado_por,
    marcado_en = now();

  perform public.servicio_sincronizar_resumen_asistencia_sesion(p_sesion_id);

  return jsonb_build_object(
    'ok', true,
    'paseId', v_pase.id,
    'numero', v_pase.numero,
    'estado', 'PRESENTE'
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Resumen legacy en asistencia_sesion (compat panel antiguo / cert)
-- ---------------------------------------------------------------------------

create or replace function public.servicio_sincronizar_resumen_asistencia_sesion(
  p_sesion_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sesion public.sesion_en_vivo;
  v_col_est text;
  v_total_pases integer;
begin
  select * into v_sesion from public.sesion_en_vivo where id = p_sesion_id;
  if not found then
    return;
  end if;

  select count(*)::int into v_total_pases
  from public.pase_asistencia_sesion
  where sesion_en_vivo_id = p_sesion_id;

  if v_total_pases = 0 then
    return;
  end if;

  begin
    v_col_est := public._servicio_columna_estudiante_matricula();
  exception when others then
    v_col_est := 'estudiante_identidad_ref';
  end;

  execute format(
    $q$
    with alumnos as (
      select m.%1$I as estudiante_id
      from public.matricula_curso m
      where m.edicion_curso_id = $3
        and upper(trim(coalesce(m.estado::text, 'ACTIVA'))) not in (
          'PENDIENTE', 'CANCELADA', 'INACTIVA', 'RETIRADA'
        )
        and m.%1$I is not null
    ),
    calc as (
      select
        a.estudiante_id,
        case
          when (
            select count(*) from public.asistencia_pase ap
            join public.pase_asistencia_sesion p on p.id = ap.pase_id
            where p.sesion_en_vivo_id = $1
              and ap.estudiante_identidad_ref = a.estudiante_id
              and ap.estado in ('PRESENTE', 'TARDANZA')
          ) * 100.0 / $2 >= 50
          then 'PRESENTE'
          else 'AUSENTE'
        end as estado_calc
      from alumnos a
    )
    insert into public.asistencia_sesion (
      sesion_en_vivo_id, estudiante_identidad_ref, estado, marcado_en, actualizado_en
    )
    select $1, c.estudiante_id, c.estado_calc, now(), now()
    from calc c
    on conflict do nothing
    $q$,
    v_col_est
  )
  using p_sesion_id, v_total_pases, v_sesion.edicion_curso_id;

  -- Actualiza filas ya existentes (si el unique parcial no disparó upsert).
  execute format(
    $q$
    update public.asistencia_sesion t
    set
      estado = case
        when (
          select count(*) from public.asistencia_pase ap
          join public.pase_asistencia_sesion p on p.id = ap.pase_id
          where p.sesion_en_vivo_id = $1
            and ap.estudiante_identidad_ref = t.estudiante_identidad_ref
            and ap.estado in ('PRESENTE', 'TARDANZA')
        ) * 100.0 / $2 >= 50
        then 'PRESENTE'
        else 'AUSENTE'
      end,
      marcado_en = now(),
      actualizado_en = now()
    where t.sesion_en_vivo_id = $1
    $q$
  )
  using p_sesion_id, v_total_pases;
exception when others then
  raise notice 'sincronizar resumen asistencia: %', sqlerrm;
end;
$$;

revoke all on function public.servicio_abrir_pase_asistencia(uuid, uuid, text) from public;
revoke all on function public.servicio_cerrar_pase_asistencia(uuid) from public;
revoke all on function public.servicio_listar_pases_asistencia(uuid) from public;
revoke all on function public.servicio_listar_asistencia_pase(uuid) from public;
revoke all on function public.servicio_marcar_asistencia_pase(uuid, uuid, jsonb) from public;
revoke all on function public.servicio_checkin_pase_por_codigo(uuid, text, uuid) from public;
revoke all on function public.servicio_sincronizar_resumen_asistencia_sesion(uuid) from public;

grant execute on function public.servicio_abrir_pase_asistencia(uuid, uuid, text) to service_role;
grant execute on function public.servicio_cerrar_pase_asistencia(uuid) to service_role;
grant execute on function public.servicio_listar_pases_asistencia(uuid) to service_role;
grant execute on function public.servicio_listar_asistencia_pase(uuid) to service_role;
grant execute on function public.servicio_marcar_asistencia_pase(uuid, uuid, jsonb) to service_role;
grant execute on function public.servicio_checkin_pase_por_codigo(uuid, text, uuid) to service_role;
grant execute on function public.servicio_sincronizar_resumen_asistencia_sesion(uuid) to service_role;

commit;
