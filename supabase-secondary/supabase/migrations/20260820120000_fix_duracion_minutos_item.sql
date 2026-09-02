-- Corrige _servicio_duracion_minutos_item:
-- greatest(1, NULL) en PostgreSQL devolvía 1 y nunca usaba el fallback,
-- así los videos sin duracionMinutos quedaban guardados como "1 min".
-- Ejecutar en SQL Editor del proyecto SECUNDARIO.
begin;

create or replace function public._servicio_duracion_minutos_item(
  p_item jsonb,
  p_tipo text
)
returns integer
language sql
immutable
as $$
  select coalesce(
    (
      select minutos
      from (
        select case
          when coalesce(
            p_item->>'duracionMinutos',
            p_item->>'duracion_minutos',
            ''
          ) ~ '^\d+$'
            then greatest(
              1,
              (coalesce(
                p_item->>'duracionMinutos',
                p_item->>'duracion_minutos'
              ))::int
            )
          else null
        end as minutos
      ) parsed
      where minutos is not null
    ),
    case
      when p_tipo = 'quiz' then 15
      when p_tipo = 'assignment' then 30
      -- Video: no inventar minutos; la UI usa YouTube Data API / IFrame API.
      else null
    end
  );
$$;

-- Actividades de video que quedaron con el valor fantasma "1" por el bug anterior.
update public.actividad_curso a
set duracion_minutos = null
where lower(a.tipo::text) = 'video'
  and a.duracion_minutos = 1
  and nullif(trim(coalesce(a.url_contenido, '')), '') is not null;

commit;
