-- SOLO marcar asistencia con matricula_ref (NOT NULL en tu esquema).
-- Pégaloo completo en el SQL Editor de la SECUNDARIA.
-- No vuelvas a ejecutar 20260810194000 después de este script.

begin;

-- Asegura columnas usadas por el RPC
alter table public.asistencia_sesion
  add column if not exists sesion_en_vivo_id uuid,
  add column if not exists matricula_ref uuid,
  add column if not exists estudiante_identidad_ref uuid,
  add column if not exists estado text default 'AUSENTE',
  add column if not exists marcado_en timestamptz default now(),
  add column if not exists marcado_por uuid,
  add column if not exists creado_en timestamptz default now(),
  add column if not exists actualizado_en timestamptz default now();

create or replace function public.servicio_marcar_asistencia_sesion(
  p_sesion_id uuid,
  p_marcador_identidad_ref uuid,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_sesion public.sesion_en_vivo;
  v_item jsonb;
  v_estudiante uuid;
  v_matricula_id uuid;
  v_estado text;
  v_count integer := 0;
  v_col_est text := public._servicio_columna_estudiante_matricula();
  v_actualizado integer;
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
    v_matricula_id := null;
    v_estudiante := null;

    begin
      v_matricula_id := nullif(trim(coalesce(v_item->>'matriculaId', '')), '')::uuid;
    exception
      when others then
        v_matricula_id := null;
    end;

    begin
      v_estudiante := nullif(trim(coalesce(v_item->>'estudianteId', '')), '')::uuid;
    exception
      when others then
        v_estudiante := null;
    end;

    -- Resolver matrícula: por id directo o por estudiante en la edición
    if v_matricula_id is null and v_estudiante is not null then
      execute format(
        'select m.id
         from public.matricula_curso m
         where m.edicion_curso_id = $1
           and m.%I = $2
         limit 1',
        v_col_est
      )
      into v_matricula_id
      using v_sesion.edicion_curso_id, v_estudiante;
    end if;

    if v_matricula_id is null then
      continue;
    end if;

    -- Completar estudiante desde la matrícula si faltaba
    if v_estudiante is null then
      execute format(
        'select m.%I from public.matricula_curso m where m.id = $1',
        v_col_est
      )
      into v_estudiante
      using v_matricula_id;
    end if;

    -- Validar que la matrícula pertenece a la edición de la sesión
    if not exists (
      select 1
      from public.matricula_curso m
      where m.id = v_matricula_id
        and m.edicion_curso_id = v_sesion.edicion_curso_id
    ) then
      continue;
    end if;

    v_estado := upper(trim(coalesce(v_item->>'estado', 'AUSENTE')));
    if v_estado not in ('PRESENTE', 'AUSENTE', 'TARDANZA') then
      v_estado := 'AUSENTE';
    end if;

    update public.asistencia_sesion
    set
      estado = v_estado,
      matricula_ref = v_matricula_id,
      estudiante_identidad_ref = coalesce(estudiante_identidad_ref, v_estudiante),
      marcado_en = now(),
      marcado_por = p_marcador_identidad_ref,
      actualizado_en = now()
    where sesion_en_vivo_id = p_sesion_id
      and (
        matricula_ref = v_matricula_id
        or (v_estudiante is not null and estudiante_identidad_ref = v_estudiante)
      );

    get diagnostics v_actualizado = row_count;

    if v_actualizado = 0 then
      insert into public.asistencia_sesion (
        id,
        sesion_en_vivo_id,
        matricula_ref,
        estudiante_identidad_ref,
        estado,
        marcado_en,
        marcado_por,
        creado_en,
        actualizado_en
      ) values (
        gen_random_uuid(),
        p_sesion_id,
        v_matricula_id,
        v_estudiante,
        v_estado,
        now(),
        p_marcador_identidad_ref,
        now(),
        now()
      );
    end if;

    v_count := v_count + 1;
  end loop;

  if v_count = 0 then
    return jsonb_build_object(
      'ok', false,
      'error', 'Ningun alumno valido para marcar (revisa matriculaId/estudianteId)'
    );
  end if;

  return public.servicio_listar_asistencia_sesion(p_sesion_id)
    || jsonb_build_object('marcados', v_count);
end;
$$;

revoke all on function public.servicio_marcar_asistencia_sesion(uuid, uuid, jsonb)
  from public, anon, authenticated;
grant execute on function public.servicio_marcar_asistencia_sesion(uuid, uuid, jsonb)
  to service_role;

-- Verificación rápida: debe mencionar matricula_ref en la definición
select
  case
    when pg_get_functiondef('public.servicio_marcar_asistencia_sesion(uuid,uuid,jsonb)'::regprocedure)
         ilike '%matricula_ref%'
    then 'OK: funcion actualizada con matricula_ref'
    else 'ERROR: la funcion NO menciona matricula_ref'
  end as verificacion;

commit;
