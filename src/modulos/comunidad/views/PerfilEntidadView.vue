<script setup lang="ts">
import {
  ArrowLeft,
  BadgeCheck,
  BookOpen,
  Building2,
  CheckCircle2,
  Globe,
  Mail,
  MapPin,
  MessageSquareText,
  LockKeyhole,
  Tags,
  UserPlus,
  UsersRound,
} from "lucide-vue-next";
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCarrito } from "@/composables/useCarrito";
import { matricularCurso } from "@/lib/acceso-curso";
import { entidadesComunidadService } from "../services/entidades.service";
import type {
  CategoriaCursoEntidad,
  CursoPerfilEntidad,
  EntidadPublicaComunidad,
  EvaluacionAccesoCursoPerfil,
  EstadoMembresiaEntidad,
  PublicacionEntidadResumen,
} from "../types/entidad-publica.types";

const route = useRoute();
const router = useRouter();
const { addToCart, isInCart } = useCarrito();
const cargando = ref(true);
const procesando = ref(false);
const mensaje = ref("");
const error = ref<string | null>(null);
const entidad = ref<EntidadPublicaComunidad | null>(null);
const publicaciones = ref<PublicacionEntidadResumen[]>([]);
const categorias = ref<CategoriaCursoEntidad[]>([]);
const cursos = ref<CursoPerfilEntidad[]>([]);
const accesos = ref<Record<string, EvaluacionAccesoCursoPerfil>>({});
const cursoProcesando = ref("");
const categoriaFiltro = ref("TODAS");
const estado = ref<EstadoMembresiaEntidad>("NINGUNA");
const dniSolicitud = ref("");
const mostrarFormularioUnirse = ref(false);
const matriculadosIds = ref(new Set<string>());

const etiquetaTipo = computed(() => {
  const mapa: Record<string, string> = {
    COLEGIO: "Colegio profesional",
    EMPRESA: "Empresa",
    ACADEMIA: "Academia",
    INSTITUCION: "Institución",
    ONG: "Organización social",
  };
  return entidad.value ? mapa[entidad.value.tipo] ?? entidad.value.tipo : "";
});

const textoUnirse = computed(() => {
  if (estado.value === "MIEMBRO") return "Ya eres miembro";
  if (estado.value === "SOLICITADA") return "Solicitud enviada";
  return "Unirse";
});

const cursosFiltrados = computed(() =>
  cursos.value.filter(
    (curso) =>
      categoriaFiltro.value === "TODAS" ||
      curso.categoriaIds.includes(categoriaFiltro.value),
  ),
);
const cursosPublicos = computed(() =>
  cursosFiltrados.value.filter((curso) => curso.alcance === "PUBLICO"),
);
const cursosInternos = computed(() =>
  cursosFiltrados.value.filter((curso) => curso.alcance === "INTERNO"),
);

function nombresCategorias(curso: CursoPerfilEntidad) {
  return curso.categoriaIds
    .map((id) => categorias.value.find((item) => item.id === id)?.nombre)
    .filter(Boolean)
    .join(" · ");
}

function textoPrecio(curso: CursoPerfilEntidad) {
  if (curso.gratuito || curso.precio <= 0) return "Gratis";
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: curso.moneda,
  }).format(curso.precio);
}

onMounted(async () => {
  const id = String(route.params.entidadId ?? "");
  try {
    const encontrada = await entidadesComunidadService.obtenerPorId(id);
    if (!encontrada) {
      error.value = "No encontramos esta entidad.";
      return;
    }
    entidad.value = encontrada;
    estado.value = entidadesComunidadService.obtenerEstado(encontrada.id);
    [publicaciones.value, categorias.value, cursos.value] = await Promise.all([
      entidadesComunidadService.obtenerPublicaciones(encontrada.id),
      entidadesComunidadService.obtenerCategorias(encontrada.id),
      entidadesComunidadService.obtenerCursos(encontrada.id),
    ]);
    const evaluaciones = await Promise.all(
      cursos.value.map(async (curso) => [
        curso.id,
        await entidadesComunidadService.evaluarAccesoCurso(curso),
      ] as const),
    );
    accesos.value = Object.fromEntries(evaluaciones);
    matriculadosIds.value = new Set(
      cursos.value
        .filter((curso) => entidadesComunidadService.estaMatriculado(curso.id))
        .map((curso) => curso.id),
    );
  } catch (err) {
    error.value =
      err instanceof Error ? err.message : "No pudimos cargar el perfil.";
  } finally {
    cargando.value = false;
  }
});

async function matricular(curso: CursoPerfilEntidad) {
  const acceso = accesos.value[curso.id];
  if (!acceso?.disponible) return;
  cursoProcesando.value = curso.id;
  error.value = null;
  try {
    const matricula = await entidadesComunidadService.matricularEnCurso(curso);
    // Habilita el reproductor del portal con el mismo id de catálogo.
    await matricularCurso(curso.id);
    matriculadosIds.value = new Set([...matriculadosIds.value, curso.id]);
    mensaje.value =
      matricula.origenAcceso === "APROBACION"
        ? `Solicitud de matrícula enviada para “${curso.titulo}”.`
        : `Te inscribiste correctamente en “${curso.titulo}” como alumno ${matricula.condicionAlInscribirse.toLowerCase()}.`;
  } catch (err) {
    error.value = err instanceof Error ? err.message : "No se pudo completar la matrícula.";
  } finally {
    cursoProcesando.value = "";
  }
}

function verDetalleCurso(curso: CursoPerfilEntidad) {
  void router.push(`/tukuy-academy/cursos/${curso.id}`);
}

async function continuarCurso(curso: CursoPerfilEntidad) {
  // Asegura matrícula en el portal (progreso) aunque solo exista en comunidad.
  await matricularCurso(curso.id);
  void router.push(`/tukuy-academy/aprendizaje/${curso.id}`);
}

function estaInscrito(cursoId: string) {
  return matriculadosIds.value.has(cursoId);
}

function etiquetaAccionCurso(curso: CursoPerfilEntidad) {
  if (estaInscrito(curso.id)) return "Continuar";
  if (cursoProcesando.value === curso.id) return "Procesando…";
  if (curso.gratuito || curso.precio <= 0) return "Inscribirme";
  return isInCart(curso.id) ? "En carrito" : "Agregar";
}

async function ejecutarAccionCurso(curso: CursoPerfilEntidad) {
  if (estaInscrito(curso.id)) {
    continuarCurso(curso);
    return;
  }

  if (!curso.gratuito && curso.precio > 0) {
    if (isInCart(curso.id)) {
      mensaje.value =
        "Este curso ya está en tu carrito. Ábrelo desde el ícono para pagar.";
      return;
    }
    addToCart(curso.id);
    mensaje.value = `“${curso.titulo}” se agregó al carrito. Sigue explorando o paga desde el ícono.`;
    return;
  }

  void matricular(curso);
}

async function unirse() {
  if (!entidad.value || estado.value === "MIEMBRO" || estado.value === "SOLICITADA") {
    return;
  }
  if (entidad.value.requiereDniEnrolamiento && !mostrarFormularioUnirse.value) {
    mostrarFormularioUnirse.value = true;
    return;
  }
  if (entidad.value.requiereDniEnrolamiento && !/^\d{8}$/.test(dniSolicitud.value.trim())) {
    mensaje.value = "";
    error.value = "Ingresa un DNI de 8 dígitos para continuar.";
    return;
  }
  procesando.value = true;
  error.value = null;
  try {
    const resultado = await entidadesComunidadService.solicitarUnirse(
      entidad.value.id,
      entidad.value.requiereDniEnrolamiento
        ? { dni: dniSolicitud.value.trim() }
        : undefined,
    );
    estado.value = resultado.estado;
    mensaje.value = resultado.mensaje;
    mostrarFormularioUnirse.value = false;
  } catch (err) {
    error.value =
      err instanceof Error ? err.message : "No se pudo enviar la solicitud.";
  } finally {
    procesando.value = false;
  }
}

async function contactar() {
  if (!entidad.value) return;
  procesando.value = true;
  try {
    estado.value = await entidadesComunidadService.contactar(entidad.value.id);
    mensaje.value = `Mensaje de contacto registrado para ${entidad.value.correoContacto}.`;
  } finally {
    procesando.value = false;
  }
}
</script>

<template>
  <main>
    <div v-if="cargando" class="mx-auto max-w-360 px-5 py-14 lg:px-8">
      <Skeleton class="h-56 w-full" />
      <Skeleton class="mt-6 h-40 w-full" />
    </div>

    <div
      v-else-if="error || !entidad"
      class="mx-auto max-w-360 px-5 py-14 text-center lg:px-8"
    >
      <Building2 class="mx-auto h-10 w-10 text-muted-foreground" />
      <p class="mt-4 font-black">{{ error || "Entidad no disponible" }}</p>
      <Button class="mt-6" variant="outline" @click="router.push('/comunidad/entidades')">
        Volver al directorio
      </Button>
    </div>

    <template v-else>
      <section class="relative overflow-hidden bg-[#07152B] text-white">
        <img
          :src="entidad.portada"
          :alt="entidad.nombre"
          class="absolute inset-0 h-full w-full object-cover opacity-35"
        />
        <div class="absolute inset-0 bg-gradient-to-t from-[#07152B] via-[#07152B]/80 to-[#07152B]/40" />
        <div class="relative mx-auto max-w-360 px-5 pt-8 pb-12 lg:px-8 lg:pt-10 lg:pb-16">
          <button
            type="button"
            class="inline-flex items-center gap-2 text-sm font-black text-white/75 hover:text-white"
            @click="router.push('/comunidad/entidades')"
          >
            <ArrowLeft class="h-4 w-4" />
            Explorar entidades
          </button>

          <div class="mt-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div class="flex min-w-0 items-start gap-4">
              <img
                :src="entidad.logo"
                :alt="`Logo ${entidad.nombre}`"
                class="h-20 w-20 shrink-0 border border-white/20 bg-white object-contain p-2"
              />
              <div class="min-w-0">
                <p class="text-xs font-black tracking-[.2em] text-accent uppercase">
                  {{ etiquetaTipo }}
                </p>
                <h1 class="mt-2 flex flex-wrap items-center gap-2 text-3xl font-black sm:text-4xl">
                  {{ entidad.nombre }}
                  <BadgeCheck
                    v-if="entidad.verificada"
                    class="h-6 w-6 text-accent"
                    aria-label="Verificada"
                  />
                </h1>
                <p class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-blue-100">
                  <span class="inline-flex items-center gap-1">
                    <MapPin class="h-4 w-4" />
                    {{ entidad.ciudad }}, {{ entidad.region }}
                  </span>
                  <span class="inline-flex items-center gap-1">
                    <UsersRound class="h-4 w-4" />
                    {{ entidad.miembros.toLocaleString("es-PE") }} miembros
                  </span>
                </p>
              </div>
            </div>

            <div class="flex flex-wrap gap-3">
              <Button
                class="bg-accent text-[#07152B] hover:bg-accent/90"
                :disabled="procesando || estado === 'MIEMBRO' || estado === 'SOLICITADA'"
                @click="unirse"
              >
                <CheckCircle2 v-if="estado === 'SOLICITADA' || estado === 'MIEMBRO'" class="h-4 w-4" />
                <UserPlus v-else class="h-4 w-4" />
                {{ textoUnirse }}
              </Button>
              <Button
                variant="outline"
                class="border-white/30 bg-transparent text-white hover:bg-white/10"
                :disabled="procesando"
                @click="contactar"
              >
                <MessageSquareText class="h-4 w-4" />
                Contactar
              </Button>
            </div>
          </div>

          <div
            v-if="mostrarFormularioUnirse && entidad.requiereDniEnrolamiento"
            class="mt-6 max-w-md border border-white/20 bg-white/10 p-4"
          >
            <p class="text-sm font-bold text-white">
              Esta entidad exige DNI para solicitar el ingreso
            </p>
            <input
              v-model="dniSolicitud"
              maxlength="8"
              inputmode="numeric"
              class="mt-3 h-11 w-full border border-white/30 bg-[#07152B] px-3 text-sm text-white outline-none"
              placeholder="8 dígitos"
            />
            <div class="mt-3 flex gap-2">
              <Button
                class="bg-accent text-[#07152B]"
                :disabled="procesando"
                @click="unirse"
              >
                Enviar solicitud
              </Button>
              <Button
                variant="outline"
                class="border-white/30 bg-transparent text-white"
                @click="mostrarFormularioUnirse = false"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      </section>

      <div class="mx-auto grid max-w-360 gap-7 px-5 py-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:px-8 lg:py-14">
        <section class="grid gap-6">
          <p
            v-if="error"
            class="border-l-4 border-l-red-600 bg-red-500/10 px-4 py-3 text-sm text-red-800 dark:text-red-300"
          >
            {{ error }}
          </p>
          <p
            v-if="mensaje"
            class="border-l-4 border-l-emerald-600 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-300"
          >
            {{ mensaje }}
          </p>
          <div
            v-if="estado === 'SOLICITADA'"
            class="border border-border bg-primary/5 p-5 text-sm"
          >
            <b class="text-primary">¿Dónde ve la entidad tu solicitud?</b>
            <p class="mt-2 leading-6 text-muted-foreground">
              Quien administra la organización debe entrar a
              <b class="text-foreground">Organización → Usuarios</b>
              y revisar
              <b class="text-foreground">Pendientes de admisión</b>
              (estado Invitado / origen Comunidad). Desde ahí puede aceptar el ingreso.
            </p>
          </div>

          <article class="border border-border bg-card p-6">
            <h2 class="text-xl font-black">Acerca de la entidad</h2>
            <p class="mt-4 text-sm leading-7 text-muted-foreground">
              {{ entidad.descripcion }}
            </p>
            <div class="mt-5 flex flex-wrap gap-2">
              <span
                v-for="etiqueta in entidad.etiquetas"
                :key="etiqueta"
                class="bg-primary/8 px-2.5 py-1 text-xs font-bold text-primary"
              >
                {{ etiqueta }}
              </span>
            </div>
          </article>

          <article v-if="cursos.length" class="border border-border bg-card">
            <div class="border-b border-border px-6 py-5">
              <div class="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 class="flex items-center gap-2 text-xl font-black">
                    <BookOpen class="h-5 w-5 text-primary" />
                    Cursos de la entidad
                  </h2>
                  <p class="mt-1 text-sm text-muted-foreground">
                    Los cursos públicos admiten alumnos externos; los internos validan tu nodo activo.
                  </p>
                </div>
                <div class="flex flex-wrap gap-2">
                  <button
                    type="button"
                    class="border px-3 py-1.5 text-xs font-black transition"
                    :class="categoriaFiltro === 'TODAS' ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground hover:border-primary'"
                    @click="categoriaFiltro = 'TODAS'"
                  >
                    Todas
                  </button>
                  <button
                    v-for="categoria in categorias.filter((item) => item.visibleEnCatalogo)"
                    :key="categoria.id"
                    type="button"
                    class="border px-3 py-1.5 text-xs font-black transition"
                    :class="categoriaFiltro === categoria.id ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground hover:border-primary'"
                    @click="categoriaFiltro = categoria.id"
                  >
                    {{ categoria.nombre }}
                  </button>
                </div>
              </div>
            </div>

            <div class="p-6">
              <section v-if="cursosPublicos.length">
                <div class="flex items-center gap-3">
                  <span class="grid h-9 w-9 place-items-center bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                    <BookOpen class="h-4 w-4" />
                  </span>
                  <div>
                    <h3 class="font-black">Cursos para todo público</h3>
                    <p class="text-xs text-muted-foreground">No necesitas pertenecer a la estructura de la entidad.</p>
                  </div>
                </div>
                <div class="mt-4 grid gap-4 md:grid-cols-2">
                  <article
                    v-for="curso in cursosPublicos"
                    :key="curso.id"
                    role="link"
                    tabindex="0"
                    class="cursor-pointer overflow-hidden border border-border transition hover:border-primary/40 hover:shadow-sm"
                    @click="verDetalleCurso(curso)"
                    @keydown.enter.prevent="verDetalleCurso(curso)"
                  >
                    <img :src="curso.imagen" :alt="curso.titulo" class="h-36 w-full object-cover" />
                    <div class="p-4">
                      <p class="text-[10px] font-black uppercase tracking-wide text-emerald-700 dark:text-emerald-400">Público · {{ nombresCategorias(curso) }}</p>
                      <h4 class="mt-2 font-black">{{ curso.titulo }}</h4>
                      <p class="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">{{ curso.resumen }}</p>
                      <p class="mt-3 text-xs text-muted-foreground">{{ curso.docente }} · {{ curso.duracion }}</p>
                      <div class="mt-4 flex items-center justify-between gap-3">
                        <strong class="text-primary">{{ textoPrecio(curso) }}</strong>
                        <Button
                          size="sm"
                          :variant="estaInscrito(curso.id) ? 'outline' : 'default'"
                          :disabled="cursoProcesando === curso.id"
                          @click.stop="ejecutarAccionCurso(curso)"
                        >
                          {{ etiquetaAccionCurso(curso) }}
                        </Button>
                      </div>
                    </div>
                  </article>
                </div>
              </section>

              <section v-if="cursosInternos.length" :class="cursosPublicos.length ? 'mt-8 border-t border-border pt-7' : ''">
                <div class="flex items-center gap-3">
                  <span class="grid h-9 w-9 place-items-center bg-primary/10 text-primary"><LockKeyhole class="h-4 w-4" /></span>
                  <div>
                    <h3 class="font-black">Cursos para miembros internos</h3>
                    <p class="text-xs text-muted-foreground">Requieren pertenecer a uno de los nodos configurados por la entidad.</p>
                  </div>
                </div>
                <div class="mt-4 grid gap-4 md:grid-cols-2">
                  <article
                    v-for="curso in cursosInternos"
                    :key="curso.id"
                    role="link"
                    tabindex="0"
                    class="cursor-pointer overflow-hidden border border-border transition hover:border-primary/40 hover:shadow-sm"
                    @click="verDetalleCurso(curso)"
                    @keydown.enter.prevent="verDetalleCurso(curso)"
                  >
                    <div class="relative">
                      <img :src="curso.imagen" :alt="curso.titulo" class="h-36 w-full object-cover" :class="!accesos[curso.id]?.disponible ? 'grayscale' : ''" />
                      <span class="absolute left-3 top-3 inline-flex items-center gap-1 bg-[#07152B] px-2 py-1 text-[10px] font-black uppercase text-white"><LockKeyhole class="h-3 w-3" /> Interno</span>
                    </div>
                    <div class="p-4">
                      <p class="text-[10px] font-black uppercase tracking-wide text-primary">{{ nombresCategorias(curso) }}</p>
                      <h4 class="mt-2 font-black">{{ curso.titulo }}</h4>
                      <p class="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">{{ curso.resumen }}</p>
                      <div class="mt-3 border-l-4 px-3 py-2 text-xs" :class="accesos[curso.id]?.disponible ? 'border-l-emerald-600 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300' : 'border-l-amber-500 bg-amber-500/10 text-amber-900 dark:text-amber-300'">
                        {{ accesos[curso.id]?.motivo }}
                      </div>
                      <div class="mt-4 flex items-center justify-between gap-3">
                        <strong>{{ textoPrecio(curso) }}</strong>
                        <Button
                          v-if="estaInscrito(curso.id)"
                          size="sm"
                          variant="outline"
                          @click.stop="continuarCurso(curso)"
                        >
                          Continuar
                        </Button>
                        <Button
                          v-else-if="accesos[curso.id]?.disponible"
                          size="sm"
                          :disabled="cursoProcesando === curso.id"
                          @click.stop="matricular(curso)"
                        >
                          {{
                            cursoProcesando === curso.id
                              ? "Procesando…"
                              : accesos[curso.id]?.origenAcceso === "APROBACION"
                                ? "Solicitar matrícula"
                                : "Inscribirme"
                          }}
                        </Button>
                        <Button v-else size="sm" variant="outline" :disabled="estado === 'SOLICITADA'" @click.stop="unirse">
                          {{ estado === "SOLICITADA" ? "Acceso solicitado" : "Solicitar acceso" }}
                        </Button>
                      </div>
                    </div>
                  </article>
                </div>
              </section>

              <div v-if="!cursosFiltrados.length" class="py-10 text-center text-sm text-muted-foreground">
                <Tags class="mx-auto mb-3 h-8 w-8" />
                No hay cursos publicados en esta categoría.
              </div>
            </div>
          </article>

          <article class="border border-border bg-card">
            <div class="border-b border-border px-6 py-5">
              <h2 class="text-xl font-black">Publicaciones de la entidad</h2>
              <p class="mt-1 text-sm text-muted-foreground">
                Lo que esta organización comparte en Comunidad Tukuy.
              </p>
            </div>
            <div v-if="!publicaciones.length" class="px-6 py-10 text-sm text-muted-foreground">
              Aún no hay publicaciones visibles.
            </div>
            <div v-else class="divide-y divide-border">
              <article
                v-for="publicacion in publicaciones"
                :key="publicacion.id"
                class="px-6 py-5"
              >
                <p class="text-[10px] font-black tracking-wide text-primary uppercase">
                  {{ publicacion.tipo }} · {{ publicacion.fecha }}
                </p>
                <h3 class="mt-2 text-base font-black">{{ publicacion.titulo }}</h3>
                <p class="mt-2 text-sm leading-6 text-muted-foreground">
                  {{ publicacion.extracto }}
                </p>
              </article>
            </div>
          </article>
        </section>

        <aside class="grid content-start gap-5">
          <section class="border-t-4 border-accent bg-card p-6">
            <h2 class="font-black">Resumen</h2>
            <dl class="mt-5 grid gap-4 text-sm">
              <div class="flex justify-between gap-3 border-b border-border pb-3">
                <dt class="text-muted-foreground">Publicaciones</dt>
                <dd class="font-black">{{ entidad.publicaciones }}</dd>
              </div>
              <div class="flex justify-between gap-3 border-b border-border pb-3">
                <dt class="text-muted-foreground">Cursos activos</dt>
                <dd class="font-black">{{ entidad.cursosActivos }}</dd>
              </div>
              <div class="flex justify-between gap-3 border-b border-border pb-3">
                <dt class="text-muted-foreground">Vacantes abiertas</dt>
                <dd class="font-black">{{ entidad.vacantesAbiertas }}</dd>
              </div>
              <div class="flex justify-between gap-3">
                <dt class="text-muted-foreground">DNI al enrolar</dt>
                <dd class="font-black">
                  {{ entidad.requiereDniEnrolamiento ? "Requerido" : "No requerido" }}
                </dd>
              </div>
            </dl>
          </section>

          <section class="border border-border bg-card p-6">
            <h2 class="font-black">Contacto</h2>
            <a
              :href="`mailto:${entidad.correoContacto}`"
              class="mt-4 flex items-center gap-2 text-sm font-bold text-primary"
            >
              <Mail class="h-4 w-4" />
              {{ entidad.correoContacto }}
            </a>
            <a
              v-if="entidad.sitioWeb"
              :href="entidad.sitioWeb"
              target="_blank"
              rel="noreferrer"
              class="mt-3 flex items-center gap-2 text-sm font-bold text-primary"
            >
              <Globe class="h-4 w-4" />
              Sitio web
            </a>
          </section>
        </aside>
      </div>
    </template>
  </main>
</template>
