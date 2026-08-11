-- WP5 · Revocar índice público de certificado (PRINCIPAL).
-- Ejecutar en el SQL Editor del proyecto PRINCIPAL.

begin;

create or replace function public.admin_revocar_indice_certificado_publico(
  p_certificado_secundario_ref uuid,
  p_motivo text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.indice_certificado_publico%rowtype;
  v_estado text;
  v_tipo text;
begin
  if auth.uid() is null then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  if p_certificado_secundario_ref is null then
    raise exception 'certificado_secundario_ref requerido';
  end if;

  select * into v_row
  from public.indice_certificado_publico i
  where i.certificado_secundario_ref = p_certificado_secundario_ref
  limit 1;

  if not found then
    return jsonb_build_object(
      'ok', true,
      'encontrado', false,
      'certificadoSecundarioRef', p_certificado_secundario_ref
    );
  end if;

  if v_row.revocado_en is not null then
    return jsonb_build_object(
      'ok', true,
      'encontrado', true,
      'yaRevocado', true,
      'id', v_row.id,
      'codigoVerificacion', v_row.codigo_verificacion,
      'revocadoEn', v_row.revocado_en
    );
  end if;

  v_estado := public._resolver_estado_publico_certificado(
    array['REVOCADO', 'ANULADO', 'INVALIDO', 'VENCIDO']
  );

  select c.udt_name into v_tipo
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = 'indice_certificado_publico'
    and c.column_name = 'estado_publico';

  execute format(
    'update public.indice_certificado_publico
     set
       estado_publico = $1::%I,
       revocado_en = now(),
       actualizado_en = now(),
       version_evento = version_evento + 1
     where id = $2
     returning *',
    v_tipo
  )
  into v_row
  using v_estado, v_row.id;

  return jsonb_build_object(
    'ok', true,
    'encontrado', true,
    'yaRevocado', false,
    'id', v_row.id,
    'codigoVerificacion', v_row.codigo_verificacion,
    'estadoPublico', v_estado,
    'revocadoEn', v_row.revocado_en,
    'motivo', nullif(trim(coalesce(p_motivo, '')), '')
  );
end;
$$;

revoke all on function public.admin_revocar_indice_certificado_publico(uuid, text)
  from public;
grant execute on function public.admin_revocar_indice_certificado_publico(uuid, text)
  to authenticated;

commit;
