-- Reparación catálogo: retirar en principal cursos ya archivados en secundaria.
-- Solo service_role (gateway list-cursos-publicos).

begin;

create or replace function public.service_retirar_curso_catalogo_oculto(
  p_instalacion_id uuid,
  p_curso_secundario_ref uuid,
  p_datos_historicos jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_existente public.curso_catalogo%rowtype;
  v_datos jsonb;
begin
  if p_instalacion_id is null or p_curso_secundario_ref is null then
    raise exception 'Instalación y curso requeridos';
  end if;

  select * into v_existente
  from public.curso_catalogo c
  where c.instalacion_proveedora_id = p_instalacion_id
    and c.curso_secundario_ref = p_curso_secundario_ref;

  if not found then
    return jsonb_build_object('ok', true, 'retirado', false);
  end if;

  if upper(trim(v_existente.estado_publicacion::text)) = 'RETIRADO' then
    return jsonb_build_object(
      'ok', true,
      'retirado', false,
      'id', v_existente.id,
      'yaRetirado', true
    );
  end if;

  v_datos := coalesce(v_existente.datos_historicos, '{}'::jsonb)
    || coalesce(p_datos_historicos, '{}'::jsonb)
    || jsonb_build_object(
      'oculto', true,
      'ocultoEn', now(),
      'origen', coalesce(nullif(trim(p_datos_historicos->>'origen'), ''), 'sync_secundaria')
    );

  update public.curso_catalogo c
  set
    estado_publicacion = 'RETIRADO'::public.estado_publicacion_catalogo,
    datos_historicos = v_datos,
    actualizado_en = now(),
    retirado_en = coalesce(c.retirado_en, now())
  where c.id = v_existente.id;

  return jsonb_build_object(
    'ok', true,
    'retirado', true,
    'id', v_existente.id
  );
end;
$$;

revoke all on function public.service_retirar_curso_catalogo_oculto(uuid, uuid, jsonb) from public;
grant execute on function public.service_retirar_curso_catalogo_oculto(uuid, uuid, jsonb) to service_role;

commit;
