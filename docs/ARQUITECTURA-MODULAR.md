# Arquitectura modular de Tukuy Academy

## Convención de nombres

Los nombres que representan conceptos del negocio se escriben en español. Los términos técnicos ampliamente reconocidos pueden mantenerse en inglés.

### Términos técnicos permitidos

- `api`, `auth`, `login`, `layout`, `router`, `service`, `composable`, `mock`, `client`, `config`, `types`, `utils`, `portal`, `dashboard`.
- Sufijos técnicos como `View`, `Layout`, `Dto`, `Id` y `API`.

### Términos del dominio en español

- `cursos`, `aprendizaje`, `favoritos`, `empleos`, `certificados`, `perfil`, `configuracion`.
- `usuarios`, `organizaciones`, `membresias`, `docentes`, `estudiantes`, `asignaciones`, `evaluaciones`, `licencias`, `planes`, `reportes`, `facturacion` y `auditoria`.

Ejemplos: `CursosView.vue`, `useCursos.ts`, `cursos.service.ts`, `TarjetaCurso.vue` y `certificado-pdf.ts`.

## Regla de organización

Cada funcionalidad nueva debe pertenecer a un módulo del negocio. Un módulo puede contener componentes, composables, servicios, tipos, mappers y datos mock relacionados con una sola responsabilidad.

```text
src/modulos/<nombre-del-modulo>/
├── components/
├── composables/
├── services/
├── types/
├── mappers/
└── data/
```

Los portales previstos son `portal-estudiante`, `portal-docente`, `portal-organizacion` y `portal-admin`. La migración será progresiva para mantener operativa la aplicación actual.

Las capacidades que acompañan a la persona independientemente de su perfil se
ubican en `src/modulos`. Actualmente `bolsa-tukuy`, `comunidad` y `ecosistema`
usan esta regla para evitar duplicar vistas dentro de cada portal.

## Regla multiempresa

El usuario no tiene un tipo fijo. Su acceso se determina mediante una membresía que relaciona usuario, organización, rol, permisos y estado. Una misma persona puede disponer de varios contextos y seleccionar con cuál ingresar.

### Implementación disponible

- `organizacion.types.ts`: organización, tipo y estado.
- `membresia.types.ts`: membresía, roles, permisos, portal y contexto de sesión.
- `useContextoSesion.ts`: selección, persistencia, permisos y limpieza del contexto activo.
- `SeleccionarContextoView.vue`: selección de organización y rol después del login.
- Guards del router: exigen autenticación, contexto, portal correcto y permisos declarados por ruta.

Mientras el backend no entregue membresías, la aplicación genera un contexto personal de estudiante para mantener compatibilidad. En modo mock se ofrecen contextos de estudiante, docente y administrador de organización.

### Ámbitos del docente

Un docente puede trabajar en dos clases de contexto sin duplicar su cuenta ni
su portal:

- `INDEPENDIENTE`: no requiere organización. Los cursos pertenecen al docente,
  admiten matrícula y venta individual, y sus ingresos son personales.
- `ORGANIZACION`: la membresía vincula al docente con una entidad. Los cursos,
  estudiantes, asignaciones y liquidaciones pertenecen a esa organización.

Cada curso conserva `ambito`, `organizacionId` y el modelo de acceso que le
corresponde. La membresía activa debe formar parte de todas las consultas y
operaciones de escritura; cambiar de contexto no transfiere ni mezcla cursos,
estudiantes, borradores o ingresos.

## Regla global de estados de carga

Toda vista o componente que espere datos asíncronos debe representar primero la
estructura real de su contenido con `Skeleton` de PrimeVue. La aplicación lo
consume exclusivamente mediante el adaptador compartido
`@/components/ui/skeleton`, para mantener dimensiones, colores y esquinas
coherentes en los cuatro portales.

- No se importa `primevue/skeleton` directamente fuera del adaptador compartido.
- Cada esqueleto debe aproximar el contenido final y evitar saltos bruscos de diseño.
- Los indicadores giratorios se reservan para acciones breves iniciadas por la
  persona, como guardar, pagar, exportar o iniciar sesión; no reemplazan el
  esqueleto de carga de una página.

## Etapas

1. Traducir y ordenar el frontend existente sin alterar su comportamiento.
2. Incorporar autenticación con selección de contexto, organizaciones, membresías, roles y permisos.
3. Separar los portales de estudiante, docente, organización y administración Tukuy.
4. Implementar constructor de cursos, matrículas, asignaciones, seguimiento y licencias.
5. Reemplazar progresivamente los datos mock y `localStorage` por persistencia en la API.

## Criterio para código existente

Los cambios de estructura y los cambios del modelo interno se realizan en pasos separados. Primero se traducen rutas de archivos e imports; después se migran tipos, propiedades y funciones del dominio con validación de TypeScript en cada módulo.
