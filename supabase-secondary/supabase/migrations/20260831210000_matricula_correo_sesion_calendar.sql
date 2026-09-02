-- Matrículas: exponer correo para invitaciones Calendar/Meet.
-- Sesiones: incluir calendar_event_id en listado.

begin;

create or replace function public.servicio_listar_estudiantes_matriculas(
  p_curso_id uuid default null
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
  select coalesce(jsonb_agg(item order by item->>'curso', item->>'nombre'), '[]'::jsonb)
  into v_items
  from (
    select jsonb_build_object(
      'id', m.id,
      'alumnoId', m.estudiante_identidad_ref,
      'cursoId', c.id,
      'nombre', coalesce(a.nombre_mostrar, a.correo, 'Estudiante'),
      'correo', nullif(trim(coalesce(a.correo, '')), ''),
      'iniciales', upper(left(coalesce(a.nombre_mostrar, a.correo, 'ES'), 2)),
      'curso', c.titulo,
      'organizacion', coalesce(
        (select ci.nombre_organizacion from public.contexto_instalacion ci where ci.id = true),
        'Tukuy Academy'
      ),
      'progreso', m.progreso_porcentaje,
      'ultimoAcceso', coalesce(m.matriculado_en::text, now()::text),
      'ultimoAccesoFecha', coalesce(m.matriculado_en::text, now()::text),
      'fechaInscripcion', m.matriculado_en,
      'estado', m.estado::text
    ) as item
    from public.matricula_curso m
    join public.edicion_curso e on e.id = m.edicion_curso_id
    join public.version_curso v on v.id = e.version_curso_id
    join public.curso c on c.id = v.curso_id
    left join public.acceso_identidad_principal a
      on a.identidad_principal_ref = m.estudiante_identidad_ref
    where (p_curso_id is null or c.id = p_curso_id)
      and coalesce(m.activo, true)
      and upper(trim(coalesce(m.estado::text, 'ACTIVA'))) not in (
        'PENDIENTE', 'CANCELADA', 'INACTIVA', 'RETIRADA'
      )
  ) listado;

  return jsonb_build_object(
    'ok', true,
    'total', jsonb_array_length(v_items),
    'estudiantes', v_items
  );
end;
$$;

create or replace function public.servicio_listar_sesiones_en_vivo(
  p_curso_id uuid default null,
  p_limite integer default 100
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_limite integer := greatest(1, least(coalesce(p_limite, 100), 500));
  v_sesiones jsonb;
begin
  select coalesce(jsonb_agg(item order by item->>'iniciaEn' asc), '[]'::jsonb)
  into v_sesiones
  from (
    select jsonb_build_object(
      'id', s.id,
      'edicionId', s.edicion_curso_id,
      'cursoId', c.id,
      'cursoTitulo', c.titulo,
      'titulo', s.titulo,
      'urlAcceso', s.url_acceso,
      'calendarEventId', s.calendar_event_id,
      'iniciaEn', s.inicia_en,
      'terminaEn', s.termina_en,
      'estado', coalesce(s.estado, 'PROGRAMADA'),
      'inscritos', (
        select count(*)::int
        from public.asistencia_sesion a
        where a.sesion_en_vivo_id = s.id
      )
    ) as item
    from public.sesion_en_vivo s
    join public.edicion_curso e on e.id = s.edicion_curso_id
    join public.version_curso v on v.id = e.version_curso_id
    join public.curso c on c.id = v.curso_id
    where p_curso_id is null or c.id = p_curso_id
    order by s.inicia_en asc
    limit v_limite
  ) listado;

  return jsonb_build_object(
    'ok', true,
    'total', jsonb_array_length(v_sesiones),
    'sesiones', v_sesiones
  );
end;
$$;

commit;
