-- PRINCIPAL: asegura perfil Docente (plantilla DOCENCIA → portal INSTRUCTOR).
-- Antes solo existían Dirección, Administración y Firmante.

begin;

create or replace function public.org_asegurar_perfiles_base(
  p_instalacion_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_instalacion_id is null then
    raise exception 'Instalación requerida';
  end if;

  insert into public.org_perfil (
    instalacion_organizacion_id, id, nombre, descripcion, tipo, plantilla,
    nivel_autoridad, permisos, alcance_defecto, ruta_inicial, es_sistema, estado
  ) values
    (
      p_instalacion_id, 'perfil-direccion', 'Dirección',
      'Máxima autoridad y gobierno de la entidad.',
      'DIRECCION', 'DIRECCION', 1000,
      '["usuarios.ver","usuarios.invitar","usuarios.editar","equipos.administrar","perfiles.administrar","cursos.ver","cursos.aprobar","reportes.ver","configuracion.editar","licencias.ver","facturacion.ver"]'::jsonb,
      'ENTIDAD', '/organizacion/inicio', true, 'ACTIVO'
    ),
    (
      p_instalacion_id, 'perfil-administracion', 'Administración',
      'Gestiona la operación, estructura, accesos y capacitación.',
      'ADMINISTRADOR', 'ADMINISTRACION', 900,
      '["usuarios.ver","usuarios.invitar","equipos.administrar","cursos.ver","cursos.aprobar","alumnos.ver","asignaciones.ver","asignaciones.crear","certificados.emitir","reportes.ver","sesiones.gestionar","configuracion.editar"]'::jsonb,
      'ENTIDAD', '/organizacion/inicio', true, 'ACTIVO'
    ),
    (
      p_instalacion_id, 'perfil-firmante-certificados', 'Firmante de certificados',
      'Revisa y firma certificados institucionales dentro del equipo autorizado.',
      'PERSONALIZADO', 'FIRMAS', 750,
      '["certificados.ver","certificados.firmar"]'::jsonb,
      'ENTIDAD', '/organizacion/certificados', true, 'ACTIVO'
    ),
    (
      p_instalacion_id, 'perfil-docente', 'Docente',
      'Imparte cursos, evalúa estudiantes y gestiona su portal docente.',
      'PERSONALIZADO', 'DOCENCIA', 400,
      '["cursos.ver","cursos.crear","alumnos.ver","evaluaciones.calificar","sesiones.gestionar","certificados.ver"]'::jsonb,
      'CURSOS_PROPIOS', '/docente/inicio', true, 'ACTIVO'
    )
  on conflict (instalacion_organizacion_id, id) do nothing;

  -- Orgs que ya tenían perfiles base sin Docente.
  insert into public.org_perfil (
    instalacion_organizacion_id, id, nombre, descripcion, tipo, plantilla,
    nivel_autoridad, permisos, alcance_defecto, ruta_inicial, es_sistema, estado
  )
  select
    i.id,
    'perfil-docente',
    'Docente',
    'Imparte cursos, evalúa estudiantes y gestiona su portal docente.',
    'PERSONALIZADO',
    'DOCENCIA',
    400,
    '["cursos.ver","cursos.crear","alumnos.ver","evaluaciones.calificar","sesiones.gestionar","certificados.ver"]'::jsonb,
    'CURSOS_PROPIOS',
    '/docente/inicio',
    true,
    'ACTIVO'
  from public.instalacion_organizacion i
  where i.id = p_instalacion_id
    and not exists (
      select 1
      from public.org_perfil p
      where p.instalacion_organizacion_id = i.id
        and (
          p.id = 'perfil-docente'
          or upper(coalesce(p.plantilla, '')) = 'DOCENCIA'
        )
    );
end;
$$;

-- Backfill en todas las instalaciones existentes.
do $$
declare
  r record;
begin
  for r in
    select id from public.instalacion_organizacion
  loop
    perform public.org_asegurar_perfiles_base(r.id);
  end loop;
end $$;

commit;
