-- Ejecutar una sola vez en el SQL Editor del proyecto principal.

begin;

create table if not exists public.modulo_sistema_catalogo (
  id uuid primary key default gen_random_uuid(),
  codigo varchar not null unique,
  nombre varchar not null,
  descripcion varchar,
  portal varchar not null,
  orden integer not null default 0,
  estado varchar not null default 'ACTIVO' check (estado in ('ACTIVO', 'INACTIVO')),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz
);

alter table public.modulo_sistema_catalogo enable row level security;

insert into public.modulo_sistema_catalogo(id, codigo, nombre, descripcion, portal, orden) values
  ('61000000-0000-4000-8000-000000000001', 'ACADEMIA', 'Academia', 'Cursos, contenidos, matriculas y aprendizaje.', 'ORGANIZACION', 10),
  ('61000000-0000-4000-8000-000000000002', 'DOCENCIA', 'Docencia', 'Gestion docente, evaluaciones y seguimiento.', 'DOCENTE', 20),
  ('61000000-0000-4000-8000-000000000003', 'CERTIFICADOS', 'Certificados', 'Emision, firma y verificacion de certificados.', 'ORGANIZACION', 30),
  ('61000000-0000-4000-8000-000000000004', 'REPORTES', 'Reportes', 'Indicadores y reportes institucionales.', 'ORGANIZACION', 40),
  ('61000000-0000-4000-8000-000000000005', 'BOLSA', 'Bolsa Tukuy', 'Vacantes, postulaciones y empleabilidad.', 'ECOSISTEMA', 50),
  ('61000000-0000-4000-8000-000000000006', 'COMUNIDAD', 'Comunidad', 'Publicaciones, grupos y eventos.', 'ECOSISTEMA', 60),
  ('61000000-0000-4000-8000-000000000007', 'FACTURACION', 'Facturacion', 'Licencias, cobros y comprobantes.', 'ORGANIZACION', 70),
  ('61000000-0000-4000-8000-000000000008', 'INTEGRACIONES', 'Integraciones', 'Conectores y servicios externos.', 'ORGANIZACION', 80)
on conflict (codigo) do update set nombre = excluded.nombre, descripcion = excluded.descripcion,
  portal = excluded.portal, orden = excluded.orden, actualizado_en = now();

create unique index if not exists uq_modulo_habilitado_instalacion_modulo
  on public.modulo_habilitado_organizacion(instalacion_organizacion_id, modulo_sistema_ref);

create or replace function public.admin_listar_modulos_organizacion(p_instalacion_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.es_super_admin_actual() then raise exception 'No autorizado' using errcode = '42501'; end if;
  if not exists(select 1 from public.instalacion_organizacion where id = p_instalacion_id) then raise exception 'Organizacion inexistente'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object(
    'id', catalogo.id, 'codigo', catalogo.codigo, 'nombre', catalogo.nombre,
    'descripcion', catalogo.descripcion, 'portal', catalogo.portal,
    'habilitado', coalesce(habilitado.estado::text = 'ACTIVO', false),
    'configuracion', coalesce(habilitado.configuracion, '{}'::jsonb)
  ) order by catalogo.orden, catalogo.nombre)
  from public.modulo_sistema_catalogo catalogo
  left join public.modulo_habilitado_organizacion habilitado
    on habilitado.modulo_sistema_ref = catalogo.id
   and habilitado.instalacion_organizacion_id = p_instalacion_id
  where catalogo.estado = 'ACTIVO'), '[]'::jsonb);
end; $$;

create or replace function public.admin_guardar_modulo_organizacion(
  p_instalacion_id uuid, p_modulo_id uuid, p_habilitado boolean, p_configuracion jsonb default '{}'::jsonb
)
returns void language plpgsql security definer set search_path = '' as $$
declare v_estado public.modulo_habilitado_organizacion;
begin
  if not public.es_super_admin_actual() then raise exception 'No autorizado' using errcode = '42501'; end if;
  if not exists(select 1 from public.instalacion_organizacion where id = p_instalacion_id) then raise exception 'Organizacion inexistente'; end if;
  if not exists(select 1 from public.modulo_sistema_catalogo where id = p_modulo_id and estado = 'ACTIVO') then raise exception 'Modulo inexistente'; end if;
  select * into v_estado from jsonb_populate_record(null::public.modulo_habilitado_organizacion,
    jsonb_build_object('estado', case when p_habilitado then 'ACTIVO' else 'INACTIVO' end));
  insert into public.modulo_habilitado_organizacion(instalacion_organizacion_id, modulo_sistema_ref, configuracion, estado, habilitado_en, deshabilitado_en)
  values(p_instalacion_id, p_modulo_id, coalesce(p_configuracion, '{}'::jsonb), v_estado.estado,
    case when p_habilitado then now() else now() end, case when p_habilitado then null else now() end)
  on conflict (instalacion_organizacion_id, modulo_sistema_ref) do update set
    configuracion = excluded.configuracion, estado = excluded.estado,
    habilitado_en = case when p_habilitado then now() else modulo_habilitado_organizacion.habilitado_en end,
    deshabilitado_en = case when p_habilitado then null else now() end;
  update public.instalacion_organizacion set version_autorizacion_conocida = version_autorizacion_conocida + 1,
    autorizacion_sincronizada_en = null, actualizada_en = now(), version_registro = version_registro + 1
  where id = p_instalacion_id;
end; $$;

revoke all on table public.modulo_sistema_catalogo from anon, authenticated;
revoke all on function public.admin_listar_modulos_organizacion(uuid) from public;
revoke all on function public.admin_guardar_modulo_organizacion(uuid,uuid,boolean,jsonb) from public;
grant execute on function public.admin_listar_modulos_organizacion(uuid) to authenticated;
grant execute on function public.admin_guardar_modulo_organizacion(uuid,uuid,boolean,jsonb) to authenticated;

commit;
