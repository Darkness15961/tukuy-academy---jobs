-- Chat alumno ↔ docente del curso + datos del instructor.
-- Ejecutar en el SQL Editor del proyecto SECUNDARIO.
begin;

create or replace function public.servicio_abrir_chat_curso_alumno(
  p_curso_id uuid,
  p_estudiante_identidad_ref uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_curso public.curso%rowtype;
  v_docente_id uuid;
  v_docente_nombre text;
  v_docente_cargo text := 'Docente del curso';
  v_conv public.conversacion_docente%rowtype;
  v_mensajes jsonb;
  v_doc_id_txt text;
  v_doc_nombre_txt text;
begin
  if p_curso_id is null or p_estudiante_identidad_ref is null then
    raise exception 'Curso y estudiante requeridos';
  end if;

  select * into v_curso
  from public.curso
  where id = p_curso_id;

  if not found then
    raise exception 'Curso no encontrado';
  end if;

  v_docente_id := v_curso.autor_identidad_ref;

  select
    nullif(trim(d.documento->>'docenteResponsableId'), ''),
    nullif(trim(d.documento->>'docenteResponsableNombre'), '')
    into v_doc_id_txt, v_doc_nombre_txt
  from public.documento_borrador_curso d
  where d.curso_id = p_curso_id;

  if v_doc_id_txt is not null then
    begin
      v_docente_id := v_doc_id_txt::uuid;
    exception
      when others then
        null;
    end;
  end if;

  if v_docente_id is null then
    raise exception 'El curso no tiene docente asignado';
  end if;

  if v_docente_id = p_estudiante_identidad_ref then
    raise exception 'No puedes abrir un chat contigo mismo';
  end if;

  select coalesce(a.nombre_mostrar, a.correo)
    into v_docente_nombre
  from public.acceso_identidad_principal a
  where a.identidad_principal_ref = v_docente_id;

  v_docente_nombre := coalesce(
    nullif(trim(v_doc_nombre_txt), ''),
    nullif(trim(v_docente_nombre), ''),
    'Docente del curso'
  );

  insert into public.conversacion_docente (
    curso_id,
    docente_identidad_ref,
    estudiante_identidad_ref
  ) values (
    p_curso_id,
    v_docente_id,
    p_estudiante_identidad_ref
  )
  on conflict (curso_id, docente_identidad_ref, estudiante_identidad_ref)
  do nothing;

  select * into v_conv
  from public.conversacion_docente
  where curso_id = p_curso_id
    and docente_identidad_ref = v_docente_id
    and estudiante_identidad_ref = p_estudiante_identidad_ref;

  if not found then
    raise exception 'No se pudo abrir la conversacion';
  end if;

  update public.conversacion_docente
  set estudiante_visto_en = now()
  where id = v_conv.id;

  select coalesce(jsonb_agg(item order by item->>'creadoEn'), '[]'::jsonb)
  into v_mensajes
  from (
    select jsonb_build_object(
      'id', m.id,
      'contenido', m.contenido,
      'hora', to_char(m.creado_en at time zone 'America/Lima', 'HH24:MI'),
      'autor', m.autor_rol,
      'creadoEn', m.creado_en,
      'adjunto', case
        when m.adjunto_nombre is null then null
        else jsonb_build_object(
          'nombre', m.adjunto_nombre,
          'tipo', coalesce(m.adjunto_tipo, 'application/octet-stream'),
          'tamanio', coalesce(m.adjunto_tamano, 0)
        )
      end
    ) as item
    from public.mensaje_conversacion m
    where m.conversacion_id = v_conv.id
  ) listado;

  return jsonb_build_object(
    'ok', true,
    'conversacionId', v_conv.id,
    'cursoId', p_curso_id,
    'cursoTitulo', v_curso.titulo,
    'docente', jsonb_build_object(
      'id', v_docente_id,
      'nombre', v_docente_nombre,
      'cargo', v_docente_cargo,
      'iniciales', upper(left(v_docente_nombre, 2))
    ),
    'mensajes', coalesce(v_mensajes, '[]'::jsonb)
  );
end;
$$;

revoke all on function public.servicio_abrir_chat_curso_alumno(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.servicio_abrir_chat_curso_alumno(uuid, uuid)
  to service_role;

commit;
