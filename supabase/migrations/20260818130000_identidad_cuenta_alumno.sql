-- PRINCIPAL: datos de cuenta del alumno (teléfono, nacimiento, preferencias).
-- SQL Editor del proyecto PRINCIPAL (nidkyztqapeqdplzvnkc).

begin;

alter table public.identidad_principal
  add column if not exists telefono text;

alter table public.identidad_principal
  add column if not exists fecha_nacimiento date;

alter table public.identidad_principal
  add column if not exists preferencias jsonb not null default '{}'::jsonb;

comment on column public.identidad_principal.telefono is
  'Celular de contacto del usuario (cuenta / configuración).';
comment on column public.identidad_principal.fecha_nacimiento is
  'Fecha de nacimiento declarada por el usuario.';
comment on column public.identidad_principal.preferencias is
  'Preferencias de cuenta: notificaciones, idioma.';

create or replace function public.identidad_cuenta_mia()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_row public.identidad_principal%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Sesión requerida';
  end if;

  select * into v_row
  from public.identidad_principal
  where auth_usuario_ref = auth.uid()
  limit 1;

  if not found then
    return jsonb_build_object(
      'ok', true,
      'correo', '',
      'telefono', '',
      'fechaNacimiento', null,
      'nombre', '',
      'proveedor', 'email',
      'preferencias', '{}'::jsonb
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'correo', coalesce(v_row.correo, ''),
    'telefono', coalesce(v_row.telefono, ''),
    'fechaNacimiento', v_row.fecha_nacimiento,
    'nombre', coalesce(
      nullif(trim(v_row.nombre_mostrar), ''),
      nullif(trim(concat_ws(' ', v_row.nombres, v_row.apellidos)), ''),
      ''
    ),
    'proveedor', coalesce(v_row.proveedor, 'email'),
    'preferencias', coalesce(v_row.preferencias, '{}'::jsonb)
  );
end;
$$;

create or replace function public.identidad_cuenta_guardar(
  p_telefono text default null,
  p_fecha_nacimiento text default null,
  p_preferencias jsonb default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_prefs jsonb;
  v_fecha date;
begin
  if auth.uid() is null then
    raise exception 'Sesión requerida';
  end if;

  v_prefs := case
    when p_preferencias is null then null
    when jsonb_typeof(p_preferencias) = 'object' then p_preferencias
    else '{}'::jsonb
  end;

  if p_fecha_nacimiento is not null and trim(p_fecha_nacimiento) <> '' then
    begin
      v_fecha := trim(p_fecha_nacimiento)::date;
    exception when others then
      raise exception 'Fecha de nacimiento inválida';
    end;
  else
    v_fecha := null;
  end if;

  update public.identidad_principal
  set
    telefono = case
      when p_telefono is null then telefono
      else nullif(trim(p_telefono), '')
    end,
    fecha_nacimiento = case
      when p_fecha_nacimiento is null then fecha_nacimiento
      else v_fecha
    end,
    preferencias = case
      when v_prefs is null then preferencias
      else v_prefs
    end,
    actualizada_en = now(),
    version_registro = version_registro + 1
  where auth_usuario_ref = auth.uid();

  if not found then
    raise exception 'Identidad no encontrada';
  end if;

  return public.identidad_cuenta_mia();
end;
$$;

revoke all on function public.identidad_cuenta_mia() from public, anon;
grant execute on function public.identidad_cuenta_mia() to authenticated;

revoke all on function public.identidad_cuenta_guardar(text, text, jsonb)
  from public, anon;
grant execute on function public.identidad_cuenta_guardar(text, text, jsonb)
  to authenticated;

commit;
