-- Guarda el event id de Google Calendar para poder cancelar el Meet.
-- Ejecutar en el SQL Editor del proyecto SECUNDARIO.

begin;

alter table public.sesion_en_vivo
  add column if not exists calendar_event_id text;

commit;
