<script setup lang="ts">
import {
  Building2,
  ExternalLink,
  Eye,
  EyeOff,
  Save,
  Sparkles,
} from "lucide-vue-next";
import Skeleton from "primevue/skeleton";
import Tag from "primevue/tag";
import ToggleSwitch from "primevue/toggleswitch";
import { computed, onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";

import { Button } from "@/components/ui/button";
import TituloConAyuda from "@/components/shared/TituloConAyuda.vue";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useContextoSesion } from "@/composables/useContextoSesion";
import { entidadesComunidadService } from "@/modulos/comunidad/services/entidades.service";
import type {
  CursoPerfilEntidad,
  EntidadPublicaComunidad,
} from "@/modulos/comunidad/types/entidad-publica.types";

const router = useRouter();
const { contextoActivo } = useContextoSesion();

const cargando = ref(true);
const guardando = ref(false);
const mensaje = ref("");
const error = ref("");
const entidadId = computed(
  () => contextoActivo.value?.organizacionId ?? "org-empresa-abc",
);

const formulario = reactive({
  nombre: "",
  sector: "",
  ciudad: "",
  region: "",
  descripcionCorta: "",
  descripcion: "",
  logo: "",
  portada: "",
  sitioWeb: "",
  correoContacto: "",
  etiquetasTexto: "",
  requiereDniEnrolamiento: true,
});

const cursos = ref<Array<CursoPerfilEntidad & { visibleEnPerfil: boolean }>>(
  [],
);

const puedeEditar = computed(() =>
  ["OWNER", "ADMIN", "ORGANIZATION_OWNER", "ORGANIZATION_ADMIN"].includes(
    contextoActivo.value?.rol ?? "",
  ),
);

const cursosVisibles = computed(
  () => cursos.value.filter((item) => item.visibleEnPerfil).length,
);

onMounted(() => {
  void cargar();
});

async function cargar() {
  cargando.value = true;
  error.value = "";
  try {
    const [entidad, cursosEditor] = await Promise.all([
      entidadesComunidadService.obtenerPorId(entidadId.value),
      entidadesComunidadService.obtenerCursosEditor(entidadId.value),
    ]);
    if (!entidad) {
      error.value =
        "No hay ficha pública para esta organización en el ecosistema.";
      return;
    }
    aplicarEntidad(entidad);
    cursos.value = cursosEditor;
  } finally {
    cargando.value = false;
  }
}

function aplicarEntidad(entidad: EntidadPublicaComunidad) {
  Object.assign(formulario, {
    nombre: entidad.nombre,
    sector: entidad.sector,
    ciudad: entidad.ciudad,
    region: entidad.region,
    descripcionCorta: entidad.descripcionCorta,
    descripcion: entidad.descripcion,
    logo: entidad.logo,
    portada: entidad.portada,
    sitioWeb: entidad.sitioWeb ?? "",
    correoContacto: entidad.correoContacto,
    etiquetasTexto: entidad.etiquetas.join(", "),
    requiereDniEnrolamiento: entidad.requiereDniEnrolamiento,
  });
}

async function guardarPerfil() {
  error.value = "";
  mensaje.value = "";
  if (!puedeEditar.value) {
    error.value =
      "Solo Dirección o Administración pueden personalizar la presencia pública.";
    return;
  }
  if (!formulario.nombre.trim() || !formulario.descripcionCorta.trim()) {
    error.value = "Nombre y descripción corta son obligatorios.";
    return;
  }
  guardando.value = true;
  try {
    const etiquetas = formulario.etiquetasTexto
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    const actualizada = await entidadesComunidadService.actualizarPerfilPublico(
      entidadId.value,
      {
        nombre: formulario.nombre.trim(),
        sector: formulario.sector.trim(),
        ciudad: formulario.ciudad.trim(),
        region: formulario.region.trim(),
        descripcionCorta: formulario.descripcionCorta.trim(),
        descripcion: formulario.descripcion.trim(),
        logo: formulario.logo.trim(),
        portada: formulario.portada.trim(),
        sitioWeb: formulario.sitioWeb.trim() || undefined,
        correoContacto: formulario.correoContacto.trim(),
        etiquetas,
        requiereDniEnrolamiento: formulario.requiereDniEnrolamiento,
      },
    );
    aplicarEntidad(actualizada);
    mensaje.value = "Presencia pública actualizada. Ya se refleja en Comunidad.";
  } catch (err) {
    error.value =
      err instanceof Error ? err.message : "No se pudo guardar el perfil.";
  } finally {
    guardando.value = false;
  }
}

async function alternarCurso(
  curso: CursoPerfilEntidad & { visibleEnPerfil: boolean },
) {
  if (!puedeEditar.value) return;
  const siguiente = !curso.visibleEnPerfil;
  curso.visibleEnPerfil = siguiente;
  await entidadesComunidadService.actualizarVisibilidadCurso(
    entidadId.value,
    curso.id,
    siguiente,
  );
  mensaje.value = siguiente
    ? `“${curso.titulo}” visible en tu perfil público.`
    : `“${curso.titulo}” oculto del perfil público.`;
}

function verPerfilPublico() {
  router.push(`/comunidad/entidades/${entidadId.value}`);
}
</script>

<template>
  <section class="mx-auto grid max-w-375 gap-6">
    <header class="flex flex-wrap items-end justify-between gap-4">
      <TituloConAyuda
        eyebrow="Ecosistema Tukuy"
        titulo="Presencia pública"
        ayuda="Personaliza lo que tu organización publica en Comunidad y en el directorio de entidades: ficha, contacto y cursos visibles."
      />
      <div class="flex flex-wrap gap-2">
        <Button variant="outline" @click="verPerfilPublico">
          <ExternalLink class="h-4 w-4" />
          Ver perfil público
        </Button>
        <Button :disabled="guardando || !puedeEditar" @click="guardarPerfil">
          <Save class="h-4 w-4" />
          Guardar ficha
        </Button>
      </div>
    </header>

    <p
      v-if="mensaje"
      class="border border-border border-l-4 border-l-emerald-600 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-300"
    >
      {{ mensaje }}
    </p>
    <p
      v-if="error"
      class="border border-border border-l-4 border-l-accent bg-accent/10 px-4 py-3 text-sm text-[#7A5600]"
    >
      {{ error }}
    </p>

    <div v-if="cargando" class="grid gap-5">
      <Skeleton class="h-40 w-full" />
      <div class="grid gap-4 lg:grid-cols-2">
        <Skeleton class="h-64 w-full" />
        <Skeleton class="h-64 w-full" />
      </div>
    </div>

    <template v-else>
      <div class="grid gap-4 sm:grid-cols-3">
        <Card class="border-border border-t-4 border-t-accent bg-card">
          <CardContent class="flex items-center gap-3 p-5">
            <Sparkles class="h-5 w-5 text-[#B87A00]" />
            <div>
              <strong class="block text-lg font-black">Ficha pública</strong>
              <p class="text-xs text-muted-foreground">
                Visible en Entidades / Comunidad
              </p>
            </div>
          </CardContent>
        </Card>
        <Card class="border-border border-t-4 border-t-primary bg-card">
          <CardContent class="p-5">
            <p class="text-xs font-bold text-muted-foreground">Cursos publicados</p>
            <strong class="text-2xl font-black">
              {{ cursosVisibles }} / {{ cursos.length }}
            </strong>
            <p class="text-[11px] text-muted-foreground">
              Visibles en el perfil de la entidad
            </p>
          </CardContent>
        </Card>
        <Card class="border-border border-t-4 border-t-primary bg-card">
          <CardContent class="flex items-center gap-3 p-5">
            <Building2 class="h-5 w-5 text-primary" />
            <div>
              <strong class="block text-sm font-black">{{ formulario.nombre }}</strong>
              <p class="text-xs text-muted-foreground">
                {{ formulario.ciudad }}, {{ formulario.region }}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div class="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Card class="border-border bg-card">
          <CardContent class="grid gap-4 p-5 sm:p-6">
            <div>
              <h2 class="text-lg font-black">Contenido de la ficha</h2>
              <p class="text-xs text-muted-foreground">
                Esto es lo que ven alumnos y profesionales al abrir tu entidad.
              </p>
            </div>

            <div
              class="relative min-h-36 overflow-hidden border border-border bg-muted"
            >
              <img
                :src="formulario.portada || '/img/portal-organizacion.png'"
                alt=""
                class="absolute inset-0 h-full w-full object-cover"
              />
              <div
                class="absolute inset-0 bg-linear-to-t from-[#020817]/85 to-transparent"
              />
              <div class="absolute bottom-3 left-3 flex items-center gap-3">
                <img
                  :src="formulario.logo || '/img/LogoColegioING.png'"
                  alt=""
                  class="h-12 w-12 object-contain bg-white p-1"
                />
                <div class="text-white">
                  <p class="text-sm font-black">{{ formulario.nombre }}</p>
                  <p class="text-xs text-white/80">{{ formulario.descripcionCorta }}</p>
                </div>
              </div>
            </div>

            <div class="grid gap-3 sm:grid-cols-2">
              <label class="grid gap-1.5 text-sm font-bold">
                Nombre público
                <Input v-model="formulario.nombre" :disabled="!puedeEditar" />
              </label>
              <label class="grid gap-1.5 text-sm font-bold">
                Sector
                <Input v-model="formulario.sector" :disabled="!puedeEditar" />
              </label>
              <label class="grid gap-1.5 text-sm font-bold">
                Ciudad
                <Input v-model="formulario.ciudad" :disabled="!puedeEditar" />
              </label>
              <label class="grid gap-1.5 text-sm font-bold">
                Región
                <Input v-model="formulario.region" :disabled="!puedeEditar" />
              </label>
              <label class="grid gap-1.5 text-sm font-bold sm:col-span-2">
                Descripción corta
                <Input
                  v-model="formulario.descripcionCorta"
                  :disabled="!puedeEditar"
                />
              </label>
              <label class="grid gap-1.5 text-sm font-bold sm:col-span-2">
                Descripción completa
                <textarea
                  v-model="formulario.descripcion"
                  rows="4"
                  class="filtro-control min-h-24 w-full resize-y px-3 py-2 text-sm"
                  :disabled="!puedeEditar"
                />
              </label>
              <label class="grid gap-1.5 text-sm font-bold">
                Logo (URL)
                <Input v-model="formulario.logo" :disabled="!puedeEditar" />
              </label>
              <label class="grid gap-1.5 text-sm font-bold">
                Portada (URL)
                <Input v-model="formulario.portada" :disabled="!puedeEditar" />
              </label>
              <label class="grid gap-1.5 text-sm font-bold">
                Sitio web
                <Input v-model="formulario.sitioWeb" :disabled="!puedeEditar" />
              </label>
              <label class="grid gap-1.5 text-sm font-bold">
                Correo de contacto
                <Input
                  v-model="formulario.correoContacto"
                  :disabled="!puedeEditar"
                />
              </label>
              <label class="grid gap-1.5 text-sm font-bold sm:col-span-2">
                Etiquetas (separadas por coma)
                <Input
                  v-model="formulario.etiquetasTexto"
                  :disabled="!puedeEditar"
                  placeholder="Colegiatura, Capítulos, Cusco"
                />
              </label>
              <label
                class="flex items-center justify-between gap-3 border border-border px-3 py-3 sm:col-span-2"
              >
                <span class="text-sm font-bold">
                  Exigir DNI al unirse desde Comunidad
                </span>
                <ToggleSwitch
                  v-model="formulario.requiereDniEnrolamiento"
                  :disabled="!puedeEditar"
                />
              </label>
            </div>
          </CardContent>
        </Card>

        <Card class="border-border bg-card">
          <CardContent class="p-5 sm:p-6">
            <div class="mb-4">
              <h2 class="text-lg font-black">Cursos en el perfil público</h2>
              <p class="text-xs text-muted-foreground">
                Activa o oculta lo que ya publicaste desde el catálogo / wizard
                comercial. Solo afecta la vitrina de Comunidad.
              </p>
            </div>
            <div class="divide-y divide-border border border-border">
              <article
                v-for="curso in cursos"
                :key="curso.id"
                class="flex items-start gap-3 px-3 py-3"
              >
                <img
                  :src="curso.imagen"
                  alt=""
                  class="h-14 w-20 shrink-0 object-cover"
                />
                <div class="min-w-0 flex-1">
                  <div class="flex flex-wrap items-center gap-2">
                    <b class="text-sm">{{ curso.titulo }}</b>
                    <Tag
                      :value="curso.alcance"
                      :severity="curso.alcance === 'PUBLICO' ? 'success' : 'secondary'"
                    />
                  </div>
                  <p class="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {{ curso.resumen }}
                  </p>
                  <p class="mt-1 text-[11px] text-muted-foreground">
                    {{
                      curso.gratuito
                        ? "Gratuito"
                        : `S/ ${curso.precio}`
                    }}
                    · {{ curso.duracion }}
                  </p>
                </div>
                <button
                  type="button"
                  class="grid h-9 w-9 shrink-0 place-items-center border border-border transition hover:bg-muted"
                  :class="
                    curso.visibleEnPerfil
                      ? 'text-emerald-700'
                      : 'text-muted-foreground'
                  "
                  :title="
                    curso.visibleEnPerfil
                      ? 'Ocultar del perfil'
                      : 'Mostrar en el perfil'
                  "
                  :disabled="!puedeEditar"
                  @click="alternarCurso(curso)"
                >
                  <Eye v-if="curso.visibleEnPerfil" class="h-4 w-4" />
                  <EyeOff v-else class="h-4 w-4" />
                </button>
              </article>
              <p
                v-if="!cursos.length"
                class="px-4 py-10 text-center text-sm text-muted-foreground"
              >
                Aún no hay cursos publicados para mostrar.
              </p>
            </div>
            <Button
              class="mt-4 w-full"
              variant="outline"
              @click="router.push('/organizacion/cursos')"
            >
              Ir al catálogo de cursos
            </Button>
          </CardContent>
        </Card>
      </div>
    </template>
  </section>
</template>
