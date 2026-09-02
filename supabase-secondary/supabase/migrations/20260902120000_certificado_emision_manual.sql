-- Emisión manual de certificados (sin matrícula/curso).
-- Ejecutar en el proyecto SECUNDARIO (SQL Editor o db push).
-- Permite a Administración emitir con titular + motivo/curso libres + plantilla.

begin;

-- ---------------------------------------------------------------------------
-- Columnas de soporte
-- ---------------------------------------------------------------------------

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'certificado_curso'
      and column_name = 'matricula_curso_id'
      and is_nullable = 'NO'
  ) then
    execute 'alter table public.certificado_curso alter column matricula_curso_id drop not null';
  end if;
end $$;

alter table public.certificado_curso
  add column if not exists origen_emision text not null default 'CURSO';

alter table public.certificado_curso
  add column if not exists titular_nombre text;

alter table public.certificado_curso
  add column if not exists motivo_titulo text;

alter table public.certificado_curso
  add column if not exists correo_titular text;

alter table public.certificado_curso
  add column if not exists detalle_manual text;

alter table public.certificado_curso
  add column if not exists titular_identidad_ref uuid;

alter table public.certificado_curso
  add column if not exists plantilla_ref text;

comment on column public.certificado_curso.origen_emision is
  'CURSO = ligado a matrícula; MANUAL = datos libres (reconocimiento, trabajo, etc.)';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'certificado_curso_origen_chk'
  ) then
    alter table public.certificado_curso
      add constraint certificado_curso_origen_chk
      check (
        origen_emision in ('CURSO', 'MANUAL')
        and (
          (origen_emision = 'CURSO' and matricula_curso_id is not null)
          or (
            origen_emision = 'MANUAL'
            and nullif(trim(titular_nombre), '') is not null
            and nullif(trim(motivo_titulo), '') is not null
          )
        )
      );
  end if;
exception
  when others then
    -- Si hay filas legacy raras, no bloquear; la RPC valida en escritura.
    raise notice 'No se pudo añadir certificado_curso_origen_chk: %', sqlerrm;
end $$;

create index if not exists idx_certificado_curso_origen
  on public.certificado_curso (origen_emision);

create index if not exists idx_certificado_curso_titular_manual
  on public.certificado_curso (titular_identidad_ref)
  where titular_identidad_ref is not null;

-- ---------------------------------------------------------------------------
-- Listado emitidos (incluye MANUAL)
-- ---------------------------------------------------------------------------

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
      'estudianteId', coalesce(m.estudiante_identidad_ref, cc.titular_identidad_ref),
      'nombre', coalesce(
        nullif(trim(cc.titular_nombre), ''),
        a.nombre_mostrar,
        a.correo,
        'Titular'
      ),
      'cursoId', c.id,
      'curso', coalesce(nullif(trim(cc.motivo_titulo), ''), c.titulo, 'Certificación'),
      'estado', case
        when cc.revocado_en is not null then 'REVOCADO'
        else cc.estado::text
      end,
      'fecha', coalesce(cc.emitido_en, cc.preparado_en),
      'emitidoEn', cc.emitido_en,
      'revocadoEn', cc.revocado_en,
      'notaFinal', m.nota_final,
      'horasCertificadas', coalesce(v.horas, 0),
      'modulosCompletados', case
        when m.id is null then 0
        else (
          select count(distinct mo.id)::int
          from public.progreso_actividad p
          join public.actividad_curso ac on ac.id = p.actividad_ref
          join public.modulo_curso mo on mo.id = ac.modulo_curso_id
          where p.matricula_curso_id = m.id
            and upper(p.estado::text) in ('COMPLETADA', 'COMPLETADO', 'DONE')
        )
      end,
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
      ),
      'origenEmision', coalesce(cc.origen_emision, 'CURSO'),
      'correoTitular', cc.correo_titular,
      'detalleManual', cc.detalle_manual,
      'plantillaRef', cc.plantilla_ref
    ) as item
    from public.certificado_curso cc
    left join public.matricula_curso m on m.id = cc.matricula_curso_id
    left join public.edicion_curso e on e.id = m.edicion_curso_id
    left join public.version_curso v on v.id = e.version_curso_id
    left join public.curso c on c.id = v.curso_id
    left join public.acceso_identidad_principal a
      on a.identidad_principal_ref = coalesce(
        m.estudiante_identidad_ref,
        cc.titular_identidad_ref
      )
  ) listado;

  return jsonb_build_object(
    'ok', true,
    'total', jsonb_array_length(v_items),
    'emitidos', v_items
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Pendientes de firma (titular/motivo manual)
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- Emisión MANUAL
-- ---------------------------------------------------------------------------

create or replace function public.servicio_emitir_certificado_manual(
  p_emisor_identidad_ref uuid,
  p_titular_nombre text,
  p_motivo_titulo text,
  p_correo_titular text default null,
  p_detalle text default null,
  p_titular_identidad_ref uuid default null,
  p_plantilla_ref text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_titular text := nullif(trim(coalesce(p_titular_nombre, '')), '');
  v_motivo text := nullif(trim(coalesce(p_motivo_titulo, '')), '');
  v_correo text := nullif(trim(coalesce(p_correo_titular, '')), '');
  v_detalle text := nullif(trim(coalesce(p_detalle, '')), '');
  v_plantilla text := nullif(trim(coalesce(p_plantilla_ref, '')), '');
  v_cert_id uuid;
  v_doc_id uuid;
  v_codigo text;
  v_estado_cert text;
  v_estado_doc text;
  v_cast_cert text;
  v_cast_doc text;
  v_huella text;
  v_organizacion text;
begin
  if p_emisor_identidad_ref is null then
    raise exception 'Emisor requerido';
  end if;
  if v_titular is null then
    raise exception 'Nombre del titular requerido';
  end if;
  if v_motivo is null then
    raise exception 'Motivo o título del certificado requerido';
  end if;

  select coalesce(
    (select ci.nombre_organizacion from public.contexto_instalacion ci where ci.id = true),
    'Tukuy Academy'
  ) into v_organizacion;

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
  v_cast_cert := public._servicio_sql_tipo_cast('certificado_curso', 'estado');
  v_cast_doc := public._servicio_sql_tipo_cast('certificado_documento', 'estado');

  if v_estado_cert is null or v_cast_cert is null then
    raise exception 'No se pudo resolver el estado del certificado';
  end if;
  if v_estado_doc is null or v_cast_doc is null then
    raise exception 'No se pudo resolver el estado del documento';
  end if;

  v_cert_id := gen_random_uuid();
  v_doc_id := gen_random_uuid();
  v_codigo := 'TA-M-' || to_char(now(), 'YYYY') || '-' || upper(substr(replace(v_cert_id::text, '-', ''), 1, 8));
  v_huella := md5(v_cert_id::text || v_titular || clock_timestamp()::text);

  execute format(
    'insert into public.certificado_curso (
       id, matricula_curso_id, codigo_verificacion, estado,
       preparado_por_identidad_ref, emitido_por_identidad_ref,
       preparado_en, emitido_en, vigente_desde,
       origen_emision, titular_nombre, motivo_titulo, correo_titular,
       detalle_manual, titular_identidad_ref, plantilla_ref
     ) values (
       $1, null, $2, $3::%s, $4, $4, now(), now(), now(),
       ''MANUAL'', $5, $6, $7, $8, $9, $10
     )',
    v_cast_cert
  )
  using
    v_cert_id,
    v_codigo,
    v_estado_cert,
    p_emisor_identidad_ref,
    v_titular,
    v_motivo,
    v_correo,
    v_detalle,
    p_titular_identidad_ref,
    v_plantilla;

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
      'titular', v_titular,
      'curso', v_motivo,
      'detalle', v_detalle,
      'correo', v_correo,
      'emitidoPor', p_emisor_identidad_ref,
      'origen', 'MANUAL',
      'plantillaRef', v_plantilla
    ),
    coalesce('manual:' || v_plantilla, 'v1-manual'),
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
    'titular', v_titular,
    'curso', v_motivo,
    'detalle', v_detalle,
    'correo', v_correo,
    'organizacion', v_organizacion,
    'origenEmision', 'MANUAL',
    'plantillaRef', v_plantilla,
    'emitidoEn', now(),
    'emitidos', (public.servicio_listar_certificados_emitidos())->'emitidos'
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Firmar: titular/curso también desde columnas manuales
-- ---------------------------------------------------------------------------

create or replace function public.servicio_firmar_certificado(
  p_certificado_id uuid,
  p_firmante_identidad_ref uuid,
  p_firmante_nombre text default null,
  p_firma_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_firma public.firma_certificado%rowtype;
  v_cert public.certificado_curso%rowtype;
  v_doc public.certificado_documento%rowtype;
  v_pendientes integer;
  v_curso text;
  v_titular text;
  v_organizacion text;
  v_estado_firmada text;
  v_tipo_estado text;
  v_nombre text := coalesce(nullif(trim(p_firmante_nombre), ''), 'Firmante institucional');
begin
  if p_certificado_id is null or p_firmante_identidad_ref is null then
    raise exception 'Certificado y firmante requeridos';
  end if;

  select * into v_cert
  from public.certificado_curso
  where id = p_certificado_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Certificado no encontrado');
  end if;

  select * into v_doc
  from public.certificado_documento
  where certificado_curso_id = p_certificado_id
  order by version desc
  limit 1;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Documento no encontrado');
  end if;

  if p_firma_id is not null then
    select * into v_firma
    from public.firma_certificado
    where id = p_firma_id
      and certificado_documento_id = v_doc.id
    for update;
  else
    select * into v_firma
    from public.firma_certificado
    where certificado_documento_id = v_doc.id
      and upper(estado::text) = 'PENDIENTE'
    order by orden_firma nulls last, solicitada_en
    limit 1
    for update;
  end if;

  if not found then
    select count(*)::int into v_pendientes
    from public.firma_certificado
    where certificado_documento_id = v_doc.id
      and upper(estado::text) = 'PENDIENTE';
    return jsonb_build_object(
      'ok', true,
      'certificadoId', p_certificado_id,
      'yaFirmado', true,
      'pendientes', v_pendientes,
      'listoParaIndice', v_pendientes = 0
    );
  end if;

  if upper(v_firma.estado::text) <> 'PENDIENTE' then
    select count(*)::int into v_pendientes
    from public.firma_certificado
    where certificado_documento_id = v_doc.id
      and upper(estado::text) = 'PENDIENTE';
    return jsonb_build_object(
      'ok', true,
      'certificadoId', p_certificado_id,
      'firmaId', v_firma.id,
      'yaFirmado', true,
      'pendientes', v_pendientes,
      'listoParaIndice', v_pendientes = 0
    );
  end if;

  v_estado_firmada := public._servicio_estado_firma(
    array['FIRMADA', 'FIRMADO', 'COMPLETADA', 'COMPLETADO', 'EMITIDA', 'ACTIVO']
  );

  select c.udt_name into v_tipo_estado
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = 'firma_certificado'
    and c.column_name = 'estado';

  execute format(
    $q$
    update public.firma_certificado
    set estado = $1::%I,
        firmante_identidad_ref = $2,
        nombre_firmante_historico = $3,
        firmada_en = now(),
        actualizado_en = now(),
        observacion = coalesce(observacion, 'Firmado via portal')
    where id = $4
    $q$,
    v_tipo_estado
  )
  using v_estado_firmada, p_firmante_identidad_ref, v_nombre, v_firma.id;

  select count(*)::int into v_pendientes
  from public.firma_certificado
  where certificado_documento_id = v_doc.id
    and upper(estado::text) = 'PENDIENTE';

  select coalesce(nullif(trim(cc.motivo_titulo), ''), c.titulo, 'Certificación'),
         coalesce(
           nullif(trim(cc.titular_nombre), ''),
           a.nombre_mostrar,
           a.correo,
           'Titular'
         )
    into v_curso, v_titular
  from public.certificado_curso cc
  left join public.matricula_curso m on m.id = cc.matricula_curso_id
  left join public.edicion_curso e on e.id = m.edicion_curso_id
  left join public.version_curso v on v.id = e.version_curso_id
  left join public.curso c on c.id = v.curso_id
  left join public.acceso_identidad_principal a
    on a.identidad_principal_ref = coalesce(
      m.estudiante_identidad_ref,
      cc.titular_identidad_ref
    )
  where cc.id = p_certificado_id;

  select coalesce(
    (select ci.nombre_organizacion from public.contexto_instalacion ci where ci.id = true),
    'Tukuy Academy'
  ) into v_organizacion;

  return jsonb_build_object(
    'ok', true,
    'certificadoId', p_certificado_id,
    'firmaId', v_firma.id,
    'documentoId', v_doc.id,
    'codigoVerificacion', v_cert.codigo_verificacion,
    'huellaDocumento', coalesce(v_doc.huella_documento, v_firma.huella_documento),
    'titular', v_titular,
    'curso', v_curso,
    'organizacion', v_organizacion,
    'emitidoEn', coalesce(v_cert.emitido_en, v_cert.preparado_en, now()),
    'pendientes', v_pendientes,
    'listoParaIndice', v_pendientes = 0
  );
end;
$$;

revoke all on function public.servicio_emitir_certificado_manual(
  uuid, text, text, text, text, uuid, text
) from public, anon, authenticated;
revoke all on function public.servicio_listar_certificados_emitidos()
  from public, anon, authenticated;
revoke all on function public.servicio_listar_certificados_pendientes_firma()
  from public, anon, authenticated;
revoke all on function public.servicio_firmar_certificado(uuid, uuid, text, uuid)
  from public, anon, authenticated;

grant execute on function public.servicio_emitir_certificado_manual(
  uuid, text, text, text, text, uuid, text
) to service_role;
grant execute on function public.servicio_listar_certificados_emitidos()
  to service_role;
grant execute on function public.servicio_listar_certificados_pendientes_firma()
  to service_role;
grant execute on function public.servicio_firmar_certificado(uuid, uuid, text, uuid)
  to service_role;

commit;
