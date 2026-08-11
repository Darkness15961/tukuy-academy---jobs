-- Endurece listado de certificados pendientes (cast estado::text).
-- Ejecutar en el SQL Editor del proyecto SECUNDARIO.
begin;

create or replace function public.servicio_listar_certificados_pendientes(
  p_progreso_minimo numeric default 100
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
  select coalesce(jsonb_agg(item order by item->>'progreso' desc), '[]'::jsonb)
  into v_items
  from (
    select jsonb_build_object(
      'id', 'pend-' || m.id::text,
      'matriculaId', m.id,
      'estudianteId', m.estudiante_identidad_ref,
      'nombre', coalesce(a.nombre_mostrar, a.correo, 'Estudiante'),
      'cursoId', c.id,
      'curso', c.titulo,
      'nota', coalesce(m.nota_final, m.progreso_porcentaje),
      'horasCumplidas', coalesce(v.horas, 0),
      'horasRequeridas', coalesce(v.horas, 0),
      'modulosCompletados', (
        select count(distinct mo.id)::int
        from public.progreso_actividad p
        join public.actividad_curso ac on ac.id = p.actividad_ref
        join public.modulo_curso mo on mo.id = ac.modulo_curso_id
        where p.matricula_curso_id = m.id
          and upper(p.estado::text) in ('COMPLETADA', 'COMPLETADO', 'DONE')
      ),
      'modulosTotales', (
        select count(*)::int
        from public.modulo_curso mo
        where mo.version_curso_id = v.id
      ),
      'progreso', m.progreso_porcentaje
    ) as item
    from public.matricula_curso m
    join public.edicion_curso e on e.id = m.edicion_curso_id
    join public.version_curso v on v.id = e.version_curso_id
    join public.curso c on c.id = v.curso_id
    left join public.acceso_identidad_principal a
      on a.identidad_principal_ref = m.estudiante_identidad_ref
    where m.progreso_porcentaje >= coalesce(p_progreso_minimo, 100)
      and not exists (
        select 1
        from public.certificado_curso cc
        where cc.matricula_curso_id = m.id
          and cc.revocado_en is null
      )
  ) listado;

  return jsonb_build_object(
    'ok', true,
    'total', jsonb_array_length(v_items),
    'pendientes', v_items
  );
end;
$$;

revoke all on function public.servicio_listar_certificados_pendientes(numeric)
  from public, anon, authenticated;
grant execute on function public.servicio_listar_certificados_pendientes(numeric)
  to service_role;

create or replace function public.servicio_listar_certificados_emitidos()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_items jsonb;
begin
  select coalesce(jsonb_agg(item order by item->>'emitidoEn' desc nulls last), '[]'::jsonb)
  into v_items
  from (
    select jsonb_build_object(
      'id', cc.id,
      'codigoVerificacion', cc.codigo_verificacion,
      'matriculaId', m.id,
      'estudianteId', m.estudiante_identidad_ref,
      'nombre', coalesce(a.nombre_mostrar, a.correo, 'Estudiante'),
      'cursoId', c.id,
      'curso', c.titulo,
      'estado', cc.estado::text,
      'fecha', coalesce(cc.emitido_en, cc.preparado_en),
      'emitidoEn', cc.emitido_en,
      'notaFinal', m.nota_final,
      'horasCertificadas', coalesce(v.horas, 0),
      'modulosCompletados', (
        select count(distinct mo.id)::int
        from public.progreso_actividad p
        join public.actividad_curso ac on ac.id = p.actividad_ref
        join public.modulo_curso mo on mo.id = ac.modulo_curso_id
        where p.matricula_curso_id = m.id
          and upper(p.estado::text) in ('COMPLETADA', 'COMPLETADO', 'DONE')
      ),
      'organizacionEmisora', coalesce(
        (select ci.nombre_organizacion from public.contexto_instalacion ci where ci.id = true),
        'Tukuy Academy'
      ),
      'versionPrograma', coalesce(v.numero::text, '1')
    ) as item
    from public.certificado_curso cc
    join public.matricula_curso m on m.id = cc.matricula_curso_id
    join public.edicion_curso e on e.id = m.edicion_curso_id
    join public.version_curso v on v.id = e.version_curso_id
    join public.curso c on c.id = v.curso_id
    left join public.acceso_identidad_principal a
      on a.identidad_principal_ref = m.estudiante_identidad_ref
    where cc.revocado_en is null
  ) listado;

  return jsonb_build_object(
    'ok', true,
    'total', jsonb_array_length(v_items),
    'emitidos', v_items
  );
end;
$$;

revoke all on function public.servicio_listar_certificados_emitidos()
  from public, anon, authenticated;
grant execute on function public.servicio_listar_certificados_emitidos()
  to service_role;

commit;
