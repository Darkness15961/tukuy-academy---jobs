-- Catálogo org: incluir cursos ocultos (RETIRADO) para que Administración los revise.
-- Eliminación permanente: borra la fila del catálogo principal.

begin;

create or replace function public.org_listar_cursos_catalogo(
  p_instalacion_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_items jsonb;
begin
  if p_instalacion_id is null
    or not (
      public.org_tiene_permiso(p_instalacion_id, 'cursos.ver')
      or public.org_tiene_permiso(p_instalacion_id, 'cursos.revisar')
      or public.org_tiene_permiso(p_instalacion_id, 'cursos.aprobar')
    )
  then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(item order by item->>'actualizadoEn' desc nulls last), '[]'::jsonb)
  into v_items
  from (
    select jsonb_build_object(
      'id', c.id,
      'cursoSecundarioRef', c.curso_secundario_ref,
      'instalacionId', c.instalacion_proveedora_id,
      'codigo', c.codigo,
      'titulo', c.titulo,
      'resumen', c.resumen,
      'modalidad', c.modalidad,
      'duracionMinutos', c.duracion_minutos,
      'imagenPublicaRef', c.imagen_publica_ref,
      'estadoPublicacion', c.estado_publicacion::text,
      'versionPublicada', c.version_publicada,
      'datosHistoricos', c.datos_historicos,
      'publicadoEn', c.publicado_en,
      'creadoEn', c.creado_en,
      'actualizadoEn', c.actualizado_en
    ) as item
    from public.curso_catalogo c
    where c.instalacion_proveedora_id = p_instalacion_id
      -- Incluye RETIRADO (oculto por docente). Excluye borrado definitivo.
      and coalesce((c.datos_historicos->>'eliminadoPermanente')::boolean, false) is not true
  ) listado;

  return jsonb_build_object(
    'ok', true,
    'total', jsonb_array_length(v_items),
    'cursos', v_items
  );
end;
$$;

create or replace function public.org_eliminar_curso_catalogo_permanente(
  p_instalacion_id uuid,
  p_curso_secundario_ref uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if p_instalacion_id is null or p_curso_secundario_ref is null then
    raise exception 'Instalación y curso requeridos';
  end if;

  if not (
    public.org_tiene_permiso(p_instalacion_id, 'cursos.aprobar')
    or public.org_tiene_permiso(p_instalacion_id, 'cursos.administrar')
    or public.es_super_admin_actual()
  ) then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  update public.curso_catalogo c
  set
    estado_publicacion = 'RETIRADO'::public.estado_publicacion_catalogo,
    datos_historicos = coalesce(c.datos_historicos, '{}'::jsonb)
      || jsonb_build_object(
        'eliminadoPermanente', true,
        'eliminadoEn', now()
      ),
    actualizado_en = now(),
    retirado_en = coalesce(c.retirado_en, now())
  where c.instalacion_proveedora_id = p_instalacion_id
    and c.curso_secundario_ref = p_curso_secundario_ref
  returning c.id into v_id;

  if v_id is null then
    return jsonb_build_object('ok', true, 'eliminado', false);
  end if;

  return jsonb_build_object('ok', true, 'eliminado', true, 'id', v_id);
end;
$$;

revoke all on function public.org_eliminar_curso_catalogo_permanente(uuid, uuid) from public;
grant execute on function public.org_eliminar_curso_catalogo_permanente(uuid, uuid) to authenticated;

-- Ocultar del catálogo público (RETIRADO) sin exigir permiso de aprobación.
-- Lo usan docentes al «eliminar» (ocultar) y admins al archivar.
create or replace function public.org_ocultar_curso_catalogo(
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

  if not (
    public.es_super_admin_actual()
    or public.org_tiene_permiso(p_instalacion_id, 'cursos.ver')
    or public.org_tiene_permiso(p_instalacion_id, 'cursos.revisar')
    or public.org_tiene_permiso(p_instalacion_id, 'cursos.aprobar')
    or exists (
      select 1
      from public.identidad_principal identidad
      join public.membresia_principal membresia
        on membresia.identidad_principal_id = identidad.id
      where identidad.auth_usuario_ref = (select auth.uid())
        and membresia.instalacion_organizacion_ref = p_instalacion_id
        and membresia.estado = 'ACTIVA'
    )
  ) then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  select * into v_existente
  from public.curso_catalogo c
  where c.instalacion_proveedora_id = p_instalacion_id
    and c.curso_secundario_ref = p_curso_secundario_ref;

  if not found then
    return jsonb_build_object('ok', true, 'oculto', false);
  end if;

  v_datos := coalesce(v_existente.datos_historicos, '{}'::jsonb)
    || coalesce(p_datos_historicos, '{}'::jsonb)
    || jsonb_build_object('ocultoEn', now());

  update public.curso_catalogo c
  set
    estado_publicacion = 'RETIRADO'::public.estado_publicacion_catalogo,
    datos_historicos = v_datos,
    actualizado_en = now(),
    retirado_en = coalesce(c.retirado_en, now())
  where c.id = v_existente.id;

  return jsonb_build_object(
    'ok', true,
    'oculto', true,
    'id', v_existente.id
  );
end;
$$;

revoke all on function public.org_ocultar_curso_catalogo(uuid, uuid, jsonb) from public;
grant execute on function public.org_ocultar_curso_catalogo(uuid, uuid, jsonb) to authenticated;

commit;
