-- PRINCIPAL: documentar vínculo plantilla ↔ emisión (sin FK cross-DB).
-- El snapshot se guarda en Secundaria: certificado_documento.datos_historicos.plantilla
-- Aplicar en SQL Editor del proyecto PRINCIPAL (opcional; solo comentario de contrato).

comment on column public.org_plantilla_certificado.id is
  'UUID de plantilla. Al emitir, el cliente/gateway guarda snapshot en secundaria certificado_documento.datos_historicos.plantilla.id';

comment on column public.org_plantilla_certificado.layout is
  'JSONB diseño A4: campos, firmantes, modelosDerivados 1/2/3. Se clona en PDF; no hay FK a curso/matrícula (cross-DB).';
