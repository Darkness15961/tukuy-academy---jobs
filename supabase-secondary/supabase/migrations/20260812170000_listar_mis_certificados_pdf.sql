-- Certificados alumno: incluir documentoId + claveAlmacenamiento en listado.
-- Ejecutar en secundaria (después de 11160000 / listar_mis_certificados).

begin;

create or replace function public.servicio_listar_mis_certificados(
  p_estudiante_identidad_ref uuid
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
  if p_estudiante_identidad_ref is null then
    raise exception 'Estudiante requerido';
  end if;

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
      'versionPrograma', coalesce(v.numero::text, '1'),
      'documentoId', (
        select d.id
        from public.certificado_documento d
        where d.certificado_curso_id = cc.id
        order by d.version desc
        limit 1
      ),
      'claveAlmacenamiento', (
        select d.clave_almacenamiento
        from public.certificado_documento d
        where d.certificado_curso_id = cc.id
        order by d.version desc
        limit 1
      )
    ) as item
    from public.certificado_curso cc
    join public.matricula_curso m on m.id = cc.matricula_curso_id
    join public.edicion_curso e on e.id = m.edicion_curso_id
    join public.version_curso v on v.id = e.version_curso_id
    join public.curso c on c.id = v.curso_id
    left join public.acceso_identidad_principal a
      on a.identidad_principal_ref = m.estudiante_identidad_ref
    where cc.revocado_en is null
      and m.estudiante_identidad_ref = p_estudiante_identidad_ref
  ) listado;

  return jsonb_build_object(
    'ok', true,
    'total', jsonb_array_length(v_items),
    'emitidos', v_items
  );
end;
$$;

revoke all on function public.servicio_listar_mis_certificados(uuid)
  from public, anon, authenticated;
grant execute on function public.servicio_listar_mis_certificados(uuid)
  to service_role;

commit;
