-- OPERATIVO (no es migración): backfill puntual de un certificado en el índice público.
-- Fuente de la RPC: supabase/migrations/20260902230000_service_upsert_indice_certificado_publico.sql
--
-- 1) En SECUNDARIA, consulta y copia UUID/textos:
--
-- select
--   cc.id as certificado_id,
--   cc.codigo_verificacion,
--   d.id as documento_id,
--   coalesce(nullif(trim(cc.titular_nombre), ''), 'Titular') as titular,
--   coalesce(nullif(trim(cc.motivo_titulo), ''), 'Certificación') as curso,
--   coalesce(cc.emitido_en, cc.preparado_en, now()) as emitido_en
-- from public.certificado_curso cc
-- left join lateral (
--   select d.id
--   from public.certificado_documento d
--   where d.certificado_curso_id = cc.id
--   order by d.version desc
--   limit 1
-- ) d on true
-- where upper(cc.codigo_verificacion) = upper('TA-M-2026-A8A3DC87');
--
-- 2) En PRINCIPAL: aplica primero
--    supabase/migrations/20260902230000_service_upsert_indice_certificado_publico.sql
-- 3) Sustituye valores y ejecuta abajo.

select public.service_upsert_indice_certificado_publico(
  '<INSTALACION_ORGANIZACION_ID>'::uuid,
  'TA-M-2026-A8A3DC87',
  '<CERTIFICADO_SECUNDARIO_ID>'::uuid,
  '<DOCUMENTO_SECUNDARIO_ID>'::uuid,
  '',
  '<TITULAR>',
  '<CURSO_O_MOTIVO>',
  'Tukuy Academy',
  now(),
  'VIGENTE'
);

-- Comprobar:
-- select public.verificar_certificado_publico('TA-M-2026-A8A3DC87');
