-- Fix Inscribirme: origen de matrícula NUNCA null + candidatos amplios.
-- Ejecutar en el SQL Editor del proyecto SECUNDARIO.

begin;

-- Si origen es enum, asegura valores comunes usados por la app.
do $$
declare
  v_udt text;
  v_typtype "char";
  v_label text;
  v_labels text[] := array[
    'INSCRIPCION_DIRECTA',
    'COMPRA',
    'SOLICITUD',
    'ASIGNACION_ORGANIZACION',
    'MANUAL',
    'DIRECTA',
    'AUTO',
    'WEB'
  ];
begin
  select c.udt_name into v_udt
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = 'matricula_curso'
    and c.column_name = 'origen';

  if v_udt is null then
    return;
  end if;

  select t.typtype into v_typtype
  from pg_catalog.pg_type t
  join pg_catalog.pg_namespace n on n.oid = t.typnamespace
  where t.typname = v_udt
  order by case n.nspname when 'public' then 0 else 1 end
  limit 1;

  if v_typtype is distinct from 'e' then
    return;
  end if;

  foreach v_label in array v_labels loop
    begin
      execute format('alter type public.%I add value if not exists %L', v_udt, v_label);
    exception when others then
      -- Tipos fuera de public o PG sin IF NOT EXISTS: ignorar.
      null;
    end;
  end loop;
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
  v_cast_estado text;
  v_origen text;
  v_cast_origen text;
  v_origen_pedido text := coalesce(nullif(trim(p_origen), ''), 'INSCRIPCION_DIRECTA');
begin
  if p_curso_id is null or p_estudiante_identidad_ref is null then
    raise exception 'Curso y estudiante requeridos';
  end if;

  v_edicion := public.servicio_asegurar_edicion_curso(
    p_curso_id,
    p_estudiante_identidad_ref
  );
  v_edicion_id := (v_edicion->>'edicionId')::uuid;

  select m.id into v_matricula_id
  from public.matricula_curso m
  where m.edicion_curso_id = v_edicion_id
    and m.estudiante_identidad_ref = p_estudiante_identidad_ref;

  if v_matricula_id is null then
    v_matricula_id := gen_random_uuid();

    v_estado := public._servicio_resolver_enum_tabla(
      'matricula_curso',
      'estado',
      array['ACTIVA', 'ACTIVO', 'INSCRITO', 'MATRICULADO', 'EN_CURSO', 'PENDIENTE']
    );
    v_cast_estado := public._servicio_sql_tipo_cast('matricula_curso', 'estado');

    v_origen := public._servicio_resolver_enum_tabla(
      'matricula_curso',
      'origen',
      array[
        v_origen_pedido,
        'INSCRIPCION_DIRECTA',
        'COMPRA',
        'SOLICITUD',
        'ASIGNACION_ORGANIZACION',
        'MANUAL',
        'DIRECTA',
        'AUTO',
        'WEB'
      ]
    );
    v_origen := coalesce(nullif(trim(v_origen), ''), v_origen_pedido, 'INSCRIPCION_DIRECTA');
    v_cast_origen := public._servicio_sql_tipo_cast('matricula_curso', 'origen');

    if v_origen is null then
      raise exception 'No se pudo resolver origen de matricula';
    end if;
    if v_estado is null then
      raise exception 'No se pudo resolver estado de matricula';
    end if;

    execute format(
      'insert into public.matricula_curso (
         id, edicion_curso_id, estudiante_identidad_ref, origen, origen_ref,
         estado, progreso_porcentaje, nota_final, matriculado_en
       ) values (
         $1, $2, $3, $4::%s, null, $5::%s, 0, null, now()
       )',
      coalesce(nullif(v_cast_origen, ''), 'text'),
      coalesce(nullif(v_cast_estado, ''), 'text')
    )
    using
      v_matricula_id,
      v_edicion_id,
      p_estudiante_identidad_ref,
      v_origen,
      v_estado;
  end if;

  return jsonb_build_object(
    'ok', true,
    'matriculaId', v_matricula_id,
    'edicionId', v_edicion_id,
    'cursoId', p_curso_id,
    'estudianteIdentidadRef', p_estudiante_identidad_ref,
    'origen', v_origen
  );
end;
$$;

revoke all on function public.servicio_matricular_estudiante(uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.servicio_matricular_estudiante(uuid, uuid, text)
  to service_role;

commit;
