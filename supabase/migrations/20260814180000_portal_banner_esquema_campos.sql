-- PRINCIPAL: Esquema de campos distinto por tipo de banner (fuente en BD).
-- Ejecutar DESPUÉS de 20260814170000_portal_banner_tipos_catalogo.sql

begin;

alter table public.portal_banner_tipo
  add column if not exists esquema_campos jsonb not null default '{}'::jsonb;

comment on column public.portal_banner_tipo.esquema_campos is
  'Define qué campos pide el formulario por tipo (visible/requerido/label/placeholder/default).';

-- ANUNCIO: comunicado con enlace externo o interno
update public.portal_banner_tipo
set esquema_campos = '{
  "etiqueta": {"visible": true, "requerido": false, "label": "Etiqueta", "placeholder": "Ej. Aviso institucional"},
  "titulo": {"visible": true, "requerido": true, "label": "Título del anuncio"},
  "subtitulo": {"visible": true, "requerido": true, "label": "Mensaje / detalle", "placeholder": "Qué deben saber los alumnos"},
  "badges": {"visible": false, "requerido": false},
  "ctaTexto": {"visible": true, "requerido": true, "label": "Texto del botón", "default": "Ver anuncio"},
  "ctaUrl": {"visible": true, "requerido": true, "label": "Enlace del anuncio", "placeholder": "https://… o /ruta-interna"},
  "cursoRef": {"visible": false, "requerido": false},
  "vigenciaDesde": {"visible": false, "requerido": false},
  "vigenciaHasta": {"visible": false, "requerido": false},
  "imagen": {"visible": true, "requerido": true, "label": "Imagen del anuncio"}
}'::jsonb
where codigo = 'ANUNCIO';

-- CURSO: destaca un curso del catálogo (sin URL libre; usa cursoRef)
update public.portal_banner_tipo
set
  requiere_curso_ref = true,
  esquema_campos = '{
  "etiqueta": {"visible": true, "requerido": false, "label": "Etiqueta", "placeholder": "Ej. Destacado"},
  "titulo": {"visible": true, "requerido": true, "label": "Título en el carrusel", "placeholder": "Nombre o gancho del curso"},
  "subtitulo": {"visible": true, "requerido": false, "label": "Resumen corto", "placeholder": "1 línea opcional"},
  "badges": {"visible": true, "requerido": false, "label": "Badges", "placeholder": "Nuevo, Certificado"},
  "ctaTexto": {"visible": true, "requerido": true, "label": "Texto del botón", "default": "Ver curso"},
  "ctaUrl": {"visible": false, "requerido": false},
  "cursoRef": {"visible": true, "requerido": true, "label": "ID del curso (secundaria)", "placeholder": "UUID del curso publicado"},
  "vigenciaDesde": {"visible": false, "requerido": false},
  "vigenciaHasta": {"visible": false, "requerido": false},
  "imagen": {"visible": true, "requerido": true, "label": "Portada del curso"}
}'::jsonb
where codigo = 'CURSO';

-- INFORMACION: mensaje institucional (sin CTA obligatorio)
update public.portal_banner_tipo
set esquema_campos = '{
  "etiqueta": {"visible": true, "requerido": false, "label": "Sección", "placeholder": "Ej. Bienvenida"},
  "titulo": {"visible": true, "requerido": true, "label": "Título informativo"},
  "subtitulo": {"visible": true, "requerido": true, "label": "Contenido / explicación", "placeholder": "Texto que verá el alumno"},
  "badges": {"visible": false, "requerido": false},
  "ctaTexto": {"visible": false, "requerido": false},
  "ctaUrl": {"visible": false, "requerido": false},
  "cursoRef": {"visible": false, "requerido": false},
  "vigenciaDesde": {"visible": false, "requerido": false},
  "vigenciaHasta": {"visible": false, "requerido": false},
  "imagen": {"visible": true, "requerido": true, "label": "Imagen de apoyo"}
}'::jsonb
where codigo = 'INFORMACION';

-- PROMO: campaña con vigencia y enlace
update public.portal_banner_tipo
set esquema_campos = '{
  "etiqueta": {"visible": true, "requerido": true, "label": "Nombre de la promo", "placeholder": "Ej. Promo marzo"},
  "titulo": {"visible": true, "requerido": true, "label": "Oferta / beneficio"},
  "subtitulo": {"visible": true, "requerido": false, "label": "Condiciones cortas"},
  "badges": {"visible": true, "requerido": false, "label": "Badges", "placeholder": "-20%, Cupos limitados"},
  "ctaTexto": {"visible": true, "requerido": true, "label": "Texto del botón", "default": "Aprovechar oferta"},
  "ctaUrl": {"visible": true, "requerido": true, "label": "Enlace de la promo", "placeholder": "https://… o /tukuy-academy/…"},
  "cursoRef": {"visible": false, "requerido": false},
  "vigenciaDesde": {"visible": true, "requerido": false, "label": "Vigente desde"},
  "vigenciaHasta": {"visible": true, "requerido": true, "label": "Vigente hasta"},
  "imagen": {"visible": true, "requerido": true, "label": "Arte de la campaña"}
}'::jsonb
where codigo = 'PROMO';

create or replace function public.listar_tipos_banner_portal()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_items jsonb;
begin
  if auth.uid() is null then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'codigo', t.codigo,
        'nombre', t.nombre,
        'descripcion', t.descripcion,
        'requiereCursoRef', t.requiere_curso_ref,
        'orden', t.orden,
        'activo', t.activo,
        'esquemaCampos', coalesce(t.esquema_campos, '{}'::jsonb)
      )
      order by t.orden, t.codigo
    ),
    '[]'::jsonb
  )
  into v_items
  from public.portal_banner_tipo t
  where t.activo;

  return jsonb_build_object('ok', true, 'tipos', v_items);
end;
$$;

revoke all on function public.listar_tipos_banner_portal() from public;
grant execute on function public.listar_tipos_banner_portal() to authenticated;

commit;
