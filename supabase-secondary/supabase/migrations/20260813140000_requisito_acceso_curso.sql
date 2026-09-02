-- Requisitos de acceso enlazados (curso previo verificable).
-- Ejecutar en el SQL Editor del proyecto SECUNDARIO.
--
-- Qué hace:
-- 1) Tabla relacional requisito_acceso_curso (sin texto libre).
-- 2) Sincroniza desde el JSON del borrador (campo requisitos[]).
-- 3) Valida si un estudiante cumple los requisitos antes de matricular.
--
-- El front guarda en documento_borrador_curso:
--   requisitosAccesoActivos: boolean
--   requisitos: [{ tipo, cursoId, cursoTitulo, condicion }]
-- Tras guardar-curso conviene llamar servicio_sincronizar_requisitos_acceso.

begin;

create table if not exists public.requisito_acceso_curso (
  id uuid primary key default gen_random_uuid(),
  curso_id uuid not null references public.curso (id) on delete cascade,
  curso_requerido_id uuid not null references public.curso (id) on delete restrict,
  condicion text not null
    check (condicion in ('COMPLETADO', 'CERTIFICADO')),
  orden integer not null default 0,
  creado_en timestamptz not null default now(),
  constraint requisito_acceso_curso_unico
    unique (curso_id, curso_requerido_id),
  constraint requisito_acceso_curso_no_self
    check (curso_id <> curso_requerido_id)
);

create index if not exists requisito_acceso_curso_curso_idx
  on public.requisito_acceso_curso (curso_id);

create index if not exists requisito_acceso_curso_requerido_idx
  on public.requisito_acceso_curso (curso_requerido_id);

comment on table public.requisito_acceso_curso is
  'Prerrequisitos verificables: el alumno debe completar o certificar otro curso.';

-- ---------------------------------------------------------------------------
-- Sync desde documento JSON del constructor
-- ---------------------------------------------------------------------------
create or replace function public.servicio_sincronizar_requisitos_acceso(
  p_curso_id uuid,
  p_documento jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_activos boolean;
  v_items jsonb;
  v_item jsonb;
  v_orden integer := 0;
  v_curso_req uuid;
  v_condicion text;
  v_insertados integer := 0;
begin
  if p_curso_id is null then
    raise exception 'curso_id requerido';
  end if;

  v_activos := coalesce((p_documento->>'requisitosAccesoActivos')::boolean, false);
  v_items := coalesce(p_documento->'requisitos', '[]'::jsonb);

  if not v_activos
     or jsonb_typeof(v_items) <> 'array'
     or jsonb_array_length(v_items) = 0 then
    delete from public.requisito_acceso_curso
    where curso_id = p_curso_id;

    return jsonb_build_object(
      'ok', true,
      'cursoId', p_curso_id,
      'activos', false,
      'total', 0
    );
  end if;

  delete from public.requisito_acceso_curso
  where curso_id = p_curso_id;

  for v_item in
    select value
    from jsonb_array_elements(v_items)
  loop
    if coalesce(v_item->>'tipo', 'CURSO_PREVIO') <> 'CURSO_PREVIO' then
      continue;
    end if;

    begin
      v_curso_req := nullif(trim(coalesce(v_item->>'cursoId', '')), '')::uuid;
    exception when others then
      v_curso_req := null;
    end;

    if v_curso_req is null or v_curso_req = p_curso_id then
      continue;
    end if;

    if not exists (select 1 from public.curso c where c.id = v_curso_req) then
      continue;
    end if;

    v_condicion := upper(trim(coalesce(v_item->>'condicion', 'COMPLETADO')));
    if v_condicion not in ('COMPLETADO', 'CERTIFICADO') then
      v_condicion := 'COMPLETADO';
    end if;

    insert into public.requisito_acceso_curso (
      curso_id, curso_requerido_id, condicion, orden
    ) values (
      p_curso_id, v_curso_req, v_condicion, v_orden
    )
    on conflict (curso_id, curso_requerido_id) do update
      set condicion = excluded.condicion,
          orden = excluded.orden;

    v_orden := v_orden + 1;
    v_insertados := v_insertados + 1;
  end loop;

  return jsonb_build_object(
    'ok', true,
    'cursoId', p_curso_id,
    'activos', true,
    'total', v_insertados
  );
end;
$$;

revoke all on function public.servicio_sincronizar_requisitos_acceso(uuid, jsonb)
  from public, anon, authenticated;
grant execute on function public.servicio_sincronizar_requisitos_acceso(uuid, jsonb)
  to service_role;

-- ---------------------------------------------------------------------------
-- ¿El estudiante cumple un requisito concreto?
-- ---------------------------------------------------------------------------
create or replace function public._requisito_cumplido(
  p_estudiante_identidad_ref uuid,
  p_curso_requerido_id uuid,
  p_condicion text
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_ok boolean := false;
begin
  if p_estudiante_identidad_ref is null or p_curso_requerido_id is null then
    return false;
  end if;

  if upper(coalesce(p_condicion, 'COMPLETADO')) = 'CERTIFICADO' then
    select exists (
      select 1
      from public.certificado_curso cc
      join public.matricula_curso m on m.id = cc.matricula_curso_id
      join public.edicion_curso e on e.id = m.edicion_curso_id
      join public.version_curso v on v.id = e.version_curso_id
      where cc.revocado_en is null
        and m.estudiante_identidad_ref = p_estudiante_identidad_ref
        and v.curso_id = p_curso_requerido_id
    ) into v_ok;
    return coalesce(v_ok, false);
  end if;

  -- COMPLETADO: progreso 100 o estado de matrícula completada
  select exists (
    select 1
    from public.matricula_curso m
    join public.edicion_curso e on e.id = m.edicion_curso_id
    join public.version_curso v on v.id = e.version_curso_id
    where m.estudiante_identidad_ref = p_estudiante_identidad_ref
      and v.curso_id = p_curso_requerido_id
      and (
        coalesce(m.progreso_porcentaje, 0) >= 100
        or upper(m.estado::text) in (
          'COMPLETADA', 'COMPLETADO', 'FINALIZADA', 'FINALIZADO', 'DONE'
        )
      )
  ) into v_ok;

  return coalesce(v_ok, false);
end;
$$;

-- ---------------------------------------------------------------------------
-- Validación completa para un curso destino
-- ---------------------------------------------------------------------------
create or replace function public.servicio_validar_requisitos_acceso(
  p_curso_id uuid,
  p_estudiante_identidad_ref uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_req record;
  v_faltantes jsonb := '[]'::jsonb;
  v_titulo text;
begin
  if p_curso_id is null or p_estudiante_identidad_ref is null then
    raise exception 'curso y estudiante requeridos';
  end if;

  for v_req in
    select r.curso_requerido_id, r.condicion, c.titulo
    from public.requisito_acceso_curso r
    join public.curso c on c.id = r.curso_requerido_id
    where r.curso_id = p_curso_id
    order by r.orden, c.titulo
  loop
    if not public._requisito_cumplido(
      p_estudiante_identidad_ref,
      v_req.curso_requerido_id,
      v_req.condicion
    ) then
      v_titulo := coalesce(v_req.titulo, 'Curso previo');
      v_faltantes := v_faltantes || jsonb_build_array(
        jsonb_build_object(
          'cursoId', v_req.curso_requerido_id,
          'cursoTitulo', v_titulo,
          'condicion', v_req.condicion,
          'mensaje', case
            when v_req.condicion = 'CERTIFICADO'
              then format('Debes tener certificado en: %s', v_titulo)
            else format('Debes completar: %s', v_titulo)
          end
        )
      );
    end if;
  end loop;

  return jsonb_build_object(
    'ok', true,
    'cumple', jsonb_array_length(v_faltantes) = 0,
    'faltantes', v_faltantes
  );
end;
$$;

revoke all on function public.servicio_validar_requisitos_acceso(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.servicio_validar_requisitos_acceso(uuid, uuid)
  to service_role;

-- ---------------------------------------------------------------------------
-- Backfill desde borradores ya guardados
-- ---------------------------------------------------------------------------
do $$
declare
  v_row record;
begin
  for v_row in
    select d.curso_id, d.documento
    from public.documento_borrador_curso d
    where d.documento ? 'requisitos'
  loop
    perform public.servicio_sincronizar_requisitos_acceso(
      v_row.curso_id,
      v_row.documento
    );
  end loop;
end;
$$;

commit;

-- ---------------------------------------------------------------------------
-- Cómo cablear (gateway / API):
-- 1) Tras guardar-curso exitoso:
--      rpc servicio_sincronizar_requisitos_acceso(cursoId, documento)
-- 2) Antes de matricular-curso / matricular-estudiante:
--      rpc servicio_validar_requisitos_acceso(cursoId, estudianteIdentidadRef)
--      si cumple=false → 409 con faltantes[].mensaje
-- ---------------------------------------------------------------------------
