-- Constructor: recargar el temario vivo (módulos + actividades), no el JSON
-- stale de documento_borrador_curso.
--
-- Ejecutar en el SQL Editor del proyecto SECUNDARIO (después de 20260812160000).
--
-- Causa: servicio_obtener_curso_borrador devolvía documento.secciones si tenía
-- al menos una sección. El reproductor / _servicio_asegurar_actividad_quiz
-- escriben en actividad_curso; ese cuestionario nunca se “enlazaba” al JSON
-- del constructor. Al editar solo se veía la introducción guardada en el snapshot.

begin;

create or replace function public._servicio_secciones_desde_version(
  p_version_id uuid
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', m.id,
      'titulo', m.titulo,
      'clases', coalesce((
        select jsonb_agg(a.titulo order by a.orden)
        from public.actividad_curso a
        where a.modulo_curso_id = m.id
          and coalesce(a.activa, true)
      ), '[]'::jsonb),
      'items', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'id', a.id,
            'titulo', a.titulo,
            'tipo', case lower(a.tipo::text)
              when 'video' then 'video'
              when 'quiz' then 'quiz'
              when 'cuestionario' then 'quiz'
              when 'assignment' then 'assignment'
              when 'entrega_pdf' then 'assignment'
              else 'lectura'
            end,
            'urlYoutube', coalesce(a.url_contenido, ''),
            'preguntas', coalesce(a.banco_preguntas, '[]'::jsonb)
          )
          order by a.orden
        )
        from public.actividad_curso a
        where a.modulo_curso_id = m.id
          and coalesce(a.activa, true)
      ), '[]'::jsonb),
      'recursos', coalesce(m.recursos, '[]'::jsonb)
    )
    order by m.orden
  ), '[]'::jsonb)
  from public.modulo_curso m
  where m.version_curso_id = p_version_id
    and coalesce(m.activo, true);
$$;

create or replace function public._servicio_version_mas_completa(p_curso_id uuid)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if p_curso_id is null then
    return null;
  end if;

  -- Prefiere la versión con más actividades vivas; empate → número más alto
  -- (recupera un borrador vacío post-publicación vs. la versión publicada).
  select v.id into v_id
  from public.version_curso v
  left join public.modulo_curso m
    on m.version_curso_id = v.id
   and coalesce(m.activo, true)
  left join public.actividad_curso a
    on a.modulo_curso_id = m.id
   and coalesce(a.activa, true)
  where v.curso_id = p_curso_id
  group by v.id, v.numero
  order by count(a.id) desc, v.numero desc
  limit 1;

  return v_id;
end;
$$;

create or replace function public.servicio_obtener_curso_borrador(
  p_curso_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_curso jsonb;
  v_documento jsonb;
  v_secciones jsonb;
  v_secciones_doc jsonb;
  v_version_id uuid;
  v_vivas integer;
  v_doc integer;
begin
  if p_curso_id is null then
    raise exception 'Curso requerido';
  end if;

  v_curso := (public.servicio_obtener_curso_tipado(p_curso_id))->'curso';
  if v_curso is null then
    return jsonb_build_object('ok', false, 'error', 'Curso no encontrado');
  end if;

  select d.documento into v_documento
  from public.documento_borrador_curso d
  where d.curso_id = p_curso_id;

  v_version_id := public._servicio_version_mas_completa(p_curso_id);
  v_secciones := case
    when v_version_id is null then '[]'::jsonb
    else public._servicio_secciones_desde_version(v_version_id)
  end;

  v_secciones_doc := case
    when v_documento is not null
      and jsonb_typeof(v_documento->'secciones') = 'array'
    then coalesce(v_documento->'secciones', '[]'::jsonb)
    else '[]'::jsonb
  end;

  select coalesce(sum(
    case
      when jsonb_typeof(s->'items') = 'array'
        and jsonb_array_length(coalesce(s->'items', '[]'::jsonb)) > 0
        then jsonb_array_length(s->'items')
      when jsonb_typeof(s->'clases') = 'array'
        then jsonb_array_length(coalesce(s->'clases', '[]'::jsonb))
      else 0
    end
  ), 0)
    into v_vivas
  from jsonb_array_elements(coalesce(v_secciones, '[]'::jsonb)) s;

  select coalesce(sum(
    case
      when jsonb_typeof(s->'items') = 'array'
        and jsonb_array_length(coalesce(s->'items', '[]'::jsonb)) > 0
        then jsonb_array_length(s->'items')
      when jsonb_typeof(s->'clases') = 'array'
        then jsonb_array_length(coalesce(s->'clases', '[]'::jsonb))
      else 0
    end
  ), 0)
    into v_doc
  from jsonb_array_elements(v_secciones_doc) s;

  -- Temario relacional gana si tiene contenido; si el snapshot tiene MÁS
  -- ítems (p.ej. un quiz que no llegó a persistir), se conserva el JSON.
  if v_vivas > 0 and v_vivas >= v_doc then
    null; -- v_secciones ya es el temario vivo
  elsif v_doc > 0 then
    v_secciones := v_secciones_doc;
  end if;

  if v_documento is null then
    v_documento := jsonb_build_object(
      'id', p_curso_id,
      'titulo', v_curso->>'titulo',
      'subtitulo', '',
      'descripcion', coalesce(v_curso->>'resumen', ''),
      'publico', '',
      'objetivos', '[]'::jsonb,
      'requisitos', '[]'::jsonb,
      'categoria', coalesce(v_curso->>'categoria', ''),
      'nivel', 'Intermedio',
      'imagen', '',
      'ambito', 'INDEPENDIENTE',
      'organizacionId', null,
      'acceso', 'GRATUITO',
      'precio', 0,
      'visibilidad', 'PUBLICO',
      'permiteEmpresas', false,
      'certificado', true,
      'nombreCertificado', '',
      'notaMinima', 14,
      'vigenciaMeses', 12,
      'secciones', coalesce(v_secciones, '[]'::jsonb)
    );
  else
    v_documento := jsonb_set(
      v_documento,
      '{secciones}',
      coalesce(v_secciones, '[]'::jsonb),
      true
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'curso', v_curso,
    'borrador', v_documento
  );
end;
$$;

revoke all on function public._servicio_secciones_desde_version(uuid)
  from public, anon, authenticated;
grant execute on function public._servicio_secciones_desde_version(uuid)
  to service_role;

revoke all on function public._servicio_version_mas_completa(uuid)
  from public, anon, authenticated;
grant execute on function public._servicio_version_mas_completa(uuid)
  to service_role;

revoke all on function public.servicio_obtener_curso_borrador(uuid)
  from public, anon, authenticated;
grant execute on function public.servicio_obtener_curso_borrador(uuid)
  to service_role;

commit;
