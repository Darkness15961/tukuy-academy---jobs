-- El docente autor puede retirar su curso del catálogo (estado ARCHIVADO).
-- Conserva matrículas, progreso y certificados de quienes ya estaban inscritos.
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

  if v_autor <> p_docente_identidad_ref then
    raise exception 'Solo el docente que creó el curso puede eliminarlo';
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
