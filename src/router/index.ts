import { createRouter, createWebHistory } from "vue-router";

import { AUTH_TOKEN_KEY, CONTEXTO_SESION_KEY } from "@/lib/constants";
import { rutaInicioPortal } from "@/composables/useContextoSesion";
import { portalPathByView } from "@/lib/portal-routes";

const portalLayout = () => import("@/views/portal/PortalLayout.vue");
const docenteLayout = () => import("@/portal-docente/DocenteLayout.vue");
const organizacionLayout = () =>
  import("@/portal-organizacion/OrganizacionLayout.vue");
const ecosistemaLayout = () =>
  import("@/modulos/ecosistema/EcosistemaTukuyLayout.vue");
const administracionTukuyLayout = () =>
  import("@/administracion-tukuy/AdministracionTukuyLayout.vue");

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      name: "landing",
      component: () => import("@/portal-publico/views/InicioView.vue"),
    },
    {
      path: "/planes",
      name: "planes-empresariales",
      component: () =>
        import("@/portal-publico/views/PlanesEmpresarialesView.vue"),
    },
    {
      path: "/cursos/:cursoId",
      name: "detalle-curso-publico",
      component: () => import("@/portal-publico/views/DetalleCursoView.vue"),
    },
    {
      path: "/certificados/verificar/:codigo",
      name: "verificar-certificado-publico",
      component: () =>
        import("@/portal-publico/views/VerificarCertificadoView.vue"),
    },
    {
      path: "/pago/curso/:cursoId",
      name: "pago-curso",
      component: () => import("@/views/pagos/PagoCursoView.vue"),
      meta: { requiresAuth: true, allowWithoutContext: true },
    },
    {
      path: "/",
      component: ecosistemaLayout,
      meta: { requiresAuth: true, allowWithoutContext: true },
      children: [
        {
          path: "bolsa-tukuy",
          name: "bolsa-tukuy",
          component: () =>
            import("@/modulos/bolsa-tukuy/views/BolsaTukuyView.vue"),
        },
        {
          path: "bolsa-tukuy/vacantes/:vacanteId",
          name: "detalle-vacante",
          component: () =>
            import("@/modulos/bolsa-tukuy/views/DetalleVacanteView.vue"),
        },
        {
          path: "bolsa-tukuy/mis-postulaciones",
          name: "mis-postulaciones",
          component: () =>
            import("@/modulos/bolsa-tukuy/views/MisPostulacionesView.vue"),
        },
        {
          path: "bolsa-tukuy/gestion",
          name: "gestion-vacantes",
          component: () =>
            import("@/modulos/bolsa-tukuy/views/GestionVacantesView.vue"),
          meta: {
            allowWithoutContext: false,
            requiredPermission: "vacantes.gestionar",
          },
        },
        {
          path: "comunidad",
          name: "comunidad-tukuy",
          component: () =>
            import("@/modulos/comunidad/views/ComunidadView.vue"),
        },
        {
          path: "comunidad/publicaciones/:publicacionId",
          name: "detalle-publicacion-comunidad",
          component: () =>
            import("@/modulos/comunidad/views/DetallePublicacionView.vue"),
        },
        {
          path: "comunidad/grupos",
          name: "grupos-comunidad",
          component: () =>
            import("@/modulos/comunidad/views/GruposComunidadView.vue"),
        },
        {
          path: "comunidad/eventos",
          name: "eventos-comunidad",
          component: () =>
            import("@/modulos/comunidad/views/EventosComunidadView.vue"),
        },
        {
          path: "comunidad/moderacion",
          name: "moderacion-comunidad",
          component: () =>
            import("@/modulos/comunidad/views/ModeracionComunidadView.vue"),
          meta: {
            allowWithoutContext: false,
            requiredPermission: "comunidad.moderar",
          },
        },
        {
          path: "perfil-profesional",
          name: "perfil-profesional",
          component: () => import("@/views/portal/cv/CvView.vue"),
        },
        {
          path: "perfil-profesional/editar",
          name: "editar-perfil-profesional",
          component: () => import("@/views/portal/cv/CvEditorView.vue"),
        },
      ],
    },
    {
      path: "/login",
      name: "login",
      component: () => import("@/views/LoginView.vue"),
    },
    {
      path: "/seleccionar-contexto",
      name: "seleccionar-contexto",
      component: () => import("@/views/SeleccionarContextoView.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/docente",
      component: docenteLayout,
      redirect: "/docente/inicio",
      meta: { requiresAuth: true, portal: "docente" },
      children: [
        {
          path: "inicio",
          name: "inicio-docente",
          component: () =>
            import("@/portal-docente/views/InicioDocenteView.vue"),
          meta: { titulo: "Inicio" },
        },
        {
          path: "cursos",
          name: "cursos-docente",
          component: () =>
            import("@/portal-docente/views/CursosDocenteView.vue"),
          meta: { titulo: "Mis cursos", requiredPermission: "cursos.ver" },
        },
        {
          path: "cursos/nuevo",
          name: "crear-curso-docente",
          component: () =>
            import("@/portal-docente/views/ConstructorCursoView.vue"),
          meta: { titulo: "Crear curso", requiredPermission: "cursos.crear" },
        },
        {
          path: "cursos/:cursoId/constructor",
          name: "constructor-curso-docente",
          component: () =>
            import("@/portal-docente/views/ConstructorCursoView.vue"),
          meta: {
            titulo: "Constructor de curso",
            requiredPermission: "cursos.editar",
          },
        },
        {
          path: "estudiantes",
          name: "estudiantes-docente",
          component: () =>
            import("@/portal-docente/views/EstudiantesDocenteView.vue"),
          meta: {
            titulo: "Estudiantes",
            requiredPermission: "estudiantes.ver",
          },
        },
        {
          path: "evaluaciones",
          name: "evaluaciones-docente",
          component: () =>
            import("@/portal-docente/views/EvaluacionesDocenteView.vue"),
          meta: {
            titulo: "Evaluaciones",
            requiredPermission: "evaluaciones.calificar",
          },
        },
        {
          path: "calificaciones",
          name: "calificaciones-docente",
          component: () =>
            import("@/portal-docente/views/CalificacionesDocenteView.vue"),
          meta: {
            titulo: "Calificaciones",
            requiredPermission: "calificaciones.gestionar",
          },
        },
        {
          path: "calificaciones/:cursoId",
          name: "detalle-calificaciones-curso-docente",
          component: () =>
            import("@/portal-docente/views/DetalleCalificacionesCursoView.vue"),
          meta: {
            titulo: "Libro de calificaciones del curso",
            requiredPermission: "calificaciones.gestionar",
          },
        },
        {
          path: "certificados",
          name: "certificados-docente",
          component: () =>
            import("@/portal-docente/views/CertificadosDocenteView.vue"),
          meta: {
            titulo: "Certificados",
            requiredPermission: "certificados.emitir",
          },
        },
        {
          path: "sesiones",
          name: "sesiones-docente",
          component: () =>
            import("@/portal-docente/views/SesionesDocenteView.vue"),
          meta: {
            titulo: "Sesiones en vivo",
            requiredPermission: "sesiones.gestionar",
          },
        },
        {
          path: "mensajes",
          name: "mensajes-docente",
          component: () =>
            import("@/portal-docente/views/MensajesDocenteView.vue"),
          meta: { titulo: "Mensajes", requiredPermission: "mensajes.enviar" },
        },
        {
          path: "analitica",
          name: "analitica-docente",
          component: () =>
            import("@/portal-docente/views/AnaliticaDocenteView.vue"),
          meta: { titulo: "Analítica", requiredPermission: "analitica.ver" },
        },
        {
          path: "ingresos",
          name: "ingresos-docente",
          component: () =>
            import("@/portal-docente/views/IngresosDocenteView.vue"),
          meta: { titulo: "Ingresos", requiredPermission: "ingresos.ver" },
        },
        {
          path: "configuracion",
          name: "configuracion-docente",
          component: () =>
            import("@/portal-docente/views/ConfiguracionDocenteView.vue"),
          meta: { titulo: "Configuración" },
        },
      ],
    },
    {
      path: "/organizacion",
      component: organizacionLayout,
      redirect: "/organizacion/inicio",
      meta: { requiresAuth: true, portal: "organizacion" },
      children: [
        {
          path: "inicio",
          name: "inicio-organizacion",
          component: () =>
            import("@/portal-organizacion/views/InicioOrganizacionView.vue"),
          meta: { titulo: "Inicio" },
        },
        {
          path: "usuarios",
          name: "usuarios-organizacion",
          component: () =>
            import("@/portal-organizacion/views/UsuariosOrganizacionView.vue"),
          meta: { titulo: "Usuarios", requiredPermission: "usuarios.ver" },
        },
        {
          path: "alumnos",
          name: "alumnos-organizacion",
          component: () =>
            import(
              "@/portal-organizacion/views/AlumnosOrganizacionView.vue"
            ),
          meta: {
            titulo: "Alumnos",
            requiredPermission: "estudiantes.ver",
          },
        },
        {
          path: "certificados",
          name: "certificados-organizacion",
          component: () =>
            import(
              "@/portal-organizacion/views/CertificadosOrganizacionView.vue"
            ),
          meta: {
            titulo: "Certificados institucionales",
            requiredPermission: "certificados.emitir",
          },
        },
        {
          path: "equipos",
          name: "equipos-organizacion",
          component: () =>
            import("@/portal-organizacion/views/EquiposOrganizacionView.vue"),
          meta: {
            titulo: "Equipos y áreas",
            requiredPermission: "equipos.administrar",
          },
        },
        {
          path: "asignaciones",
          name: "asignaciones-organizacion",
          component: () =>
            import(
              "@/portal-organizacion/views/AsignacionesOrganizacionView.vue"
            ),
          meta: {
            titulo: "Asignaciones",
            requiredPermission: "asignaciones.crear",
          },
        },
        {
          path: "licencia",
          name: "licencia-organizacion",
          component: () =>
            import("@/portal-organizacion/views/LicenciaOrganizacionView.vue"),
          meta: {
            titulo: "Licencia y consumo",
            requiredPermission: "licencias.ver",
          },
        },
        {
          path: "cursos",
          name: "cursos-organizacion",
          component: () =>
            import("@/portal-organizacion/views/CatalogoOrganizacionView.vue"),
          meta: {
            titulo: "Catálogo de cursos",
            requiredPermission: "cursos.ver",
          },
        },
        {
          path: "rutas",
          name: "rutas-organizacion",
          component: () =>
            import("@/portal-organizacion/views/RutasAprendizajeView.vue"),
          meta: {
            titulo: "Rutas de aprendizaje",
            requiredPermission: "rutas.administrar",
          },
        },
        {
          path: "reportes",
          name: "reportes-organizacion",
          component: () =>
            import("@/portal-organizacion/views/ReportesOrganizacionView.vue"),
          meta: { titulo: "Reportes", requiredPermission: "reportes.ver" },
        },
        {
          path: "facturacion",
          name: "facturacion-organizacion",
          component: () =>
            import(
              "@/portal-organizacion/views/FacturacionOrganizacionView.vue"
            ),
          meta: {
            titulo: "Facturación",
            requiredPermission: "facturacion.ver",
          },
        },
        {
          path: "configuracion",
          name: "configuracion-organizacion",
          component: () =>
            import(
              "@/portal-organizacion/views/ConfiguracionOrganizacionView.vue"
            ),
          meta: {
            titulo: "Configuración",
            requiredPermission: "configuracion.editar",
          },
        },
      ],
    },
    {
      path: "/admin",
      component: administracionTukuyLayout,
      redirect: "/admin/inicio",
      meta: { requiresAuth: true, portal: "admin" },
      children: [
        {
          path: "inicio",
          name: "inicio-admin",
          component: () =>
            import("@/administracion-tukuy/views/InicioAdministracionView.vue"),
          meta: { titulo: "Panel global" },
        },
        {
          path: "organizaciones",
          name: "organizaciones-admin",
          component: () =>
            import(
              "@/administracion-tukuy/views/OrganizacionesAdministracionView.vue"
            ),
          meta: {
            titulo: "Organizaciones",
            requiredPermission: "organizaciones.ver",
          },
        },
        {
          path: "usuarios",
          name: "usuarios-admin",
          component: () =>
            import(
              "@/administracion-tukuy/views/UsuariosAdministracionView.vue"
            ),
          meta: { titulo: "Usuarios", requiredPermission: "usuarios.ver" },
        },
        {
          path: "cursos",
          name: "cursos-admin",
          component: () =>
            import("@/administracion-tukuy/views/CursosAdministracionView.vue"),
          meta: {
            titulo: "Cursos y revisión",
            requiredPermission: "cursos.revisar",
          },
        },
        {
          path: "planes-licencias",
          name: "planes-licencias-admin",
          component: () =>
            import(
              "@/administracion-tukuy/views/PlanesLicenciasAdministracionView.vue"
            ),
          meta: {
            titulo: "Planes y licencias",
            requiredPermission: "licencias.administrar",
          },
        },
        {
          path: "facturacion",
          name: "facturacion-admin",
          component: () =>
            import(
              "@/administracion-tukuy/views/FacturacionAdministracionView.vue"
            ),
          meta: {
            titulo: "Facturación",
            requiredPermission: "facturacion.ver",
          },
        },
        {
          path: "auditoria",
          name: "auditoria-admin",
          component: () =>
            import(
              "@/administracion-tukuy/views/AuditoriaAdministracionView.vue"
            ),
          meta: {
            titulo: "Auditoría",
            requiredPermission: "auditoria.ver",
          },
        },
        {
          path: "configuracion",
          name: "configuracion-admin",
          component: () =>
            import(
              "@/administracion-tukuy/views/ConfiguracionAdministracionView.vue"
            ),
          meta: { titulo: "Configuración" },
        },
      ],
    },
    {
      path: "/app",
      redirect: portalPathByView.courses,
      meta: { requiresAuth: true, portal: "estudiante" },
    },
    {
      path: "/app/:pathMatch(.*)*",
      redirect: (to) => `/tukuy-academy/${to.params.pathMatch || "cursos"}`,
      meta: { requiresAuth: true, portal: "estudiante" },
    },
    {
      path: "/tukuy-academy/bolsa-tukuy",
      redirect: "/bolsa-tukuy",
      meta: { requiresAuth: true, allowWithoutContext: true },
    },
    {
      path: "/tukuy-academy",
      component: portalLayout,
      redirect: portalPathByView.courses,
      meta: { requiresAuth: true, portal: "estudiante" },
      children: [
        {
          path: "aprendizaje/:courseId",
          name: "portal-learning-player",
          component: () =>
            import("@/views/portal/reproductor-curso/ReproductorCursoView.vue"),
          meta: { requiresAuth: true, hideHeaderFooter: true },
        },
        {
          path: "cursos",
          name: "portal-courses",
          component: () => import("@/views/portal/cursos/CursosView.vue"),
          meta: {
            requiresAuth: true,
            view: "courses",
            requiredPermission: "cursos.ver",
          },
        },
        {
          path: "mi-aprendizaje",
          name: "portal-learning",
          component: () =>
            import("@/views/portal/aprendizaje/AprendizajeView.vue"),
          meta: {
            requiresAuth: true,
            view: "learning",
            requiredPermission: "aprendizaje.consumir",
          },
        },
        {
          path: "favoritos",
          name: "portal-favorites",
          component: () => import("@/views/portal/favoritos/FavoritosView.vue"),
          meta: { requiresAuth: true, view: "favorites" },
        },
        {
          path: "carrito",
          name: "portal-cart",
          component: () => import("@/views/portal/carrito/CarritoView.vue"),
          meta: { requiresAuth: true, view: "courses" },
        },
        {
          path: "cv-inteligente",
          redirect: "/perfil-profesional",
        },
        {
          path: "cv",
          redirect: "/perfil-profesional",
        },
        {
          path: "cv/editor",
          redirect: "/perfil-profesional/editar",
        },
        {
          path: "certificados",
          name: "portal-certificates",
          component: () =>
            import("@/views/portal/certificados/CertificadosView.vue"),
          meta: {
            requiresAuth: true,
            view: "certificates",
            requiredPermission: "certificados.ver",
          },
        },
        {
          path: "perfil",
          name: "portal-profile",
          component: () => import("@/views/portal/perfil/PerfilView.vue"),
          meta: { requiresAuth: true, view: "profile" },
        },
        {
          path: "configuracion",
          name: "portal-settings",
          component: () =>
            import("@/views/portal/configuracion/ConfiguracionView.vue"),
          meta: { requiresAuth: true, view: "settings" },
        },
      ],
    },
    {
      path: "/:pathMatch(.*)*",
      redirect: "/",
    },
  ],
  scrollBehavior(to) {
    if (to.hash) {
      return { el: to.hash, behavior: "smooth", top: 88 };
    }
    return { top: 0 };
  },
});

router.beforeEach((to) => {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  const contextoGuardado = localStorage.getItem(CONTEXTO_SESION_KEY);
  if (to.meta.requiresAuth && !token) {
    return { name: "login", query: { continuar: to.fullPath } };
  }
  if (to.name === "login" && token) {
    const continuar = to.query.continuar;
    if (
      typeof continuar === "string" &&
      continuar.startsWith("/") &&
      !continuar.startsWith("//")
    ) {
      return continuar;
    }
    if (!contextoGuardado) return { name: "seleccionar-contexto" };
    try {
      const contexto = JSON.parse(contextoGuardado) as {
        portal: "estudiante" | "docente" | "organizacion" | "admin";
      };
      return rutaInicioPortal(contexto.portal);
    } catch {
      localStorage.removeItem(CONTEXTO_SESION_KEY);
      return { name: "seleccionar-contexto" };
    }
  }
  if (
    to.meta.requiresAuth &&
    to.name !== "seleccionar-contexto" &&
    !to.meta.allowWithoutContext &&
    !contextoGuardado
  ) {
    return { name: "seleccionar-contexto" };
  }

  if (contextoGuardado && to.meta.portal) {
    try {
      const contexto = JSON.parse(contextoGuardado) as {
        portal?: string;
        permisos?: string[];
      };
      if (contexto.portal !== to.meta.portal) {
        return { name: "seleccionar-contexto" };
      }
      if (
        typeof to.meta.requiredPermission === "string" &&
        !contexto.permisos?.includes(to.meta.requiredPermission)
      ) {
        return rutaInicioPortal(
          contexto.portal as
            | "estudiante"
            | "docente"
            | "organizacion"
            | "admin",
        );
      }
    } catch {
      localStorage.removeItem(CONTEXTO_SESION_KEY);
      return { name: "seleccionar-contexto" };
    }
  }
});

export default router;
