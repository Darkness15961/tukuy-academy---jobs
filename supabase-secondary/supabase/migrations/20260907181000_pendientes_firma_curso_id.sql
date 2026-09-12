-- SECUNDARIA: incluir cursoId en pendientes de firma (alcance docente).

begin;

create or replace function public.servicio_listar_certificados_pendientes_firma()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_items jsonb;
begin
  select coalesce(jsonb_agg(item order by item->>'preparadoEn' desc nulls last), '[]'::jsonb)
  into v_items
  from (
    select jsonb_build_object(
      'firmaId', f.id,
      'certificadoId', cc.id,
      'documentoId', d.id,
      'codigoVerificacion', cc.codigo_verificacion,
      'matriculaId', cc.matricula_curso_id,
      'estudianteId', coalesce(m.estudiante_identidad_ref, cc.titular_identidad_ref),
      'nombre', coalesce(
        nullif(trim(cc.titular_nombre), ''),
        a.nombre_mostrar,
        a.correo,
        'Titular'
      ),
      'curso', coalesce(nullif(trim(cc.motivo_titulo), ''), c.titulo, 'Certificación'),
      'cursoId', c.id,
      'rolFirma', coalesce(f.rol, f.tipo_firma, f.cargo_firma_codigo, 'INSTITUCIONAL'),
      'estadoFirma', f.estado::text,
      'preparadoEn', coalesce(cc.emitido_en, cc.preparado_en, f.solicitada_en),
      'huellaDocumento', coalesce(f.huella_documento, d.huella_documento),
      'organizacion', coalesce(
        (select ci.nombre_organizacion from public.contexto_instalacion ci where ci.id = true),
        'Tukuy Academy'
      ),
      'origenEmision', coalesce(cc.origen_emision, 'CURSO')
    ) as item
    from public.firma_certificado f
    join public.certificado_documento d on d.id = f.certificado_documento_id
    join public.certificado_curso cc on cc.id = d.certificado_curso_id
    left join public.matricula_curso m on m.id = cc.matricula_curso_id
    left join public.edicion_curso e on e.id = m.edicion_curso_id
    left join public.version_curso v on v.id = e.version_curso_id
    left join public.curso c on c.id = v.curso_id
    left join public.acceso_identidad_principal a
      on a.identidad_principal_ref = coalesce(
        m.estudiante_identidad_ref,
        cc.titular_identidad_ref
      )
    where upper(f.estado::text) = 'PENDIENTE'
      and upper(coalesce(f.rol, f.tipo_firma, f.cargo_firma_codigo, '')) in (
        'INSTITUCIONAL', 'INSTITUCION', 'ORGANIZACION', 'ORG'
      )
      and cc.revocado_en is null
  ) listado;

  return jsonb_build_object(
    'ok', true,
    'total', jsonb_array_length(v_items),
    'pendientesFirma', v_items
  );
end;
$$;

revoke all on function public.servicio_listar_certificados_pendientes_firma()
  from public, anon, authenticated;
grant execute on function public.servicio_listar_certificados_pendientes_firma()
  to service_role;

commit;
