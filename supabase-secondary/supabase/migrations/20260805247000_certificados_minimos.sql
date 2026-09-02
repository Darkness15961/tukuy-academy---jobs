-- Fase 7 · certificados mínimos (pendientes / emitir / listar).
-- Ejecutar en el SQL Editor del proyecto SECUNDARIO.
begin;

create or replace function public._servicio_resolver_enum_tabla(
  p_tabla text,
  p_columna text,
  p_preferidos text[]
)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_tipo text;
  v_valor text;
begin
  select c.udt_name into v_tipo
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = p_tabla
    and c.column_name = p_columna;

  select e.enumlabel into v_valor
  from pg_catalog.pg_type t
  join pg_catalog.pg_enum e on e.enumtypid = t.oid
  where t.typname = v_tipo
    and e.enumlabel = any (p_preferidos)
  order by array_position(p_preferidos, e.enumlabel)
  limit 1;

  if v_valor is null then
    select e.enumlabel into v_valor
    from pg_catalog.pg_type t
    join pg_catalog.pg_enum e on e.enumtypid = t.oid
    where t.typname = v_tipo
    order by e.enumsortorder
    limit 1;
  end if;

  return v_valor;
end;
$$;

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
          and upper(p.estado) in ('COMPLETADA', 'COMPLETADO', 'DONE')
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
          and upper(p.estado) in ('COMPLETADA', 'COMPLETADO', 'DONE')
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
  v_tipo_cert text;
  v_tipo_doc text;
  v_huella text;
  v_curso_titulo text;
  v_estudiante text;
  v_existente uuid;
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

  select cc.id into v_existente
  from public.certificado_curso cc
  where cc.matricula_curso_id = p_matricula_id
    and cc.revocado_en is null
  limit 1;
  if v_existente is not null then
    return jsonb_build_object(
      'ok', true,
      'yaExistia', true,
      'certificadoId', v_existente,
      'emitidos', (public.servicio_listar_certificados_emitidos())->'emitidos'
    );
  end if;

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

  select c.udt_name into v_tipo_cert
  from information_schema.columns c
  where c.table_schema = 'public' and c.table_name = 'certificado_curso' and c.column_name = 'estado';

  select c.udt_name into v_tipo_doc
  from information_schema.columns c
  where c.table_schema = 'public' and c.table_name = 'certificado_documento' and c.column_name = 'estado';

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
       $1, $2, $3, $4::%I, $5, $5, now(), now(), now()
     )',
    v_tipo_cert
  )
  using v_cert_id, p_matricula_id, v_codigo, v_estado_cert, p_emisor_identidad_ref;

  execute format(
    'insert into public.certificado_documento (
       id, certificado_curso_id, version, clave_almacenamiento, nombre_original,
       tipo_mime, tamano_bytes, datos_historicos, version_plantilla,
       huella_documento, algoritmo_huella, cantidad_firmas_requeridas,
       estado, generado_por_identidad_ref, generado_en
     ) values (
       $1, $2, 1, $3, $4, $5, $6, $7, $8, $9, $10, 1, $11::%I, $12, now()
     )',
    v_tipo_doc
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
      'origen', 'FASE7_MINIMA'
    ),
    'v1-fase7',
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
    'emitidos', (public.servicio_listar_certificados_emitidos())->'emitidos'
  );
end;
$$;

revoke all on function public._servicio_resolver_enum_tabla(text, text, text[])
  from public, anon, authenticated;
revoke all on function public.servicio_listar_certificados_pendientes(numeric)
  from public, anon, authenticated;
revoke all on function public.servicio_listar_certificados_emitidos()
  from public, anon, authenticated;
revoke all on function public.servicio_emitir_certificado(uuid, uuid)
  from public, anon, authenticated;

grant execute on function public._servicio_resolver_enum_tabla(text, text, text[]) to service_role;
grant execute on function public.servicio_listar_certificados_pendientes(numeric) to service_role;
grant execute on function public.servicio_listar_certificados_emitidos() to service_role;
grant execute on function public.servicio_emitir_certificado(uuid, uuid) to service_role;

commit;
