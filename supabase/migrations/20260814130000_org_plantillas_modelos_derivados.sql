-- Certificados derivados por cantidad de firmas (layout completo: campos + firmas).
-- modelosDerivados.{1|2|3} = { campos, firmantes }
-- Se persiste íntegro en org_plantilla_certificado.layout (JSONB) vía RPC upsert.

comment on column public.org_plantilla_certificado.layout is
  'JSONB A4 landscape: campos activos, firmantes, modelosFirmantes (legado), modelosDerivados{1,2,3}:{campos,firmantes}, cantidadFirmantesActiva. Persistido íntegro por org_upsert_plantilla_certificado.';

-- No reescribe datos: el front normaliza al leer/guardar.
-- Las plantillas existentes ganan modelosDerivados en el próximo upsert
-- (asegurarModelosDerivados clona campos actuales + firmas por cantidad).
