-- PRINCIPAL: el usuario puede actualizar su nombre completo (identidad).
-- SQL Editor del proyecto PRINCIPAL (nidkyztqapeqdplzvnkc).

begin;

drop function if exists public.identidad_cuenta_guardar(text, text, jsonb);

create or replace function public.identidad_cuenta_guardar(
  p_telefono text default null,
  p_fecha_nacimiento text default null,
  p_preferencias jsonb default null,
  p_nombre text default null
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
  v_nombre text;
  v_nombres text;
  v_apellidos text;
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

  if p_nombre is not null then
    v_nombre := trim(regexp_replace(p_nombre, '\s+', ' ', 'g'));
    if v_nombre = '' then
      raise exception 'Ingresa tu nombre completo';
    end if;
    v_nombres := split_part(v_nombre, ' ', 1);
    v_apellidos := nullif(trim(substr(v_nombre, char_length(v_nombres) + 1)), '');
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
    nombre_mostrar = case
      when p_nombre is null then nombre_mostrar
      else v_nombre
    end,
    nombres = case
      when p_nombre is null then nombres
      else v_nombres
    end,
    apellidos = case
      when p_nombre is null then apellidos
      else v_apellidos
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

revoke all on function public.identidad_cuenta_guardar(text, text, jsonb, text)
  from public, anon;
grant execute on function public.identidad_cuenta_guardar(text, text, jsonb, text)
  to authenticated;

commit;
