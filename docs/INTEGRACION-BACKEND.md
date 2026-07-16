# Integración del backend real

## Objetivo

La interfaz trabaja temporalmente con datos persistentes de demostración. La
capa `src/api/repositorio-local.ts` mantiene el mismo contrato de lectura y
escritura que la API: cuando `VITE_USE_MOCK=true` usa `localStorage`; con
`VITE_USE_MOCK=false` ejecuta solicitudes HTTP mediante Axios.

Las vistas no deben volver a importar datos `mock` para operaciones de negocio.
Las semillas se consumen únicamente dentro de los servicios.

## Activar la API

```env
VITE_API_URL=https://api.tukuy.pe/api
VITE_USE_MOCK=false
```

El build de producción ya fuerza el modo real. El backend debe aceptar cookies
seguras o `Authorization: Bearer`, y validar siempre la membresía activa. El
cliente envía también `X-Tukuy-Membresia-Id` y
`X-Tukuy-Organizacion-Id` cuando corresponde.

## Contrato de colecciones

Los repositorios usan un contrato REST uniforme:

- `GET /recurso`: lista registros del contexto activo.
- `GET /recurso/:id`: obtiene un registro.
- `POST /recurso`: crea un registro.
- `PATCH /recurso/:id`: actualiza parcialmente un registro.
- `DELETE /recurso/:id`: elimina un registro.

Todos los registros deben incluir `id` estable. Las respuestas deben devolver
el registro definitivo generado por el servidor, incluyendo identificadores,
fechas y estados calculados.

## Endpoints preparados

### Docente

- `/docente/cursos`
- `/docente/estudiantes`
- `/docente/evaluaciones`
- `/docente/sesiones`
- `/docente/calificaciones`
- `/docente/certificados`
- `/docente/certificados/pendientes`
- `/docente/conversaciones`
- `/docente/configuracion`

Un curso docente conserva `ambito`, `organizacionId` y `modeloAcceso`. El
backend debe impedir que una membresía consulte o modifique cursos de otro
ámbito.

### Seguimiento académico, entregas y certificados

- `PUT /academico/cursos/:cursoId/estructura` — sincroniza módulos y actividades.
- `GET /docente/calificaciones/cursos` — devuelve el resumen del libro por curso.
- `GET /docente/cursos/:cursoId/entregas` — lista estudiantes, tareas y archivos.
- `POST /aprendizaje/cursos/:cursoId/actividades/:actividadId/entregas` — recibe
  el PDF del estudiante mediante `multipart/form-data`.
- `GET /docente/entregas/:entregaId/archivo` — entrega una URL firmada y temporal.
- `POST /docente/entregas/:entregaId/calificacion` — registra nota y devolución.
- `POST /docente/entregas/:entregaId/solicitar-correccion` — habilita un nuevo
  intento sin otorgar horas.
- `POST /docente/certificados/pendientes/:id/emitir` — emite solo si el servidor
  confirma actividades, nota mínima y horas.
- `GET /certificados/verificar/:codigo` — consulta pública del QR, sin exponer
  documentos privados ni datos adicionales del estudiante.

La elegibilidad del certificado se calcula en el servidor. La interfaz no puede
crear un certificado a partir de una sola nota ni alterar las horas reconocidas.
Cada emisión conserva una instantánea inmutable de curso, versión del programa,
nota, horas, módulos, organización emisora y estado de vigencia.

### Organización

- `/organizacion/usuarios`
- `/organizacion/areas`
- `/organizacion/asignaciones`
- `/organizacion/rutas-aprendizaje`
- `/organizacion/configuracion`

Todas las consultas se resuelven con la organización de la membresía activa; el
backend no debe confiar en un `organizacionId` enviado dentro del cuerpo.

### Administración Tukuy

- `/administracion/organizaciones`
- `/administracion/usuarios`
- `/administracion/cursos`
- `/administracion/planes`
- `/administracion/facturas`
- `/administracion/auditoria`
- `/administracion/configuracion`

Las operaciones administrativas deben crear eventos de auditoría inmutables.
Los cambios de estado, conciliaciones y aprobaciones deben ser idempotentes.

### Catálogo público

- `/courses`
- `/courses/:id/public-detail`
- `/courses/:id/content` — temario (módulos, lecciones, quizzes)
- `/courses/:id/progress` — avance del estudiante (GET/PATCH)
- `/aprendizaje/contenidos` — colección de contenidos (demo/API)
- `/aprendizaje/progresos` — colección de progresos (demo/API)

En modo mock el front persiste contenidos y progresos en
`tukuy_aprendizaje_contenidos` y `tukuy_aprendizaje_progresos` vía
`aprendizajeService`. Con `VITE_USE_MOCK=false` usa los endpoints HTTP.

Las estructuras, entregas, notas y verificaciones de demostración se guardan en
colecciones `tukuy_demo_academico_*`. Los metadatos permanecen en
`localStorage`; los PDF se guardan como binarios en IndexedDB, dentro de
`tukuy-academy-archivos/entregas-pdf`, para no saturar la cuota de texto del
navegador. En producción los archivos deben ir a almacenamiento privado y solo
exponerse mediante URLs firmadas de corta duración.

El detalle público incluye temario, instructor, experiencia, video de
presentación, precio anterior y descuento. La matrícula y el precio final se
validan nuevamente en el backend.

## Datos locales de demostración

Cada colección se guarda en una clave `tukuy_demo_*` con este sobre:

```json
{
  "version": 1,
  "actualizadoEn": "2026-07-16T12:00:00.000Z",
  "datos": []
}
```

La versión permite renovar una semilla cuando cambia el modelo. Las acciones
de alta, edición, suspensión, aprobación, renovación, calificación,
certificación y asignación sobreviven a una recarga del navegador.

Para reiniciar una demostración se pueden eliminar solo las claves
`tukuy_demo_*` desde las herramientas del navegador; no se deben borrar las
claves de autenticación o contexto durante una sesión activa.

## Seguridad obligatoria del backend

- Autorizar cada solicitud por usuario, membresía, rol y permiso.
- Usar cookies `httpOnly`, `Secure` y `SameSite` preferentemente.
- Ignorar importes, roles, estados privilegiados y organización calculables
  enviados por el navegador.
- Validar archivos, límites, tipos MIME y análisis antimalware.
- Aplicar paginación, búsqueda y ordenamiento en servidor para colecciones
  grandes.
- Implementar idempotencia en pagos, matrículas, certificados y facturación.
- Rotar credenciales de Izipay que hayan sido compartidas previamente.
