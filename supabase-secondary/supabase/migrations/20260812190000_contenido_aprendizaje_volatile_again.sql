-- Reaplica VOLATILE: las migraciones 1211xxxx–1216xxxx recrearon
-- servicio_obtener_contenido_aprendizaje como STABLE y pisaron 05258300.
-- Esa función hace perform _servicio_asegurar_actividad_quiz (INSERT) →
-- "cannot execute UPDATE/INSERT in a read-only transaction".
-- Ejecutar en el SQL Editor del proyecto SECUNDARIO.
begin;

alter function public.servicio_obtener_contenido_aprendizaje(uuid, uuid)
  volatile;

-- Firma antigua de 1 argumento, si existiera.
do $$
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'servicio_obtener_contenido_aprendizaje'
      and pg_get_function_identity_arguments(p.oid) = 'uuid'
  ) then
    execute 'alter function public.servicio_obtener_contenido_aprendizaje(uuid) volatile';
  end if;
end;
$$;

-- Asegura también el helper que escribe (quiz demo).
do $$
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = '_servicio_asegurar_actividad_quiz'
      and pg_get_function_identity_arguments(p.oid) = 'uuid'
  ) then
    execute 'alter function public._servicio_asegurar_actividad_quiz(uuid) volatile';
  end if;
end;
$$;

commit;

-- Verificación rápida (debe devolver 'v' = volatile):
-- select p.proname, p.provolatile
-- from pg_proc p
-- join pg_namespace n on n.oid = p.pronamespace
-- where n.nspname = 'public'
--   and p.proname = 'servicio_obtener_contenido_aprendizaje';
