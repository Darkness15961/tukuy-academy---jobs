-- SECUNDARIA: enlazar plantilla al documento del certificado.
-- Aplicar en SQL Editor del proyecto SECUNDARIO.

begin;

-- Una sola firma: clave S3 + snapshot opcional de plantilla (Principal).
drop function if exists public.servicio_actualizar_documento_certificado(uuid, text, integer, text);
drop function if exists public.servicio_actualizar_documento_certificado(uuid, text, integer, text, jsonb);

create or replace function public.servicio_actualizar_documento_certificado(
  p_certificado_id uuid,
  p_clave_almacenamiento text,
  p_tamano_bytes integer default null,
  p_huella_documento text default null,
  p_datos_plantilla jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_doc public.certificado_documento%rowtype;
  v_clave text := nullif(trim(coalesce(p_clave_almacenamiento, '')), '');
  v_hist jsonb;
  v_version text;
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

  v_hist := coalesce(v_doc.datos_historicos, '{}'::jsonb);
  if p_datos_plantilla is not null and jsonb_typeof(p_datos_plantilla) = 'object' then
    v_hist := v_hist || jsonb_build_object('plantilla', p_datos_plantilla);
    v_version := nullif(trim(coalesce(p_datos_plantilla->>'versionPlantilla', '')), '');
  end if;

  update public.certificado_documento d
  set
    clave_almacenamiento = v_clave,
    tamano_bytes = coalesce(p_tamano_bytes, d.tamano_bytes),
    huella_documento = coalesce(
      nullif(trim(coalesce(p_huella_documento, '')), ''),
      d.huella_documento
    ),
    tipo_mime = coalesce(nullif(d.tipo_mime, ''), 'application/pdf'),
    datos_historicos = v_hist,
    version_plantilla = coalesce(v_version, d.version_plantilla)
  where d.id = v_doc.id
  returning * into v_doc;

  return jsonb_build_object(
    'ok', true,
    'certificadoId', p_certificado_id,
    'documentoId', v_doc.id,
    'claveAlmacenamiento', v_doc.clave_almacenamiento,
    'tamanoBytes', v_doc.tamano_bytes,
    'huellaDocumento', v_doc.huella_documento,
    'plantillaId', v_hist->'plantilla'->>'id',
    'versionPlantilla', v_doc.version_plantilla,
    'datosHistoricos', v_doc.datos_historicos
  );
end;
$$;

revoke all on function public.servicio_actualizar_documento_certificado(uuid, text, integer, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.servicio_actualizar_documento_certificado(uuid, text, integer, text, jsonb)
  to service_role;

comment on function public.servicio_actualizar_documento_certificado(uuid, text, integer, text, jsonb) is
  'Actualiza PDF S3 y opcionalmente snapshot plantilla Principal en datos_historicos.plantilla {id,nombre,cantidadFirmantes,versionPlantilla}';

commit;
