-- Backfill modelosDerivados {1,2,3} = { campos, firmantes } en plantillas existentes.
-- Corrige layouts que solo tenían el modelo activo (p. ej. siempre 3 firmas).
-- PRINCIPAL: aplicar en el SQL Editor de Supabase.

create or replace function public._org_asegurar_modelos_derivados_layout(p_layout jsonb)
returns jsonb
language plpgsql
immutable
as $$
declare
  v_campos jsonb;
  v_firmantes jsonb;
  v_modelos_f jsonb;
  v_derivados jsonb;
  v_activa int;
  v_default jsonb := public._org_layout_certificado_default();
  v_n int;
  v_entry jsonb;
  v_firmas_n jsonb;
begin
  if p_layout is null or jsonb_typeof(p_layout) <> 'object' then
    return v_default;
  end if;

  v_campos := coalesce(p_layout->'campos', v_default->'campos');
  v_firmantes := coalesce(p_layout->'firmantes', v_default->'firmantes');
  v_modelos_f := coalesce(p_layout->'modelosFirmantes', v_default->'modelosFirmantes');
  v_derivados := coalesce(p_layout->'modelosDerivados', '{}'::jsonb);

  begin
    v_activa := coalesce((p_layout->>'cantidadFirmantesActiva')::int, 0);
  exception when others then
    v_activa := 0;
  end;

  if v_activa not in (1, 2, 3) then
    v_activa := least(3, greatest(1, jsonb_array_length(v_firmantes)));
  end if;

  -- Completar modelosFirmantes 1/2/3 si faltan.
  if v_modelos_f->'1' is null or jsonb_typeof(v_modelos_f->'1') <> 'array'
     or jsonb_array_length(v_modelos_f->'1') <> 1 then
    v_modelos_f := jsonb_set(v_modelos_f, '{1}', v_default->'modelosFirmantes'->'1', true);
  end if;
  if v_modelos_f->'2' is null or jsonb_typeof(v_modelos_f->'2') <> 'array'
     or jsonb_array_length(v_modelos_f->'2') <> 2 then
    v_modelos_f := jsonb_set(v_modelos_f, '{2}', v_default->'modelosFirmantes'->'2', true);
  end if;
  if v_modelos_f->'3' is null or jsonb_typeof(v_modelos_f->'3') <> 'array'
     or jsonb_array_length(v_modelos_f->'3') <> 3 then
    v_modelos_f := jsonb_set(v_modelos_f, '{3}', v_default->'modelosFirmantes'->'3', true);
  end if;

  -- El modelo activo conserva firmantes actuales si ya tienen el tamaño correcto.
  if jsonb_array_length(v_firmantes) = v_activa then
    v_modelos_f := jsonb_set(
      v_modelos_f,
      array[v_activa::text],
      v_firmantes,
      true
    );
  end if;

  for v_n in 1..3 loop
    v_entry := v_derivados->v_n::text;
    v_firmas_n := v_modelos_f->v_n::text;

    if v_entry is null
       or jsonb_typeof(v_entry) <> 'object'
       or v_entry->'campos' is null
       or jsonb_typeof(v_entry->'firmantes') <> 'array'
       or jsonb_array_length(v_entry->'firmantes') <> v_n then
      v_derivados := jsonb_set(
        v_derivados,
        array[v_n::text],
        jsonb_build_object(
          'campos', coalesce(v_entry->'campos', v_campos),
          'firmantes', v_firmas_n
        ),
        true
      );
    end if;
  end loop;

  -- Activo: campos actuales + firmas del modelo N.
  v_derivados := jsonb_set(
    v_derivados,
    array[v_activa::text],
    jsonb_build_object(
      'campos', v_campos,
      'firmantes', v_modelos_f->v_activa::text
    ),
    true
  );

  return p_layout
    || jsonb_build_object(
      'campos', v_campos,
      'firmantes', v_modelos_f->v_activa::text,
      'modelosFirmantes', v_modelos_f,
      'modelosDerivados', v_derivados,
      'cantidadFirmantesActiva', v_activa
    );
end;
$$;

comment on function public._org_asegurar_modelos_derivados_layout(jsonb) is
  'Normaliza layout de plantilla: modelosFirmantes + modelosDerivados 1/2/3 con N firmas exactas.';

-- Backfill de filas existentes.
update public.org_plantilla_certificado
set
  layout = public._org_asegurar_modelos_derivados_layout(layout),
  actualizado_en = now()
where layout is null
   or layout->'modelosDerivados' is null
   or jsonb_typeof(layout->'modelosDerivados') <> 'object'
   or layout->'modelosDerivados'->'1' is null
   or layout->'modelosDerivados'->'2' is null
   or layout->'modelosDerivados'->'3' is null
   or jsonb_typeof(layout->'modelosDerivados'->'1'->'firmantes') <> 'array'
   or jsonb_typeof(layout->'modelosDerivados'->'2'->'firmantes') <> 'array'
   or jsonb_typeof(layout->'modelosDerivados'->'3'->'firmantes') <> 'array'
   or jsonb_array_length(layout->'modelosDerivados'->'1'->'firmantes') <> 1
   or jsonb_array_length(layout->'modelosDerivados'->'2'->'firmantes') <> 2
   or jsonb_array_length(layout->'modelosDerivados'->'3'->'firmantes') <> 3;

comment on column public.org_plantilla_certificado.layout is
  'JSONB A4 landscape: campos, firmantes activos, modelosFirmantes{1,2,3}, modelosDerivados{1,2,3}:{campos,firmantes}, cantidadFirmantesActiva. Persistido íntegro por org_upsert_plantilla_certificado.';
