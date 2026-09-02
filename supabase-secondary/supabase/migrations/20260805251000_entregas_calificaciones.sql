-- Entregas PDF mínimas + calificar / observar.
-- Ejecutar en el SQL Editor del proyecto SECUNDARIO.
begin;

create table if not exists public.entrega_actividad (
  id uuid primary key default gen_random_uuid(),
  matricula_curso_id uuid not null
    references public.matricula_curso(id) on delete cascade,
  actividad_curso_id uuid not null
    references public.actividad_curso(id) on delete cascade,
  intento integer not null default 1 check (intento > 0),
  estado text not null default 'EN_REVISION'
    check (estado in (
      'SIN_ENTREGAR',
      'ENTREGADA',
      'EN_REVISION',
      'CALIFICADA',
      'OBSERVADA',
      'ATRASADA'
    )),
  entregada_en timestamptz,
  calificada_en timestamptz,
  nota numeric(5,2),
  retroalimentacion text,
  archivo_nombre text,
  archivo_tipo text,
  archivo_tamanio integer,
  archivo_contenido text,
  docente_calificador_ref uuid,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint entrega_actividad_matricula_actividad_uq
    unique (matricula_curso_id, actividad_curso_id)
);

create index if not exists entrega_actividad_estado_idx
  on public.entrega_actividad (estado);

create index if not exists entrega_actividad_actividad_idx
  on public.entrega_actividad (actividad_curso_id);

revoke all on table public.entrega_actividad from public, anon, authenticated;

create or replace function public._servicio_mapear_entrega(p_entrega public.entrega_actividad)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_curso_id uuid;
  v_curso_titulo text;
  v_modulo_id uuid;
  v_modulo_titulo text;
  v_actividad_titulo text;
  v_estudiante_id uuid;
  v_estudiante_nombre text;
  v_organizacion text;
begin
  select
    c.id,
    c.titulo,
    m.id,
    m.titulo,
    a.titulo,
    mat.estudiante_identidad_ref
  into
    v_curso_id,
    v_curso_titulo,
    v_modulo_id,
    v_modulo_titulo,
    v_actividad_titulo,
    v_estudiante_id
  from public.entrega_actividad e
  join public.matricula_curso mat on mat.id = e.matricula_curso_id
  join public.edicion_curso ed on ed.id = mat.edicion_curso_id
  join public.version_curso v on v.id = ed.version_curso_id
  join public.curso c on c.id = v.curso_id
  join public.actividad_curso a on a.id = e.actividad_curso_id
  join public.modulo_curso m on m.id = a.modulo_curso_id
  where e.id = p_entrega.id;

  select coalesce(acc.nombre_mostrar, acc.correo, 'Estudiante')
    into v_estudiante_nombre
  from public.acceso_identidad_principal acc
  where acc.identidad_principal_ref = v_estudiante_id;

  select ci.nombre_organizacion
    into v_organizacion
  from public.contexto_instalacion ci
  where ci.id = true;

  return jsonb_build_object(
    'id', p_entrega.id,
    'organizacionId', null,
    'organizacionNombre', coalesce(v_organizacion, 'Tukuy Academy'),
    'cursoId', v_curso_id,
    'cursoTitulo', coalesce(v_curso_titulo, 'Curso'),
    'moduloId', v_modulo_id,
    'moduloTitulo', coalesce(v_modulo_titulo, 'Módulo'),
    'actividadId', p_entrega.actividad_curso_id,
    'actividadTitulo', coalesce(v_actividad_titulo, 'Actividad'),
    'estudianteId', v_estudiante_id,
    'estudianteNombre', coalesce(v_estudiante_nombre, 'Estudiante'),
    'estudianteIniciales', upper(left(coalesce(v_estudiante_nombre, 'ES'), 2)),
    'intento', p_entrega.intento,
    'entregadaEn', p_entrega.entregada_en,
    'estado', p_entrega.estado,
    'archivo', case
      when p_entrega.archivo_nombre is null then null
      else jsonb_build_object(
        'id', p_entrega.id::text,
        'nombre', p_entrega.archivo_nombre,
        'tipo', coalesce(p_entrega.archivo_tipo, 'application/pdf'),
        'tamanio', coalesce(p_entrega.archivo_tamanio, 0),
        'referencia', 'secundaria/' || p_entrega.id::text,
        'contenidoBase64', p_entrega.archivo_contenido
      )
    end,
    'nota', p_entrega.nota,
    'retroalimentacion', p_entrega.retroalimentacion,
    'calificadaEn', p_entrega.calificada_en,
    'horasReconocidas', case
      when p_entrega.estado = 'CALIFICADA' then 4
      else 0
    end
  );
end;
$$;

create or replace function public.servicio_listar_entregas(
  p_curso_id uuid default null,
  p_estudiante_identidad_ref uuid default null,
  p_incluir_archivo boolean default false
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
  select coalesce(jsonb_agg(item order by item->>'entregadaEn' desc nulls last), '[]'::jsonb)
  into v_items
  from (
    select case
      when p_incluir_archivo then public._servicio_mapear_entrega(e)
      else (public._servicio_mapear_entrega(e) - 'archivo')
        || jsonb_build_object(
          'archivo',
          case
            when e.archivo_nombre is null then null
            else jsonb_build_object(
              'id', e.id::text,
              'nombre', e.archivo_nombre,
              'tipo', coalesce(e.archivo_tipo, 'application/pdf'),
              'tamanio', coalesce(e.archivo_tamanio, 0),
              'referencia', 'secundaria/' || e.id::text
            )
          end
        )
    end as item
    from public.entrega_actividad e
    join public.matricula_curso mat on mat.id = e.matricula_curso_id
    join public.edicion_curso ed on ed.id = mat.edicion_curso_id
    join public.version_curso v on v.id = ed.version_curso_id
    where (p_curso_id is null or v.curso_id = p_curso_id)
      and (
        p_estudiante_identidad_ref is null
        or mat.estudiante_identidad_ref = p_estudiante_identidad_ref
      )
  ) listado;

  return jsonb_build_object(
    'ok', true,
    'total', jsonb_array_length(v_items),
    'entregas', v_items
  );
end;
$$;

create or replace function public.servicio_obtener_entrega(
  p_entrega_id uuid,
  p_incluir_archivo boolean default true
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_entrega public.entrega_actividad%rowtype;
  v_item jsonb;
begin
  select * into v_entrega
  from public.entrega_actividad
  where id = p_entrega_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Entrega no encontrada');
  end if;

  v_item := public._servicio_mapear_entrega(v_entrega);
  if not coalesce(p_incluir_archivo, true) then
    v_item := (v_item - 'archivo') || jsonb_build_object(
      'archivo',
      case
        when v_entrega.archivo_nombre is null then null
        else jsonb_build_object(
          'id', v_entrega.id::text,
          'nombre', v_entrega.archivo_nombre,
          'tipo', coalesce(v_entrega.archivo_tipo, 'application/pdf'),
          'tamanio', coalesce(v_entrega.archivo_tamanio, 0),
          'referencia', 'secundaria/' || v_entrega.id::text
        )
      end
    );
  end if;

  return jsonb_build_object('ok', true, 'entrega', v_item);
end;
$$;

create or replace function public.servicio_enviar_entrega(
  p_curso_id uuid,
  p_actividad_id uuid,
  p_estudiante_identidad_ref uuid,
  p_archivo_nombre text,
  p_archivo_tipo text default 'application/pdf',
  p_archivo_tamanio integer default 0,
  p_archivo_contenido text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_matricula_id uuid;
  v_version_id uuid;
  v_tipo text;
  v_entrega public.entrega_actividad%rowtype;
  v_intento integer := 1;
begin
  if p_curso_id is null or p_actividad_id is null or p_estudiante_identidad_ref is null then
    raise exception 'Curso, actividad y estudiante son requeridos';
  end if;
  if coalesce(trim(p_archivo_nombre), '') = '' then
    raise exception 'Archivo requerido';
  end if;
  if coalesce(p_archivo_tamanio, 0) > 8_000_000 then
    raise exception 'El PDF debe pesar menos de 8 MB';
  end if;

  select v.id into v_version_id
  from public.version_curso v
  where v.curso_id = p_curso_id
  order by v.numero desc
  limit 1;

  if v_version_id is null then
    raise exception 'Curso sin versión';
  end if;

  if not exists (
    select 1
    from public.actividad_curso a
    join public.modulo_curso m on m.id = a.modulo_curso_id
    where a.id = p_actividad_id
      and m.version_curso_id = v_version_id
  ) then
    raise exception 'La actividad no pertenece al curso';
  end if;

  select lower(a.tipo) into v_tipo
  from public.actividad_curso a
  where a.id = p_actividad_id;

  if v_tipo not in ('assignment', 'entrega', 'entrega_pdf', 'proyecto', 'tarea') then
    -- Permite forzar entrega en demo aunque el tipo aún sea lectura.
    null;
  end if;

  select m.id into v_matricula_id
  from public.matricula_curso m
  join public.edicion_curso e on e.id = m.edicion_curso_id
  where e.version_curso_id = v_version_id
    and m.estudiante_identidad_ref = p_estudiante_identidad_ref
  limit 1;

  if v_matricula_id is null then
    perform public.servicio_matricular_estudiante(
      p_curso_id,
      p_estudiante_identidad_ref,
      'INSCRIPCION_DIRECTA'
    );
    select m.id into v_matricula_id
    from public.matricula_curso m
    join public.edicion_curso e on e.id = m.edicion_curso_id
    where e.version_curso_id = v_version_id
      and m.estudiante_identidad_ref = p_estudiante_identidad_ref
    limit 1;
  end if;

  if v_matricula_id is null then
    raise exception 'No se pudo resolver la matrícula';
  end if;

  select coalesce(intento, 0) + 1 into v_intento
  from public.entrega_actividad
  where matricula_curso_id = v_matricula_id
    and actividad_curso_id = p_actividad_id;

  insert into public.entrega_actividad (
    matricula_curso_id,
    actividad_curso_id,
    intento,
    estado,
    entregada_en,
    archivo_nombre,
    archivo_tipo,
    archivo_tamanio,
    archivo_contenido,
    nota,
    retroalimentacion,
    calificada_en,
    docente_calificador_ref,
    actualizado_en
  ) values (
    v_matricula_id,
    p_actividad_id,
    coalesce(v_intento, 1),
    'EN_REVISION',
    now(),
    p_archivo_nombre,
    coalesce(nullif(trim(p_archivo_tipo), ''), 'application/pdf'),
    coalesce(p_archivo_tamanio, 0),
    p_archivo_contenido,
    null,
    null,
    null,
    null,
    now()
  )
  on conflict (matricula_curso_id, actividad_curso_id) do update set
    intento = excluded.intento,
    estado = 'EN_REVISION',
    entregada_en = now(),
    archivo_nombre = excluded.archivo_nombre,
    archivo_tipo = excluded.archivo_tipo,
    archivo_tamanio = excluded.archivo_tamanio,
    archivo_contenido = excluded.archivo_contenido,
    nota = null,
    retroalimentacion = null,
    calificada_en = null,
    docente_calificador_ref = null,
    actualizado_en = now()
  returning * into v_entrega;

  return jsonb_build_object(
    'ok', true,
    'entrega', public._servicio_mapear_entrega(v_entrega)
  );
end;
$$;

create or replace function public.servicio_calificar_entrega(
  p_entrega_id uuid,
  p_nota numeric,
  p_retroalimentacion text default null,
  p_docente_identidad_ref uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_entrega public.entrega_actividad%rowtype;
  v_matricula_id uuid;
  v_actividad_id uuid;
begin
  if p_entrega_id is null then
    raise exception 'Entrega requerida';
  end if;
  if p_nota is null or p_nota < 0 or p_nota > 20 then
    raise exception 'La nota debe estar entre 0 y 20';
  end if;

  update public.entrega_actividad
  set
    estado = 'CALIFICADA',
    nota = p_nota,
    retroalimentacion = nullif(trim(coalesce(p_retroalimentacion, '')), ''),
    calificada_en = now(),
    docente_calificador_ref = p_docente_identidad_ref,
    actualizado_en = now()
  where id = p_entrega_id
    and archivo_nombre is not null
  returning * into v_entrega;

  if not found then
    raise exception 'La actividad aún no tiene una entrega';
  end if;

  v_matricula_id := v_entrega.matricula_curso_id;
  v_actividad_id := v_entrega.actividad_curso_id;

  insert into public.progreso_actividad (
    id, matricula_curso_id, actividad_ref, estado, mejor_nota, completada_en
  ) values (
    gen_random_uuid(),
    v_matricula_id,
    v_actividad_id,
    'COMPLETADA',
    p_nota,
    now()
  )
  on conflict (matricula_curso_id, actividad_ref) do update set
    estado = 'COMPLETADA',
    mejor_nota = excluded.mejor_nota,
    completada_en = coalesce(public.progreso_actividad.completada_en, now());

  return jsonb_build_object(
    'ok', true,
    'entrega', public._servicio_mapear_entrega(v_entrega)
  );
end;
$$;

create or replace function public.servicio_solicitar_correccion_entrega(
  p_entrega_id uuid,
  p_retroalimentacion text,
  p_docente_identidad_ref uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_entrega public.entrega_actividad%rowtype;
begin
  if p_entrega_id is null then
    raise exception 'Entrega requerida';
  end if;
  if coalesce(trim(p_retroalimentacion), '') = '' then
    raise exception 'La retroalimentación es requerida';
  end if;

  update public.entrega_actividad
  set
    estado = 'OBSERVADA',
    nota = null,
    retroalimentacion = trim(p_retroalimentacion),
    calificada_en = null,
    docente_calificador_ref = p_docente_identidad_ref,
    actualizado_en = now()
  where id = p_entrega_id
    and archivo_nombre is not null
  returning * into v_entrega;

  if not found then
    raise exception 'Entrega no encontrada';
  end if;

  return jsonb_build_object(
    'ok', true,
    'entrega', public._servicio_mapear_entrega(v_entrega)
  );
end;
$$;

create or replace function public.servicio_listar_modulos_curso(
  p_curso_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_version_id uuid;
  v_modulos jsonb;
begin
  if p_curso_id is null then
    raise exception 'Curso requerido';
  end if;

  select v.id into v_version_id
  from public.version_curso v
  where v.curso_id = p_curso_id
  order by v.numero desc
  limit 1;

  if v_version_id is null then
    return jsonb_build_object('ok', true, 'modulos', '[]'::jsonb);
  end if;

  select coalesce(jsonb_agg(modulo order by modulo->>'orden'), '[]'::jsonb)
  into v_modulos
  from (
    select jsonb_build_object(
      'id', m.id,
      'cursoId', p_curso_id,
      'titulo', m.titulo,
      'orden', m.orden,
      'ponderacion', 20,
      'horasRequeridas', 4,
      'actividades', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'id', a.id,
            'cursoId', p_curso_id,
            'moduloId', m.id,
            'titulo', a.titulo,
            'tipo', case lower(a.tipo)
              when 'quiz' then 'CUESTIONARIO'
              when 'proyecto' then 'PROYECTO'
              when 'assignment' then 'ENTREGA_PDF'
              when 'entrega' then 'ENTREGA_PDF'
              when 'entrega_pdf' then 'ENTREGA_PDF'
              when 'tarea' then 'ENTREGA_PDF'
              else 'ENTREGA_PDF'
            end,
            'orden', a.orden,
            'ponderacion', 100,
            'notaMaxima', 20,
            'horasReconocidas', 4,
            'obligatoria', true,
            'intentosPermitidos', 3
          )
          order by a.orden
        )
        from public.actividad_curso a
        where a.modulo_curso_id = m.id
      ), '[]'::jsonb)
    ) as modulo
    from public.modulo_curso m
    where m.version_curso_id = v_version_id
  ) listado;

  return jsonb_build_object('ok', true, 'modulos', v_modulos);
end;
$$;

-- Semilla: actividad tipo assignment en el curso demo (si aún no hay ninguna).
do $$
declare
  v_curso_id uuid := 'a1000000-0000-4000-8000-000000000001';
  v_version_id uuid;
  v_modulo_id uuid;
begin
  if not exists (select 1 from public.curso where id = v_curso_id) then
    return;
  end if;

  select v.id into v_version_id
  from public.version_curso v
  where v.curso_id = v_curso_id
  order by v.numero desc
  limit 1;

  if v_version_id is null then
    return;
  end if;

  if exists (
    select 1
    from public.actividad_curso a
    join public.modulo_curso m on m.id = a.modulo_curso_id
    where m.version_curso_id = v_version_id
      and lower(a.tipo) in ('assignment', 'entrega', 'entrega_pdf', 'proyecto', 'tarea')
  ) then
    return;
  end if;

  select m.id into v_modulo_id
  from public.modulo_curso m
  where m.version_curso_id = v_version_id
  order by m.orden
  limit 1;

  if v_modulo_id is null then
    v_modulo_id := gen_random_uuid();
    insert into public.modulo_curso (id, version_curso_id, codigo, titulo, descripcion, orden)
    values (
      v_modulo_id,
      v_version_id,
      'MOD-ENT',
      'Evaluación práctica',
      'Módulo semilla de entregas',
      99
    );
  end if;

  insert into public.actividad_curso (
    id, modulo_curso_id, codigo, tipo, titulo, instrucciones, duracion_minutos, orden
  ) values (
    'b1000000-0000-4000-8000-000000000101',
    v_modulo_id,
    'ACT-ENT-1',
    'assignment',
    'Informe PDF · entrega demo',
    'Sube un PDF breve para validar el flujo de entregas y calificación.',
    30,
    90
  )
  on conflict (id) do nothing;
end;
$$;

revoke all on function public._servicio_mapear_entrega(public.entrega_actividad)
  from public, anon, authenticated;
revoke all on function public.servicio_listar_entregas(uuid, uuid, boolean)
  from public, anon, authenticated;
revoke all on function public.servicio_obtener_entrega(uuid, boolean)
  from public, anon, authenticated;
revoke all on function public.servicio_enviar_entrega(uuid, uuid, uuid, text, text, integer, text)
  from public, anon, authenticated;
revoke all on function public.servicio_calificar_entrega(uuid, numeric, text, uuid)
  from public, anon, authenticated;
revoke all on function public.servicio_solicitar_correccion_entrega(uuid, text, uuid)
  from public, anon, authenticated;
revoke all on function public.servicio_listar_modulos_curso(uuid)
  from public, anon, authenticated;

grant execute on function public._servicio_mapear_entrega(public.entrega_actividad)
  to service_role;
grant execute on function public.servicio_listar_entregas(uuid, uuid, boolean)
  to service_role;
grant execute on function public.servicio_obtener_entrega(uuid, boolean)
  to service_role;
grant execute on function public.servicio_enviar_entrega(uuid, uuid, uuid, text, text, integer, text)
  to service_role;
grant execute on function public.servicio_calificar_entrega(uuid, numeric, text, uuid)
  to service_role;
grant execute on function public.servicio_solicitar_correccion_entrega(uuid, text, uuid)
  to service_role;
grant execute on function public.servicio_listar_modulos_curso(uuid)
  to service_role;

commit;
