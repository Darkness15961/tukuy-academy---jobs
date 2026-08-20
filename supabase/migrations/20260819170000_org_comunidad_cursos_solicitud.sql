-- PRINCIPAL: cursos publicados en perfil de Comunidad + solicitud de ingreso autenticada.

begin;

create or replace function public.org_listar_cursos_perfil_publico(
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
  if p_instalacion_id is null then
    raise exception 'Instalación requerida';
  end if;

  if auth.uid() is null then
    raise exception 'Sesión requerida' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.instalacion_organizacion i
    where i.id = p_instalacion_id
  ) then
    raise exception 'La instalación indicada no existe.';
  end if;

  select coalesce(jsonb_agg(item order by item->>'titulo'), '[]'::jsonb)
  into v_items
  from (
    select jsonb_build_object(
      'id', c.id,
      'cursoSecundarioRef', c.curso_secundario_ref,
      'instalacionId', c.instalacion_proveedora_id,
      'titulo', c.titulo,
      'resumen', coalesce(c.resumen, ''),
      'imagenPublicaRef', c.imagen_publica_ref,
      'duracionMinutos', c.duracion_minutos,
      'estadoPublicacion', c.estado_publicacion::text,
      'datosHistoricos', coalesce(c.datos_historicos, '{}'::jsonb),
      'publicadoEn', c.publicado_en
    ) as item
    from public.curso_catalogo c
    where c.instalacion_proveedora_id = p_instalacion_id
      and c.estado_publicacion::text = 'PUBLICADO'
  ) listado;

  return jsonb_build_object(
    'ok', true,
    'total', jsonb_array_length(v_items),
    'cursos', v_items
  );
end;
$$;

create or replace function public.org_solicitar_ingreso_comunidad(
  p_instalacion_id uuid,
  p_dni text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_identidad public.identidad_principal%rowtype;
  v_instalacion public.instalacion_organizacion%rowtype;
  v_membresia public.membresia_principal%rowtype;
  v_dni text := nullif(trim(p_dni), '');
begin
  if p_instalacion_id is null then
    raise exception 'Instalación requerida';
  end if;

  if auth.uid() is null then
    raise exception 'Sesión requerida' using errcode = '42501';
  end if;

  select * into v_identidad
  from public.identidad_principal i
  where i.auth_usuario_ref = auth.uid()
  limit 1;
  if not found then
    raise exception 'Tu cuenta aún no está vinculada en Tukuy.';
  end if;

  select * into v_instalacion
  from public.instalacion_organizacion i
  where i.id = p_instalacion_id;
  if not found then
    raise exception 'La entidad indicada no existe.';
  end if;

  select * into v_membresia
  from public.membresia_principal m
  where m.instalacion_organizacion_ref = p_instalacion_id
    and m.identidad_principal_id = v_identidad.id
    and m.alcance_tipo = 'ORGANIZACION'
    and m.estado in ('PENDIENTE', 'ACTIVA', 'SUSPENDIDA')
  order by
    case m.estado
      when 'ACTIVA' then 0
      when 'PENDIENTE' then 1
      else 2
    end
  limit 1;

  if found and v_membresia.estado = 'ACTIVA' then
    return jsonb_build_object(
      'estado', 'MIEMBRO',
      'identidadId', v_identidad.id,
      'yaExistia', true
    );
  end if;

  if found and v_membresia.estado = 'PENDIENTE' then
    return jsonb_build_object(
      'estado', 'SOLICITADA',
      'identidadId', v_identidad.id,
      'yaExistia', true
    );
  end if;

  insert into public.membresia_principal (
    identidad_principal_id,
    empresa_principal_ref,
    empresa_sistema_ref,
    tenant_ref,
    instalacion_organizacion_ref,
    alcance_tipo,
    estado
  ) values (
    v_identidad.id,
    v_instalacion.empresa_principal_ref,
    v_instalacion.empresa_sistema_ref,
    v_instalacion.tenant_ref,
    v_instalacion.id,
    'ORGANIZACION',
    'PENDIENTE'
  );

  return jsonb_build_object(
    'estado', 'SOLICITADA',
    'identidadId', v_identidad.id,
    'yaExistia', false
  );
end;
$$;

revoke all on function public.org_listar_cursos_perfil_publico(uuid) from public;
revoke all on function public.org_solicitar_ingreso_comunidad(uuid, text) from public;
grant execute on function public.org_listar_cursos_perfil_publico(uuid) to authenticated;
grant execute on function public.org_solicitar_ingreso_comunidad(uuid, text) to authenticated;

commit;
