-- Fix: asistencia exige matricula_ref (esquema legacy) + cancelar no debe
-- romper chk_sesion_horario (termina_en > inicia_en).
-- Ejecutar en el SQL Editor del proyecto SECUNDARIO.

begin;

-- ---------------------------------------------------------------------------
-- Cancelar / cambiar estado sin violar chk_sesion_horario
-- ---------------------------------------------------------------------------

create or replace function public.servicio_actualizar_estado_sesion(
  p_sesion_id uuid,
  p_estado text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_estado text := upper(trim(coalesce(p_estado, '')));
  v_sesion public.sesion_en_vivo%rowtype;
begin
  if p_sesion_id is null then
    raise exception 'Sesion requerida';
  end if;
  if v_estado not in ('PROGRAMADA', 'HOY', 'EN_VIVO', 'FINALIZADA', 'CANCELADA') then
    raise exception 'Estado de sesion invalido';
  end if;

  -- Solo acorta termina_en si la sesión ya empezó; si aún no inicia,
  -- dejar el horario intacto (evita chk_sesion_horario).
  update public.sesion_en_vivo
  set
    estado = v_estado,
    termina_en = case
      when v_estado = 'CANCELADA'
        and termina_en > now()
        and now() > inicia_en
      then now()
      else termina_en
    end
  where id = p_sesion_id
  returning * into v_sesion;

  if not found then
    raise exception 'Sesion no encontrada';
  end if;

  return jsonb_build_object(
    'ok', true,
    'sesion', (
      select jsonb_build_object(
        'id', s.id,
        'edicionId', s.edicion_curso_id,
        'cursoId', c.id,
        'cursoTitulo', c.titulo,
        'titulo', s.titulo,
        'urlAcceso', s.url_acceso,
        'iniciaEn', s.inicia_en,
        'terminaEn', s.termina_en,
        'estado', s.estado,
        'inscritos', (
          select count(*)::int
          from public.asistencia_sesion a
          where a.sesion_en_vivo_id = s.id
        )
      )
      from public.sesion_en_vivo s
      join public.edicion_curso e on e.id = s.edicion_curso_id
      join public.version_curso v on v.id = e.version_curso_id
      join public.curso c on c.id = v.curso_id
      where s.id = p_sesion_id
    )
  );
end;
$$;

-- Marcar asistencia: ver 20260811123000_marcar_asistencia_matricula_ref.sql
-- (esta versión intermedia se mantiene por historial; usa el 123000).


-- Listar: emparejar también por matricula_ref si existe
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
  v_tiene_matricula_ref boolean;
  v_join_extra text := '';
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

  select exists (
    select 1
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = 'asistencia_sesion'
      and c.column_name = 'matricula_ref'
  ) into v_tiene_matricula_ref;

  if v_tiene_matricula_ref then
    v_join_extra := ' or asg.matricula_ref = m.id';
  end if;

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
       and (asg.estudiante_identidad_ref = m.%1$I%2$s)
      where m.edicion_curso_id = $2
    ) listado
    $q$,
    v_col_est,
    v_join_extra
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

revoke all on function public.servicio_actualizar_estado_sesion(uuid, text)
  from public, anon, authenticated;
revoke all on function public.servicio_listar_asistencia_sesion(uuid)
  from public, anon, authenticated;
revoke all on function public.servicio_marcar_asistencia_sesion(uuid, uuid, jsonb)
  from public, anon, authenticated;

grant execute on function public.servicio_actualizar_estado_sesion(uuid, text) to service_role;
grant execute on function public.servicio_listar_asistencia_sesion(uuid) to service_role;
grant execute on function public.servicio_marcar_asistencia_sesion(uuid, uuid, jsonb) to service_role;

commit;
