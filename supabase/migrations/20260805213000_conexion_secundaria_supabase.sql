-- Ejecutar una sola vez en el SQL Editor del proyecto principal.
begin;

alter table public.conexion_organizacion enable row level security;
alter table public.version_esquema_organizacion enable row level security;
alter table public.provisionamiento_organizacion enable row level security;

create or replace function public.admin_obtener_conexion_organizacion(p_instalacion_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_conexion public.conexion_organizacion;
begin
  if not public.es_super_admin_actual() then raise exception 'No autorizado' using errcode = '42501'; end if;
  if not exists(select 1 from public.instalacion_organizacion where id=p_instalacion_id) then raise exception 'Organizacion inexistente'; end if;
  select * into v_conexion from public.conexion_organizacion where instalacion_organizacion_id=p_instalacion_id;
  if not found then return jsonb_build_object('configurada',false); end if;
  return jsonb_build_object('configurada',true,'id',v_conexion.id,'proveedor',v_conexion.proveedor,
    'servidorRef',v_conexion.servidor_ref,'puerto',v_conexion.puerto,'nombreBaseLogico',v_conexion.nombre_base_logico,
    'secretoRef',v_conexion.secreto_ref,'region',v_conexion.region,'versionEsquema',v_conexion.version_esquema,
    'estado',v_conexion.estado::text,'verificadaEn',v_conexion.verificada_en,'ultimaMigracionEn',v_conexion.ultima_migracion_en,
    'ultimoError',v_conexion.ultimo_error);
end; $$;

create or replace function public.admin_configurar_conexion_supabase(p_datos jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_instalacion uuid:=(p_datos->>'instalacionId')::uuid; v_id uuid; v_estado public.conexion_organizacion;
  v_ref text:=trim(coalesce(p_datos->>'servidorRef','')); v_secreto text:=trim(coalesce(p_datos->>'secretoRef',''));
begin
  if not public.es_super_admin_actual() then raise exception 'No autorizado' using errcode = '42501'; end if;
  if not exists(select 1 from public.instalacion_organizacion where id=v_instalacion) then raise exception 'Organizacion inexistente'; end if;
  if v_ref='' or v_secreto='' or trim(coalesce(p_datos->>'nombreBaseLogico',''))='' then raise exception 'Proyecto, nombre logico y referencia de secreto son obligatorios'; end if;
  if v_ref !~ '^[a-z0-9]{10,40}$' then raise exception 'servidorRef debe contener la referencia del proyecto Supabase, no una URL ni una clave'; end if;
  select * into v_estado from jsonb_populate_record(null::public.conexion_organizacion,jsonb_build_object('estado','PENDIENTE'));
  insert into public.conexion_organizacion(instalacion_organizacion_id,proveedor,servidor_ref,puerto,nombre_base_logico,secreto_ref,region,version_esquema,estado)
  values(v_instalacion,'SUPABASE',v_ref,5432,trim(p_datos->>'nombreBaseLogico'),v_secreto,nullif(trim(p_datos->>'region'),''),greatest(coalesce((p_datos->>'versionEsquema')::integer,1),1),v_estado.estado)
  on conflict(instalacion_organizacion_id) do update set proveedor='SUPABASE',servidor_ref=excluded.servidor_ref,puerto=5432,
    nombre_base_logico=excluded.nombre_base_logico,secreto_ref=excluded.secreto_ref,region=excluded.region,
    version_esquema=excluded.version_esquema,estado=excluded.estado,verificada_en=null,ultimo_error=null,actualizada_en=now()
  returning id into v_id;
  update public.instalacion_organizacion set estado='PENDIENTE',habilitada_en=null,actualizada_en=now(),version_registro=version_registro+1 where id=v_instalacion;
  return v_id;
end; $$;

revoke all on function public.admin_obtener_conexion_organizacion(uuid) from public;
revoke all on function public.admin_configurar_conexion_supabase(jsonb) from public;
grant execute on function public.admin_obtener_conexion_organizacion(uuid) to authenticated;
grant execute on function public.admin_configurar_conexion_supabase(jsonb) to authenticated;
commit;
