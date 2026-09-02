-- Fix emitir certificado: cast enum con esquema (search_path='').
-- Mismo patrón que 20260805252200_matricular_cast_seguro.sql.
-- Ejecutar en el SQL Editor del proyecto SECUNDARIO (después de 470/481 y 522).
begin;

create or replace function public.servicio_emitir_certificado(
  p_matricula_id uuid,
  p_emisor_identidad_ref uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_matricula public.matricula_curso%rowtype;
  v_cert_id uuid;
  v_doc_id uuid;
  v_codigo text;
  v_estado_cert text;
  v_estado_doc text;
  v_cast_cert text;
  v_cast_doc text;
  v_huella text;
  v_curso_titulo text;
  v_estudiante text;
  v_organizacion text;
  v_existente uuid;
  v_doc_existente uuid;
  v_huella_existente text;
begin
  if p_matricula_id is null or p_emisor_identidad_ref is null then
    raise exception 'Matricula y emisor requeridos';
  end if;

  select * into v_matricula
  from public.matricula_curso
  where id = p_matricula_id;
  if not found then
    raise exception 'Matricula no encontrada';
  end if;

  select coalesce(
    (select ci.nombre_organizacion from public.contexto_instalacion ci where ci.id = true),
    'Tukuy Academy'
  ) into v_organizacion;

  select c.titulo,
         coalesce(a.nombre_mostrar, a.correo, 'Estudiante')
    into v_curso_titulo, v_estudiante
  from public.matricula_curso m
  join public.edicion_curso e on e.id = m.edicion_curso_id
  join public.version_curso v on v.id = e.version_curso_id
  join public.curso c on c.id = v.curso_id
  left join public.acceso_identidad_principal a
    on a.identidad_principal_ref = m.estudiante_identidad_ref
  where m.id = p_matricula_id;

  select cc.id into v_existente
  from public.certificado_curso cc
  where cc.matricula_curso_id = p_matricula_id
    and cc.revocado_en is null
  limit 1;

  if v_existente is not null then
    select d.id, d.huella_documento
      into v_doc_existente, v_huella_existente
    from public.certificado_documento d
    where d.certificado_curso_id = v_existente
    order by d.version desc
    limit 1;

    return jsonb_build_object(
      'ok', true,
      'yaExistia', true,
      'certificadoId', v_existente,
      'documentoId', v_doc_existente,
      'codigoVerificacion', (
        select cc.codigo_verificacion from public.certificado_curso cc where cc.id = v_existente
      ),
      'huellaDocumento', v_huella_existente,
      'titular', v_estudiante,
      'curso', v_curso_titulo,
      'organizacion', v_organizacion,
      'emitidoEn', (
        select coalesce(cc.emitido_en, cc.preparado_en)
        from public.certificado_curso cc where cc.id = v_existente
      ),
      'emitidos', (public.servicio_listar_certificados_emitidos())->'emitidos'
    );
  end if;

  v_estado_cert := public._servicio_resolver_enum_tabla(
    'certificado_curso',
    'estado',
    array['EMITIDO', 'EMITIDA', 'PUBLICADO', 'PREPARACION', 'ACTIVO']
  );
  v_estado_doc := public._servicio_resolver_enum_tabla(
    'certificado_documento',
    'estado',
    array['GENERADO', 'FIRMADO', 'EMITIDO', 'ACTIVO']
  );

  -- public.estado_certificado (no bare ::estado_certificado con search_path='')
  v_cast_cert := public._servicio_sql_tipo_cast('certificado_curso', 'estado');
  v_cast_doc := public._servicio_sql_tipo_cast('certificado_documento', 'estado');

  if v_estado_cert is null then
    raise exception 'No se pudo resolver el estado del certificado';
  end if;
  if v_estado_doc is null then
    raise exception 'No se pudo resolver el estado del documento';
  end if;

  v_cert_id := gen_random_uuid();
  v_doc_id := gen_random_uuid();
  v_codigo := 'TA-' || to_char(now(), 'YYYY') || '-' || upper(substr(replace(v_cert_id::text, '-', ''), 1, 8));
  v_huella := md5(v_cert_id::text || p_matricula_id::text || clock_timestamp()::text);

  execute format(
    'insert into public.certificado_curso (
       id, matricula_curso_id, codigo_verificacion, estado,
       preparado_por_identidad_ref, emitido_por_identidad_ref,
       preparado_en, emitido_en, vigente_desde
     ) values (
       $1, $2, $3, $4::%s, $5, $5, now(), now(), now()
     )',
    v_cast_cert
  )
  using v_cert_id, p_matricula_id, v_codigo, v_estado_cert, p_emisor_identidad_ref;

  execute format(
    'insert into public.certificado_documento (
       id, certificado_curso_id, version, clave_almacenamiento, nombre_original,
       tipo_mime, tamano_bytes, datos_historicos, version_plantilla,
       huella_documento, algoritmo_huella, cantidad_firmas_requeridas,
       estado, generado_por_identidad_ref, generado_en
     ) values (
       $1, $2, 1, $3, $4, $5, $6, $7, $8, $9, $10, 1, $11::%s, $12, now()
     )',
    v_cast_doc
  )
  using
    v_doc_id,
    v_cert_id,
    'certificados/' || v_cert_id::text || '.pdf',
    'certificado-' || v_codigo || '.pdf',
    'application/pdf',
    1024,
    jsonb_build_object(
      'titular', v_estudiante,
      'curso', v_curso_titulo,
      'matriculaId', p_matricula_id,
      'emitidoPor', p_emisor_identidad_ref,
      'origen', 'FASE8_CAST_SEGURO'
    ),
    'v1-fase8',
    v_huella,
    'SHA-256',
    v_estado_doc,
    p_emisor_identidad_ref;

  return jsonb_build_object(
    'ok', true,
    'yaExistia', false,
    'certificadoId', v_cert_id,
    'documentoId', v_doc_id,
    'codigoVerificacion', v_codigo,
    'huellaDocumento', v_huella,
    'titular', v_estudiante,
    'curso', v_curso_titulo,
    'organizacion', v_organizacion,
    'emitidoEn', now(),
    'emitidos', (public.servicio_listar_certificados_emitidos())->'emitidos'
  );
end;
$$;

revoke all on function public.servicio_emitir_certificado(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.servicio_emitir_certificado(uuid, uuid) to service_role;

commit;
