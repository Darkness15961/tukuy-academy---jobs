-- Ocultar curso del catálogo (ARCHIVADO): autor o docente asignado a una edición.
-- No borra matrículas, progreso ni materiales.
-- Ejecutar en el SQL Editor del proyecto SECUNDARIO.

begin;

create or replace function public.servicio_eliminar_curso_docente(
  p_curso_id uuid,
  p_docente_identidad_ref uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_autor uuid;
  v_estado text;
  v_puede_ocultar boolean := false;
begin
  if p_curso_id is null or p_docente_identidad_ref is null then
    raise exception 'Curso y docente requeridos';
  end if;

  select c.autor_identidad_ref, c.estado::text
  into v_autor, v_estado
  from public.curso c
  where c.id = p_curso_id;

  if v_autor is null then
    raise exception 'Curso no encontrado';
  end if;

  v_puede_ocultar := v_autor = p_docente_identidad_ref;

  if not v_puede_ocultar then
    select exists (
      select 1
      from public.docente_edicion de
      join public.edicion_curso ec on ec.id = de.edicion_curso_id
      join public.version_curso vc on vc.id = ec.version_curso_id
      where vc.curso_id = p_curso_id
        and de.docente_identidad_ref = p_docente_identidad_ref
    )
    into v_puede_ocultar;
  end if;

  if not v_puede_ocultar then
    raise exception
      'No tienes permiso para ocultar este curso. Solo el autor o el docente asignado pueden hacerlo.';
  end if;

  if upper(trim(coalesce(v_estado, ''))) = 'ARCHIVADO' then
    return jsonb_build_object(
      'ok', true,
      'yaOculto', true,
      'curso', (public.servicio_obtener_curso_tipado(p_curso_id))->'curso'
    );
  end if;

  return public.servicio_actualizar_estado_curso(p_curso_id, 'ARCHIVADO');
end;
$$;

revoke all on function public.servicio_eliminar_curso_docente(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.servicio_eliminar_curso_docente(uuid, uuid)
  to service_role;

commit;
