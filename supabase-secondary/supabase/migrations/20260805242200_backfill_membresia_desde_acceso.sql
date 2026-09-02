-- Backfill Fase 1: crear membresia_organizacion desde acceso_identidad_principal.
-- Ejecutar en el SQL Editor SECUNDARIO si membresias=0 y accesos>=1.
begin;

do $$
declare
  r record;
  v_result jsonb;
  v_perfiles jsonb;
  v_membresia_ref uuid;
  v_creadas integer := 0;
begin
  if to_regprocedure(
    'public.servicio_sincronizar_membresia_organizacion(uuid,uuid,jsonb,bigint,text,text)'
  ) is null then
    raise exception
      'Falta ejecutar 20260805241000_sincronizar_membresia_organizacion.sql en esta secundaria';
  end if;

  for r in
    select *
    from public.acceso_identidad_principal
    where estado = 'ACTIVO'
    order by sincronizado_en desc nulls last
  loop
    begin
      v_membresia_ref := nullif(trim(r.membresia_principal_ref::text), '')::uuid;
    exception
      when others then
        raise notice 'Acceso % tiene membresia_principal_ref invalida: %',
          r.identidad_principal_ref, r.membresia_principal_ref;
        continue;
    end;

    if v_membresia_ref is null then
      raise notice 'Acceso % sin membresia_principal_ref; se omite', r.identidad_principal_ref;
      continue;
    end if;

    v_perfiles := case
      when jsonb_typeof(r.perfiles) = 'array' then r.perfiles
      else '[]'::jsonb
    end;

    v_result := public.servicio_sincronizar_membresia_organizacion(
      r.identidad_principal_ref,
      v_membresia_ref,
      v_perfiles,
      greatest(coalesce(r.version_autorizacion, 1), 1),
      coalesce(r.estado, 'ACTIVO'),
      coalesce(r.nombre_mostrar, r.correo, 'Miembro sincronizado')
    );

    v_creadas := v_creadas + 1;
    raise notice 'Membresia sync: %', v_result;
  end loop;

  raise notice 'Membresias procesadas desde accesos: %', v_creadas;
end;
$$;

commit;

select
  (select count(*) from public.membresia_organizacion) as membresias,
  (select count(*) from public.asignacion_perfil_membresia) as perfiles,
  (select count(*) from public.acceso_identidad_principal) as accesos,
  (select count(*) from public.curso) as cursos;

select id, identidad_usuario_ref, membresia_principal_ref, cargo, estado::text
from public.membresia_organizacion
order by actualizada_en desc;
