-- Ejecutar una sola vez en el SQL Editor del proyecto SECUNDARIO.
begin;

create or replace function public.servicio_habilitar_instalacion_secundaria()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_contexto public.contexto_instalacion;
begin
  update public.contexto_instalacion
  set
    estado = 'HABILITADA',
    actualizado_en = now()
  where id = true
  returning * into v_contexto;

  if not found then
    raise exception 'No existe el contexto de instalacion secundaria';
  end if;

  return jsonb_build_object(
    'ok', true,
    'instalacionId', v_contexto.instalacion_principal_ref,
    'tenantId', v_contexto.tenant_principal_ref,
    'organizacion', v_contexto.nombre_organizacion,
    'estado', v_contexto.estado,
    'versionEsquema', v_contexto.version_esquema
  );
end;
$$;

revoke all on function public.servicio_habilitar_instalacion_secundaria() from public, anon, authenticated;
grant execute on function public.servicio_habilitar_instalacion_secundaria() to service_role;

commit;
