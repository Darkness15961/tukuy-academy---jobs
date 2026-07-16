// Punto de compatibilidad durante la migración modular.
// El código nuevo debe importar desde el archivo específico de cada dominio.
export type {
  Course,
  CourseLesson,
  CoursePricing,
  CourseSection,
  DetalleCursoPublico,
  InstructorCursoPublico,
  ModuloCursoPublico,
  SystemCourse,
} from "./curso.types";
export type { Job } from "./empleo.types";
export type { CarouselSlide, TukuyModule } from "./contenido.types";
export type { UserProfile, WorkExperience } from "./usuario.types";
export type { ViewId } from "./navegacion.types";
export type {
  ConfiguracionPublicaIzipay,
  ConfirmarRespuestaPago,
  CrearOrdenPagoCurso,
  EntornoPago,
  EstadoOrdenPago,
  MetodoPagoIzipay,
  ProveedorPago,
  RespuestaClienteIzipay,
  ResumenOrdenPago,
  SesionPagoCurso,
} from "./pago.types";
