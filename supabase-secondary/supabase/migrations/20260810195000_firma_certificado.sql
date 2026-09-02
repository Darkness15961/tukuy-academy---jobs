-- Firmas de certificados (compatible con esquema real de firma_certificado).
-- Ejecutar en el SQL Editor del proyecto SECUNDARIO.
--
-- Esquema real: firma_certificado.certificado_documento_id → certificado_documento
--                → certificado_curso (NO hay certificado_curso_id en firma).
-- Flujo: emitir → DOCENTE (auto FIRMADA) + INSTITUCIONAL (PENDIENTE)
--        → firmar institucional → listoParaIndice=true

begin;

-- ---------------------------------------------------------------------------
-- Ajustes mínimos sobre la tabla existente (sin recrearla)
-- ---------------------------------------------------------------------------

alter table public.firma_certificado
  alter column firmante_identidad_ref drop not null;

alter table public.firma_certificado
  alter column autorizacion_firmante_ref drop not null;

-- Columnas opcionales de apoyo al flujo simplificado del gateway
alter table public.firma_certificado
  add column if not exists rol text,
  add column if not exists documento_id uuid,
  add column if not exists actualizado_en timestamptz default now();

-- Backfill de rol desde tipo/cargo si ya había filas
update public.firma_certificado
set rol = coalesce(
  nullif(trim(rol), ''),
  nullif(trim(tipo_firma), ''),
  nullif(trim(cargo_firma_codigo), ''),
  'INSTITUCIONAL'
)
where rol is null;

create index if not exists firma_certificado_documento_idx
  on public.firma_certificado (certificado_documento_id);

create index if not exists firma_certificado_estado_idx
  on public.firma_certificado (estado);

-- ---------------------------------------------------------------------------
-- Helper: estado de firma (enum o text)
-- ---------------------------------------------------------------------------

create or replace function public._servicio_estado_firma(p_preferidos text[])
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_udt text;
  v_label text;
  v_match text;
begin
  select c.udt_name into v_udt
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = 'firma_certificado'
    and c.column_name = 'estado';

  if v_udt is null then
    return coalesce(p_preferidos[1], 'PENDIENTE');
  end if;

  if exists (
    select 1
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = 'firma_certificado'
      and c.column_name = 'estado'
      and c.data_type in ('text', 'character varying')
  ) then
    return coalesce(p_preferidos[1], 'PENDIENTE');
  end if;

  foreach v_label in array p_preferidos
  loop
    select e.enumlabel into v_match
    from pg_type t
    join pg_enum e on e.enumtypid = t.oid
    where t.typname = v_udt
      and upper(e.enumlabel) = upper(v_label)
    limit 1;
    if v_match is not null then
      return v_match;
    end if;
  end loop;

  select e.enumlabel into v_match
  from pg_type t
  join pg_enum e on e.enumtypid = t.oid
  where t.typname = v_udt
  order by e.enumsortorder
  limit 1;

  return coalesce(v_match, p_preferidos[1], 'PENDIENTE');
end;
$$;

-- ---------------------------------------------------------------------------
-- Tras emitir: DOCENTE auto + INSTITUCIONAL pendiente
-- ---------------------------------------------------------------------------

create or replace function public.servicio_registrar_firmas_certificado(
  p_certificado_id uuid,
  p_documento_id uuid,
  p_emisor_identidad_ref uuid,
  p_emisor_nombre text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_doc public.certificado_documento%rowtype;
  v_docente_id uuid;
  v_inst_id uuid;
  v_pendientes integer;
  v_estado_firmada text;
  v_estado_pendiente text;
  v_tipo_estado text;
  v_nombre text := coalesce(nullif(trim(p_emisor_nombre), ''), 'Docente emisor');
begin
  if p_certificado_id is null then
    raise exception 'Certificado requerido';
  end if;

  if p_documento_id is not null then
    select * into v_doc
    from public.certificado_documento
    where id = p_documento_id
      and certificado_curso_id = p_certificado_id;
  end if;

  if v_doc.id is null then
    select * into v_doc
    from public.certificado_documento
    where certificado_curso_id = p_certificado_id
    order by version desc
    limit 1;
  end if;

  if v_doc.id is null then
    return jsonb_build_object('ok', false, 'error', 'Documento de certificado no encontrado');
  end if;

  if exists (
    select 1
    from public.firma_certificado f
    where f.certificado_documento_id = v_doc.id
  ) then
    select count(*)::int into v_pendientes
    from public.firma_certificado f
    where f.certificado_documento_id = v_doc.id
      and upper(f.estado::text) = 'PENDIENTE';

    return jsonb_build_object(
      'ok', true,
      'certificadoId', p_certificado_id,
      'documentoId', v_doc.id,
      'yaRegistradas', true,
      'pendientes', v_pendientes,
      'listoParaIndice', v_pendientes = 0
    );
  end if;

  v_estado_firmada := public._servicio_estado_firma(
    array['FIRMADA', 'FIRMADO', 'COMPLETADA', 'COMPLETADO', 'EMITIDA', 'ACTIVO']
  );
  v_estado_pendiente := public._servicio_estado_firma(
    array['PENDIENTE', 'SOLICITADA', 'EN_FIRMA', 'BORRADOR']
  );

  select c.udt_name into v_tipo_estado
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = 'firma_certificado'
    and c.column_name = 'estado';

  execute format(
    $q$
    insert into public.firma_certificado (
      id,
      certificado_documento_id,
      firmante_identidad_ref,
      autorizacion_firmante_ref,
      cargo_firma_codigo,
      cargo_firma_historico,
      nombre_firmante_historico,
      orden_firma,
      es_obligatoria,
      tipo_firma,
      huella_documento,
      algoritmo_huella,
      estado,
      solicitada_en,
      firmada_en,
      rol,
      documento_id,
      actualizado_en
    ) values (
      gen_random_uuid(),
      $1,
      $2,
      null,
      'DOCENTE',
      'Docente emisor',
      $3,
      1,
      true,
      'DOCENTE',
      $4,
      'SHA-256',
      $5::%I,
      now(),
      now(),
      'DOCENTE',
      $1,
      now()
    )
    returning id
    $q$,
    v_tipo_estado
  )
  into v_docente_id
  using v_doc.id, p_emisor_identidad_ref, v_nombre, v_doc.huella_documento, v_estado_firmada;

  execute format(
    $q$
    insert into public.firma_certificado (
      id,
      certificado_documento_id,
      firmante_identidad_ref,
      autorizacion_firmante_ref,
      cargo_firma_codigo,
      cargo_firma_historico,
      nombre_firmante_historico,
      orden_firma,
      es_obligatoria,
      tipo_firma,
      huella_documento,
      algoritmo_huella,
      estado,
      solicitada_en,
      firmada_en,
      rol,
      documento_id,
      actualizado_en
    ) values (
      gen_random_uuid(),
      $1,
      null,
      null,
      'INSTITUCIONAL',
      'Firma institucional',
      'Pendiente institucional',
      2,
      true,
      'INSTITUCIONAL',
      $2,
      'SHA-256',
      $3::%I,
      now(),
      null,
      'INSTITUCIONAL',
      $1,
      now()
    )
    returning id
    $q$,
    v_tipo_estado
  )
  into v_inst_id
  using v_doc.id, v_doc.huella_documento, v_estado_pendiente;

  update public.certificado_documento
  set cantidad_firmas_requeridas = greatest(coalesce(cantidad_firmas_requeridas, 1), 2),
      solicitado_firma_en = coalesce(solicitado_firma_en, now())
  where id = v_doc.id;

  return jsonb_build_object(
    'ok', true,
    'certificadoId', p_certificado_id,
    'documentoId', v_doc.id,
    'firmaDocenteId', v_docente_id,
    'firmaInstitucionalId', v_inst_id,
    'pendientes', 1,
    'listoParaIndice', false
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Listar pendientes de firma institucional
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
      'estudianteId', m.estudiante_identidad_ref,
      'nombre', coalesce(a.nombre_mostrar, a.correo, 'Estudiante'),
      'curso', c.titulo,
      'rolFirma', coalesce(f.rol, f.tipo_firma, f.cargo_firma_codigo, 'INSTITUCIONAL'),
      'estadoFirma', f.estado::text,
      'preparadoEn', coalesce(cc.emitido_en, cc.preparado_en, f.solicitada_en),
      'huellaDocumento', coalesce(f.huella_documento, d.huella_documento),
      'organizacion', coalesce(
        (select ci.nombre_organizacion from public.contexto_instalacion ci where ci.id = true),
        'Tukuy Academy'
      )
    ) as item
    from public.firma_certificado f
    join public.certificado_documento d on d.id = f.certificado_documento_id
    join public.certificado_curso cc on cc.id = d.certificado_curso_id
    left join public.matricula_curso m on m.id = cc.matricula_curso_id
    left join public.edicion_curso e on e.id = m.edicion_curso_id
    left join public.version_curso v on v.id = e.version_curso_id
    left join public.curso c on c.id = v.curso_id
    left join public.acceso_identidad_principal a
      on a.identidad_principal_ref = m.estudiante_identidad_ref
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
-- Firmar pendiente (institucional u otra)
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

  select c.titulo,
         coalesce(a.nombre_mostrar, a.correo, 'Estudiante')
    into v_curso, v_titular
  from public.certificado_curso cc
  join public.matricula_curso m on m.id = cc.matricula_curso_id
  join public.edicion_curso e on e.id = m.edicion_curso_id
  join public.version_curso v on v.id = e.version_curso_id
  join public.curso c on c.id = v.curso_id
  left join public.acceso_identidad_principal a
    on a.identidad_principal_ref = m.estudiante_identidad_ref
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

revoke all on function public._servicio_estado_firma(text[])
  from public, anon, authenticated;
revoke all on function public.servicio_registrar_firmas_certificado(uuid, uuid, uuid, text)
  from public, anon, authenticated;
revoke all on function public.servicio_listar_certificados_pendientes_firma()
  from public, anon, authenticated;
revoke all on function public.servicio_firmar_certificado(uuid, uuid, text, uuid)
  from public, anon, authenticated;

grant execute on function public._servicio_estado_firma(text[]) to service_role;
grant execute on function public.servicio_registrar_firmas_certificado(uuid, uuid, uuid, text)
  to service_role;
grant execute on function public.servicio_listar_certificados_pendientes_firma()
  to service_role;
grant execute on function public.servicio_firmar_certificado(uuid, uuid, text, uuid)
  to service_role;

commit;
