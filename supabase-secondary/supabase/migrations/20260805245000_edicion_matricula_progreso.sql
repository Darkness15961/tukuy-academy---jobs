-- Fase 5 · edición + matrícula + progreso mínimo.
-- Ejecutar en el SQL Editor del proyecto SECUNDARIO.
begin;

create unique index if not exists matricula_curso_edicion_estudiante_uq
  on public.matricula_curso (edicion_curso_id, estudiante_identidad_ref);

create unique index if not exists progreso_actividad_matricula_actividad_uq
  on public.progreso_actividad (matricula_curso_id, actividad_ref);

create or replace function public.servicio_asegurar_edicion_curso(
  p_curso_id uuid,
  p_docente_identidad_ref uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_version_id uuid;
  v_edicion_id uuid;
  v_titulo text;
  v_autor uuid;
begin
  if p_curso_id is null then
    raise exception 'Curso requerido';
  end if;

  select c.titulo, c.autor_identidad_ref
    into v_titulo, v_autor
  from public.curso c
  where c.id = p_curso_id;

  if v_titulo is null then
    raise exception 'Curso no encontrado';
  end if;

  select v.id into v_version_id
  from public.version_curso v
  where v.curso_id = p_curso_id
  order by v.numero desc
  limit 1;

  if v_version_id is null then
    raise exception 'El curso no tiene version';
  end if;

  select e.id into v_edicion_id
  from public.edicion_curso e
  where e.version_curso_id = v_version_id
  order by e.creada_en desc
  limit 1;

  if v_edicion_id is null then
    v_edicion_id := gen_random_uuid();
    insert into public.edicion_curso (
      id, version_curso_id, nombre, inicio_en, fin_en, cupos,
      estado, creada_en, actualizada_en, version_registro
    ) values (
      v_edicion_id,
      v_version_id,
      coalesce(v_titulo, 'Edición') || ' · edición 1',
      now(),
      null,
      null,
      'ABIERTA',
      now(),
      now(),
      1
    );

    insert into public.docente_edicion (
      id, edicion_curso_id, docente_identidad_ref, funcion
    ) values (
      gen_random_uuid(),
      v_edicion_id,
      coalesce(p_docente_identidad_ref, v_autor),
      'RESPONSABLE'
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'cursoId', p_curso_id,
    'versionId', v_version_id,
    'edicionId', v_edicion_id
  );
end;
$$;

create or replace function public.servicio_matricular_estudiante(
  p_curso_id uuid,
  p_estudiante_identidad_ref uuid,
  p_origen text default 'INSCRIPCION_DIRECTA'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_edicion jsonb;
  v_edicion_id uuid;
  v_matricula_id uuid;
  v_estado text;
  v_tipo text;
begin
  if p_curso_id is null or p_estudiante_identidad_ref is null then
    raise exception 'Curso y estudiante requeridos';
  end if;

  v_edicion := public.servicio_asegurar_edicion_curso(p_curso_id, null);
  v_edicion_id := (v_edicion->>'edicionId')::uuid;

  select m.id into v_matricula_id
  from public.matricula_curso m
  where m.edicion_curso_id = v_edicion_id
    and m.estudiante_identidad_ref = p_estudiante_identidad_ref;

  if v_matricula_id is null then
    select c.udt_name into v_tipo
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = 'matricula_curso'
      and c.column_name = 'estado';

    v_estado := coalesce(
      (
        select e.enumlabel
        from pg_catalog.pg_type t
        join pg_catalog.pg_enum e on e.enumtypid = t.oid
        where t.typname = v_tipo
          and e.enumlabel in ('ACTIVA', 'ACTIVO', 'INSCRITO')
        order by case e.enumlabel when 'ACTIVA' then 0 else 1 end
        limit 1
      ),
      (
        select e.enumlabel
        from pg_catalog.pg_type t
        join pg_catalog.pg_enum e on e.enumtypid = t.oid
        where t.typname = v_tipo
        order by e.enumsortorder
        limit 1
      )
    );

    v_matricula_id := gen_random_uuid();
    execute format(
      'insert into public.matricula_curso (
         id, edicion_curso_id, estudiante_identidad_ref, origen, origen_ref,
         estado, progreso_porcentaje, nota_final, matriculado_en
       ) values (
         $1, $2, $3, $4, null, $5::%I, 0, null, now()
       )',
      v_tipo
    )
    using
      v_matricula_id,
      v_edicion_id,
      p_estudiante_identidad_ref,
      coalesce(nullif(trim(p_origen), ''), 'INSCRIPCION_DIRECTA'),
      v_estado;
  end if;

  return jsonb_build_object(
    'ok', true,
    'matriculaId', v_matricula_id,
    'edicionId', v_edicion_id,
    'cursoId', p_curso_id,
    'estudianteIdentidadRef', p_estudiante_identidad_ref
  );
end;
$$;

create or replace function public.servicio_listar_mis_cursos(
  p_estudiante_identidad_ref uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_cursos jsonb;
begin
  if p_estudiante_identidad_ref is null then
    raise exception 'Estudiante requerido';
  end if;

  select coalesce(jsonb_agg(item order by item->>'matriculadoEn' desc), '[]'::jsonb)
  into v_cursos
  from (
    select jsonb_build_object(
      'matriculaId', m.id,
      'cursoId', c.id,
      'edicionId', e.id,
      'codigo', c.codigo,
      'titulo', c.titulo,
      'resumen', c.resumen,
      'categoria', c.categoria,
      'modalidad', c.modalidad::text,
      'estadoCurso', c.estado::text,
      'estadoMatricula', m.estado::text,
      'progresoPorcentaje', m.progreso_porcentaje,
      'matriculadoEn', m.matriculado_en,
      'totalActividades', (
        select count(*)::int
        from public.actividad_curso a
        join public.modulo_curso mo on mo.id = a.modulo_curso_id
        where mo.version_curso_id = e.version_curso_id
      ),
      'actividadesCompletadas', (
        select count(*)::int
        from public.progreso_actividad p
        where p.matricula_curso_id = m.id
          and upper(p.estado) in ('COMPLETADA', 'COMPLETADO', 'DONE')
      )
    ) as item
    from public.matricula_curso m
    join public.edicion_curso e on e.id = m.edicion_curso_id
    join public.version_curso v on v.id = e.version_curso_id
    join public.curso c on c.id = v.curso_id
    where m.estudiante_identidad_ref = p_estudiante_identidad_ref
  ) listado;

  return jsonb_build_object(
    'ok', true,
    'total', jsonb_array_length(v_cursos),
    'cursos', v_cursos
  );
end;
$$;

create or replace function public.servicio_obtener_contenido_aprendizaje(
  p_curso_id uuid,
  p_estudiante_identidad_ref uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_curso jsonb;
  v_version_id uuid;
  v_matricula_id uuid;
  v_modulos jsonb;
  v_completadas text[];
  v_progreso numeric := 0;
begin
  if p_curso_id is null then
    raise exception 'Curso requerido';
  end if;

  v_curso := (public.servicio_obtener_curso_tipado(p_curso_id))->'curso';
  if v_curso is null then
    return jsonb_build_object('ok', false, 'error', 'Curso no encontrado');
  end if;

  select v.id into v_version_id
  from public.version_curso v
  where v.curso_id = p_curso_id
  order by v.numero desc
  limit 1;

  if p_estudiante_identidad_ref is not null then
    select m.id, m.progreso_porcentaje
      into v_matricula_id, v_progreso
    from public.matricula_curso m
    join public.edicion_curso e on e.id = m.edicion_curso_id
    where e.version_curso_id = v_version_id
      and m.estudiante_identidad_ref = p_estudiante_identidad_ref
    limit 1;

    if v_matricula_id is not null then
      select coalesce(array_agg(p.actividad_ref::text), '{}')
        into v_completadas
      from public.progreso_actividad p
      where p.matricula_curso_id = v_matricula_id
        and upper(p.estado) in ('COMPLETADA', 'COMPLETADO', 'DONE');
    end if;
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', mo.id,
      'title', mo.titulo,
      'orden', mo.orden,
      'items', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'id', a.id,
            'title', a.titulo,
            'type', case lower(a.tipo)
              when 'video' then 'video'
              when 'quiz' then 'quiz'
              when 'assignment' then 'assignment'
              else 'reading'
            end,
            'duration', case
              when a.duracion_minutos is null then null
              else a.duracion_minutos::text || ' min'
            end,
            'description', coalesce(a.instrucciones, a.titulo)
          )
          order by a.orden
        )
        from public.actividad_curso a
        where a.modulo_curso_id = mo.id
      ), '[]'::jsonb)
    )
    order by mo.orden
  ), '[]'::jsonb)
  into v_modulos
  from public.modulo_curso mo
  where mo.version_curso_id = v_version_id;

  return jsonb_build_object(
    'ok', true,
    'curso', v_curso,
    'matriculaId', v_matricula_id,
    'progresoPorcentaje', coalesce(v_progreso, 0),
    'itemsCompletados', to_jsonb(coalesce(v_completadas, '{}'::text[])),
    'contenido', jsonb_build_object(
      'id', p_curso_id,
      'modulos', coalesce(v_modulos, '[]'::jsonb),
      'quizzes', '{}'::jsonb
    )
  );
end;
$$;

create or replace function public.servicio_completar_actividad(
  p_curso_id uuid,
  p_estudiante_identidad_ref uuid,
  p_actividad_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_mat jsonb;
  v_matricula_id uuid;
  v_total integer := 0;
  v_hechas integer := 0;
  v_porcentaje numeric := 0;
begin
  if p_curso_id is null or p_estudiante_identidad_ref is null or p_actividad_id is null then
    raise exception 'Curso, estudiante y actividad requeridos';
  end if;

  if not exists (select 1 from public.actividad_curso where id = p_actividad_id) then
    raise exception 'Actividad no encontrada';
  end if;

  v_mat := public.servicio_matricular_estudiante(
    p_curso_id,
    p_estudiante_identidad_ref,
    'PROGRESO_ACTIVIDAD'
  );
  v_matricula_id := (v_mat->>'matriculaId')::uuid;

  insert into public.progreso_actividad (
    id, matricula_curso_id, actividad_ref, estado, mejor_nota, completada_en
  ) values (
    gen_random_uuid(),
    v_matricula_id,
    p_actividad_id,
    'COMPLETADA',
    null,
    now()
  )
  on conflict (matricula_curso_id, actividad_ref) do update set
    estado = 'COMPLETADA',
    completada_en = coalesce(public.progreso_actividad.completada_en, now());

  select count(*)::int into v_total
  from public.actividad_curso a
  join public.modulo_curso mo on mo.id = a.modulo_curso_id
  join public.edicion_curso e on e.version_curso_id = mo.version_curso_id
  join public.matricula_curso m on m.edicion_curso_id = e.id
  where m.id = v_matricula_id;

  select count(*)::int into v_hechas
  from public.progreso_actividad p
  where p.matricula_curso_id = v_matricula_id
    and upper(p.estado) in ('COMPLETADA', 'COMPLETADO', 'DONE');

  v_porcentaje := case
    when v_total = 0 then 0
    else round((v_hechas::numeric / v_total::numeric) * 100, 2)
  end;

  update public.matricula_curso
  set progreso_porcentaje = v_porcentaje
  where id = v_matricula_id;

  return jsonb_build_object(
    'ok', true,
    'matriculaId', v_matricula_id,
    'actividadId', p_actividad_id,
    'itemsCompletados', (
      select coalesce(jsonb_agg(p.actividad_ref::text), '[]'::jsonb)
      from public.progreso_actividad p
      where p.matricula_curso_id = v_matricula_id
        and upper(p.estado) in ('COMPLETADA', 'COMPLETADO', 'DONE')
    ),
    'progresoPorcentaje', v_porcentaje,
    'estado', case
      when v_porcentaje >= 100 then 'Completado'
      when v_porcentaje > 0 then 'En curso'
      else 'En curso'
    end
  );
end;
$$;

revoke all on function public.servicio_asegurar_edicion_curso(uuid, uuid) from public, anon, authenticated;
revoke all on function public.servicio_matricular_estudiante(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.servicio_listar_mis_cursos(uuid) from public, anon, authenticated;
revoke all on function public.servicio_obtener_contenido_aprendizaje(uuid, uuid) from public, anon, authenticated;
revoke all on function public.servicio_completar_actividad(uuid, uuid, uuid) from public, anon, authenticated;

grant execute on function public.servicio_asegurar_edicion_curso(uuid, uuid) to service_role;
grant execute on function public.servicio_matricular_estudiante(uuid, uuid, text) to service_role;
grant execute on function public.servicio_listar_mis_cursos(uuid) to service_role;
grant execute on function public.servicio_obtener_contenido_aprendizaje(uuid, uuid) to service_role;
grant execute on function public.servicio_completar_actividad(uuid, uuid, uuid) to service_role;

-- Asegura 1 actividad en el curso demo para poder probar progreso.
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
  ) then
    return;
  end if;

  v_modulo_id := gen_random_uuid();
  insert into public.modulo_curso (id, version_curso_id, codigo, titulo, descripcion, orden)
  values (v_modulo_id, v_version_id, 'MOD-1', 'Módulo introductorio', 'Contenido semilla Fase 5', 1);

  insert into public.actividad_curso (
    id, modulo_curso_id, codigo, tipo, titulo, instrucciones, duracion_minutos, orden
  ) values (
    gen_random_uuid(),
    v_modulo_id,
    'ACT-1-1',
    'lectura',
    'Bienvenida al curso demo',
    'Marca esta actividad como completada para validar el progreso.',
    10,
    1
  );
end;
$$;

commit;
