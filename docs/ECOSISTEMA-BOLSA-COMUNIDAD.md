# Ecosistema Tukuy: Perfil profesional, Bolsa y Comunidad

## Alcance

Perfil profesional, Bolsa Tukuy y Comunidad Tukuy son capacidades
transversales. No pertenecen al portal estudiante: una misma persona puede
entrar desde un contexto de estudiante, docente, organización o administración
sin cambiar de cuenta.

El perfil profesional reemplaza la opción aislada "CV inteligente". Reúne el
CV, experiencia, competencias y evidencias de la persona en una sola vista del
Ecosistema.

Las acciones personales —buscar y postular, publicar, comentar y reaccionar—
pertenecen al usuario autenticado. Las acciones empresariales y de moderación
dependen del contexto activo y de permisos explícitos.

## Rutas

- `/bolsa-tukuy`
- `/bolsa-tukuy/vacantes/:vacanteId`
- `/bolsa-tukuy/mis-postulaciones`
- `/bolsa-tukuy/gestion`
- `/comunidad`
- `/comunidad/publicaciones/:publicacionId`
- `/comunidad/grupos`
- `/comunidad/eventos`
- `/comunidad/moderacion`
- `/perfil-profesional`
- `/perfil-profesional/editar`

Las rutas anteriores `/tukuy-academy/bolsa-tukuy`, `/tukuy-academy/cv` y
`/tukuy-academy/cv/editor` redirigen a sus rutas transversales.

## Permisos

Comunes a toda cuenta:

- `bolsa.ver`, `bolsa.postular` y `bolsa.guardar`.
- `comunidad.ver`, `comunidad.publicar`, `comunidad.comentar` y
  `comunidad.reaccionar`.

Organización:

- `vacantes.gestionar`, `vacantes.publicar` y
  `postulaciones.gestionar`.

Administración Tukuy:

- `vacantes.moderar` y `comunidad.moderar`.

## Contexto de API

El cliente envía `X-Tukuy-Membresia-Id` y, cuando existe,
`X-Tukuy-Organizacion-Id`. Estos encabezados seleccionan un contexto, pero no
son autorización: el backend debe comprobar que la membresía pertenece al
token autenticado y que incluye el permiso requerido.

Las postulaciones siempre se registran a nombre del usuario. La creación y
gestión de vacantes se registra a nombre de la organización activa.

## Módulos

```text
src/modulos/
├── ecosistema/
│   └── EcosistemaTukuyLayout.vue
├── perfil-laboral/
│   └── composables/
├── bolsa-tukuy/
│   ├── components/
│   ├── composables/
│   ├── data/
│   ├── services/
│   ├── types/
│   └── views/
└── comunidad/
    ├── components/
    ├── composables/
    ├── data/
    ├── services/
    ├── types/
    └── views/
```

Los nombres del dominio se mantienen en español. `View`, `Layout`, `service`,
`composable`, `mock` y `types` se conservan como términos técnicos.

## Persistencia

En modo mock, las postulaciones usan almacenamiento local para permitir probar
el flujo completo sin backend. En producción, `VITE_USE_MOCK=false` obliga a
consumir los endpoints de Bolsa y Comunidad definidos en `src/api/endpoints.ts`.

Las publicaciones, reacciones, comentarios, grupos, eventos, vacantes y
postulaciones deben persistirse en backend antes de una salida a producción.
