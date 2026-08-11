-- WP5 · Persistencia PDF certificado + revocación (SECUNDARIA).
-- Ejecutar en el SQL Editor del proyecto SECUNDARIO.

begin;

-- Actualiza la clave S3 real del documento tras subir el PDF.
create or replace function public.servicio_actualizar_documento_certificado(
  p_certificado_id uuid,
  p_clave_almacenamiento text,
  p_tamano_bytes integer default null,
  p_huella_documento text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_doc public.certificado_documento%rowtype;
  v_clave text := nullif(trim(coalesce(p_clave_almacenamiento, '')), '');
begin
  if p_certificado_id is null then
    raise exception 'certificadoId requerido';
  end if;
  if v_clave is null then
    raise exception 'claveAlmacenamiento requerida';
  end if;

  select * into v_doc
  from public.certificado_documento d
  where d.certificado_curso_id = p_certificado_id
  order by d.version desc
  limit 1;

  if not found then
    raise exception 'Documento de certificado no encontrado';
  end if;

  update public.certificado_documento d
  set
    clave_almacenamiento = v_clave,
    tamano_bytes = coalesce(p_tamano_bytes, d.tamano_bytes),
    huella_documento = coalesce(
      nullif(trim(coalesce(p_huella_documento, '')), ''),
      d.huella_documento
    ),
    tipo_mime = coalesce(nullif(d.tipo_mime, ''), 'application/pdf')
  where d.id = v_doc.id
  returning * into v_doc;

  return jsonb_build_object(
    'ok', true,
    'certificadoId', p_certificado_id,
    'documentoId', v_doc.id,
    'claveAlmacenamiento', v_doc.clave_almacenamiento,
    'tamanoBytes', v_doc.tamano_bytes,
    'huellaDocumento', v_doc.huella_documento
  );
end;
$$;

create or replace function public.servicio_revocar_certificado(
  p_certificado_id uuid,
  p_actor_identidad_ref uuid,
  p_motivo text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cert public.certificado_curso%rowtype;
  v_doc_id uuid;
  v_huella text;
begin
  if p_certificado_id is null or p_actor_identidad_ref is null then
    raise exception 'certificadoId y actor requeridos';
  end if;

  select * into v_cert
  from public.certificado_curso cc
  where cc.id = p_certificado_id;

  if not found then
    raise exception 'Certificado no encontrado';
  end if;

  if v_cert.revocado_en is not null then
    select d.id, d.huella_documento
      into v_doc_id, v_huella
    from public.certificado_documento d
    where d.certificado_curso_id = v_cert.id
    order by d.version desc
    limit 1;

    return jsonb_build_object(
      'ok', true,
      'yaRevocado', true,
      'certificadoId', v_cert.id,
      'documentoId', v_doc_id,
      'codigoVerificacion', v_cert.codigo_verificacion,
      'huellaDocumento', v_huella,
      'revocadoEn', v_cert.revocado_en
    );
  end if;

  update public.certificado_curso cc
  set revocado_en = now()
  where cc.id = p_certificado_id
  returning * into v_cert;

  select d.id, d.huella_documento
    into v_doc_id, v_huella
  from public.certificado_documento d
  where d.certificado_curso_id = v_cert.id
  order by d.version desc
  limit 1;

  return jsonb_build_object(
    'ok', true,
    'yaRevocado', false,
    'certificadoId', v_cert.id,
    'documentoId', v_doc_id,
    'codigoVerificacion', v_cert.codigo_verificacion,
    'huellaDocumento', v_huella,
    'revocadoEn', v_cert.revocado_en,
    'motivo', nullif(trim(coalesce(p_motivo, '')), '')
  );
end;
$$;

-- Listado org: incluye clave S3 y certificados revocados (estado REVOCADO).
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
      'estado', case
        when cc.revocado_en is not null then 'REVOCADO'
        else cc.estado::text
      end,
      'fecha', coalesce(cc.emitido_en, cc.preparado_en),
      'emitidoEn', cc.emitido_en,
      'revocadoEn', cc.revocado_en,
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
  ) listado;

  return jsonb_build_object(
    'ok', true,
    'total', jsonb_array_length(v_items),
    'emitidos', v_items
  );
end;
$$;

revoke all on function public.servicio_actualizar_documento_certificado(uuid, text, integer, text)
  from public, anon, authenticated;
revoke all on function public.servicio_revocar_certificado(uuid, uuid, text)
  from public, anon, authenticated;
revoke all on function public.servicio_listar_certificados_emitidos()
  from public, anon, authenticated;

grant execute on function public.servicio_actualizar_documento_certificado(uuid, text, integer, text)
  to service_role;
grant execute on function public.servicio_revocar_certificado(uuid, uuid, text)
  to service_role;
grant execute on function public.servicio_listar_certificados_emitidos()
  to service_role;

commit;
