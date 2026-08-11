-- Completa permisos del perfil Docente (INSTRUCTOR) para el portal real.
-- Ejecutar en el SQL Editor del proyecto PRINCIPAL.
begin;

insert into public.permiso_principal (codigo, nombre, descripcion, modulo_codigo)
values
  ('evaluaciones.calificar', 'Calificar evaluaciones', 'Revisar y calificar entregas de estudiantes.', 'APRENDIZAJE'),
  ('calificaciones.gestionar', 'Gestionar calificaciones', 'Administrar notas y correcciones del curso.', 'APRENDIZAJE'),
  ('certificados.emitir', 'Emitir certificados', 'Emitir certificados académicos a estudiantes.', 'CERTIFICADOS'),
  ('mensajes.enviar', 'Enviar mensajes', 'Comunicarse con estudiantes desde el portal docente.', 'COMUNICACION'),
  ('analitica.ver', 'Ver analítica', 'Consultar indicadores del portal docente.', 'REPORTES')
on conflict (codigo) do update set
  nombre = excluded.nombre,
  descripcion = excluded.descripcion,
  modulo_codigo = excluded.modulo_codigo,
  estado = 'ACTIVO',
  actualizado_en = now();

with faltantes(perfil_codigo, permiso_codigo) as (
  values
    ('INSTRUCTOR', 'estudiantes.ver'),
    ('INSTRUCTOR', 'evaluaciones.calificar'),
    ('INSTRUCTOR', 'calificaciones.gestionar'),
    ('INSTRUCTOR', 'certificados.emitir'),
    ('INSTRUCTOR', 'certificados.ver'),
    ('INSTRUCTOR', 'mensajes.enviar'),
    ('INSTRUCTOR', 'analitica.ver')
)
insert into public.perfil_permiso_principal (perfil_principal_id, permiso_principal_id)
select perfil.id, permiso.id
from faltantes
join public.perfil_principal perfil on perfil.codigo = faltantes.perfil_codigo
join public.permiso_principal permiso on permiso.codigo = faltantes.permiso_codigo
on conflict do nothing;

-- Fuerza refresco de contextos en el siguiente login / obtener_mis_contextos.
update public.membresia_principal m
set
  version_autorizacion = m.version_autorizacion + 1,
  actualizada_en = now()
where exists (
  select 1
  from public.funcion_principal f
  join public.perfil_principal p on p.id = f.perfil_principal_id
  where f.membresia_principal_id = m.id
    and p.codigo = 'INSTRUCTOR'
    and f.estado = 'ACTIVA'
);

commit;
