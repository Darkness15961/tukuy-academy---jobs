-- Fix: obtener contenido hacía INSERT (asegurar quiz) estando STABLE
-- → "cannot execute INSERT in a read-only transaction".
-- Ejecutar en el SQL Editor del proyecto SECUNDARIO.
-- NOTA: las migraciones 1211–1216 recreaban la función como STABLE y
-- pisaban este fix. Si ya aplicaste 121x, ejecuta también
-- 20260812190000_contenido_aprendizaje_volatile_again.sql.
begin;

-- VOLATILE: puede crear quiz demo / leer con side-effects de escritura.
alter function public.servicio_obtener_contenido_aprendizaje(uuid, uuid)
  volatile;

-- Por si quedó alguna firma antigua solo con un argumento.
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

commit;
