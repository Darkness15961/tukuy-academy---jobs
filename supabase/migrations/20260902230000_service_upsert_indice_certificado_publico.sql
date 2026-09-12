-- PRINCIPAL: upsert del índice público sin auth.uid (solo service_role / gateway).
-- Ejecutar en SQL Editor del proyecto PRINCIPAL.

begin;

create or replace function public.service_upsert_indice_certificado_publico(
  p_instalacion_id uuid,
  p_codigo_verificacion text,
  p_certificado_secundario_ref uuid,
  p_documento_secundario_ref uuid,
  p_huella_documento text,
  p_titular_historico text,
  p_curso_historico text,
  p_organizacion_historica text,
  p_emitido_en timestamptz default now(),
  p_estado_publico text default 'VIGENTE'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_conexion_id uuid;
  v_estado text;
  v_tipo text;
  v_id uuid;
begin
  if p_instalacion_id is null
     or p_certificado_secundario_ref is null
     or p_documento_secundario_ref is null then
    raise exception 'Instalacion, certificado y documento requeridos';
  end if;
  if nullif(trim(coalesce(p_codigo_verificacion, '')), '') is null then
    raise exception 'Codigo de verificacion requerido';
  end if;

  select c.id into v_conexion_id
  from public.conexion_organizacion c
  where c.instalacion_organizacion_id = p_instalacion_id
  order by c.actualizado_en desc nulls last, c.creado_en desc nulls last
  limit 1;

  if v_conexion_id is null then
    raise exception 'No hay conexion_organizacion para la instalacion';
  end if;

  v_estado := public._resolver_estado_publico_certificado(
    array[
      upper(trim(coalesce(p_estado_publico, 'VIGENTE'))),
      'VIGENTE',
      'EMITIDO',
      'PUBLICADO',
      'ACTIVO',
      'VALIDO'
    ]
  );

  select c.udt_name into v_tipo
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = 'indice_certificado_publico'
    and c.column_name = 'estado_publico';

  execute format(
    'insert into public.indice_certificado_publico (
       conexion_organizacion_id,
       codigo_verificacion,
       instalacion_organizacion_ref,
       certificado_secundario_ref,
       documento_secundario_ref,
       estado_publico,
       huella_documento,
       algoritmo_huella,
       titular_historico,
       curso_historico,
       organizacion_historica,
       emitido_en,
       revocado_en,
       actualizado_en,
       version_evento
     ) values (
       $1,$2,$3,$4,$5,$6::%I,$7,$8,$9,$10,$11,coalesce($12, now()),null,now(),1
     )
     on conflict (certificado_secundario_ref) do update set
       conexion_organizacion_id = excluded.conexion_organizacion_id,
       codigo_verificacion = excluded.codigo_verificacion,
       documento_secundario_ref = excluded.documento_secundario_ref,
       estado_publico = excluded.estado_publico,
       huella_documento = excluded.huella_documento,
       titular_historico = excluded.titular_historico,
       curso_historico = excluded.curso_historico,
       organizacion_historica = excluded.organizacion_historica,
       emitido_en = excluded.emitido_en,
       revocado_en = null,
       actualizado_en = now(),
       version_evento = public.indice_certificado_publico.version_evento + 1
     returning id',
    v_tipo
  )
  into v_id
  using
    v_conexion_id,
    trim(p_codigo_verificacion),
    p_instalacion_id,
    p_certificado_secundario_ref,
    p_documento_secundario_ref,
    v_estado,
    coalesce(nullif(trim(p_huella_documento), ''), md5(p_certificado_secundario_ref::text)),
    'SHA-256',
    coalesce(nullif(trim(p_titular_historico), ''), 'Titular'),
    coalesce(nullif(trim(p_curso_historico), ''), 'Curso'),
    coalesce(nullif(trim(p_organizacion_historica), ''), 'Tukuy Academy'),
    p_emitido_en;

  return jsonb_build_object(
    'ok', true,
    'id', v_id,
    'codigoVerificacion', trim(p_codigo_verificacion),
    'estadoPublico', v_estado,
    'conexionId', v_conexion_id
  );
end;
$$;

revoke all on function public.service_upsert_indice_certificado_publico(
  uuid, text, uuid, uuid, text, text, text, text, timestamptz, text
) from public, anon, authenticated;

grant execute on function public.service_upsert_indice_certificado_publico(
  uuid, text, uuid, uuid, text, text, text, text, timestamptz, text
) to service_role;

comment on function public.service_upsert_indice_certificado_publico(
  uuid, text, uuid, uuid, text, text, text, text, timestamptz, text
) is
  'Gateway: publica certificado en índice de verificación pública (sin JWT de usuario).';

commit;
