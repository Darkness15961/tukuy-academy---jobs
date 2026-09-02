-- Normaliza certificado del borrador de curso en secundaria:
-- - Docente (origenCarga != ADMINISTRACION): cantidadFirmas = 1, solo firma PROPIA.
-- - Administración: cantidadFirmas entre 1 y 5; recorta firmas al tope.
-- - Persiste plantillaCertificadoId en el documento.
-- Ejecutar en SQL Editor del proyecto SECUNDARIO.
begin;

create or replace function public._servicio_normalizar_certificado_documento(
  p_documento jsonb
)
returns jsonb
language plpgsql
stable
as $$
declare
  v_doc jsonb := coalesce(p_documento, '{}'::jsonb);
  v_origen text := upper(trim(coalesce(v_doc->>'origenCarga', 'DOCENTE')));
  v_cert_txt text := lower(trim(coalesce(v_doc->>'certificado', 'true')));
  v_cert boolean := v_cert_txt in ('true', 't', '1', 'yes', 'si');
  v_es_admin boolean := v_origen = 'ADMINISTRACION';
  v_cantidad integer;
  v_plantilla text := nullif(trim(coalesce(v_doc->>'plantillaCertificadoId', '')), '');
  v_firmas jsonb := coalesce(v_doc->'firmasCertificado', '[]'::jsonb);
  v_firmas_out jsonb := '[]'::jsonb;
  v_cantidad_raw text;
begin
  if jsonb_typeof(v_firmas) <> 'array' then
    v_firmas := '[]'::jsonb;
  end if;

  if not v_cert then
    return v_doc || jsonb_build_object(
      'cantidadFirmas', 1,
      'firmasCertificado', '[]'::jsonb,
      'plantillaCertificadoId', coalesce(v_plantilla, '')
    );
  end if;

  if not v_es_admin then
    v_cantidad := 1;
    select coalesce(jsonb_agg(q.elem), '[]'::jsonb)
      into v_firmas_out
    from (
      select elem
      from jsonb_array_elements(v_firmas) as elem
      order by case
        when upper(trim(coalesce(elem->>'origen', ''))) = 'PROPIA' then 0
        else 1
      end
      limit 1
    ) q;
  else
    v_cantidad_raw := nullif(trim(coalesce(v_doc->>'cantidadFirmas', '')), '');
    if v_cantidad_raw is null or v_cantidad_raw !~ '^[0-9]+$' then
      v_cantidad := 1;
    else
      v_cantidad := least(5, greatest(1, v_cantidad_raw::integer));
    end if;

    select coalesce(jsonb_agg(q.elem order by q.ord), '[]'::jsonb)
      into v_firmas_out
    from (
      select elem, ord
      from jsonb_array_elements(v_firmas) with ordinality as t(elem, ord)
      where nullif(trim(coalesce(elem->>'nombre', '')), '') is not null
      order by ord
      limit v_cantidad
    ) q;
  end if;

  return v_doc || jsonb_build_object(
    'cantidadFirmas', v_cantidad,
    'firmasCertificado', coalesce(v_firmas_out, '[]'::jsonb),
    'plantillaCertificadoId', coalesce(v_plantilla, '')
  );
end;
$$;

create or replace function public.trg_documento_borrador_normalizar_certificado()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.documento := public._servicio_normalizar_certificado_documento(new.documento);
  return new;
end;
$$;

drop trigger if exists trg_documento_borrador_normalizar_certificado
  on public.documento_borrador_curso;

create trigger trg_documento_borrador_normalizar_certificado
before insert or update of documento
on public.documento_borrador_curso
for each row
execute function public.trg_documento_borrador_normalizar_certificado();

-- Normaliza borradores existentes una vez.
update public.documento_borrador_curso
set documento = public._servicio_normalizar_certificado_documento(documento),
    actualizado_en = now();

revoke all on function public._servicio_normalizar_certificado_documento(jsonb)
  from public, anon, authenticated;
grant execute on function public._servicio_normalizar_certificado_documento(jsonb)
  to service_role;

commit;
