<script setup lang="ts">
import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  Database,
  Download,
  FileText,
  GraduationCap,
  Pencil,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Upload,
} from "lucide-vue-next";
import { computed, ref } from "vue";

import PortalPageSkeleton from "@/components/shared/PortalPageSkeleton.vue";
import PortalSection from "@/components/shared/PortalSection.vue";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { usePerfilLaboral } from "@/modulos/perfil-laboral/composables/usePerfilLaboral";
import { useRouter } from "vue-router";

const portal = usePerfilLaboral();
const router = useRouter();

const showUploadModal = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);
const uploading = ref(false);
const uploadProgress = ref(0);
const uploadStep = ref("");
const uploadedFileName = ref("");
const showSuccessState = ref(false);

const mockExtractedData = {
  name: "Carlos Alberto",
  birthDate: "1995-04-12",
  location: "Lima, Ate",
  trade: "Auxiliar de almacén",
  specialty: "Almacén y logística",
  experiences: [
    {
      id: "exp-ai-1",
      source: "CV Importado (IA)",
      project: "Constructora Galilea (Obra Vial Cusco)",
      role: "Asistente de Control de Materiales",
      location: "Cusco",
      period: "Ene 2024 - Dic 2024",
      modules: ["Logística"],
      status: "Declarado",
      summary:
        "Responsable del ingreso y salida de insumos de acero, cemento y agregados en almacén central. Control de stock operativo con reportes semanales.",
    },
    {
      id: "exp-ai-2",
      source: "CV Importado (IA)",
      project: "Consorcio Vial Lima Sur",
      role: "Controlador de Inventarios",
      location: "Lima",
      period: "Mar 2023 - Nov 2023",
      modules: ["Inventarios"],
      status: "Declarado",
      summary:
        "Auditoría física semanal de Kardex, verificación física contra órdenes de compra y gestión de despacho a subcontratistas.",
    },
  ],
  skills: [
    "Lectura de planos",
    "Kardex digital",
    "Gestión de almacenes",
    "Seguridad en obra",
  ],
};

function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    const file = target.files[0];
    if (file) {
      uploadedFileName.value = file.name;
      triggerAiExtraction();
    }
  }
}

function triggerAiExtraction() {
  showUploadModal.value = true;
  uploading.value = true;
  uploadProgress.value = 0;
  uploadStep.value = "Extrayendo texto del PDF...";
  showSuccessState.value = false;

  const interval = setInterval(() => {
    uploadProgress.value += 10;
    if (uploadProgress.value <= 25) {
      uploadStep.value = "Extrayendo texto del PDF...";
    } else if (uploadProgress.value <= 50) {
      uploadStep.value = "Analizando estructura semántica...";
    } else if (uploadProgress.value <= 75) {
      uploadStep.value = "Detectando historial laboral...";
    } else if (uploadProgress.value < 100) {
      uploadStep.value = "Mapeando competencias y habilidades...";
    } else {
      clearInterval(interval);
      uploading.value = false;
      showSuccessState.value = true;
      uploadStep.value = "¡Extracción de IA completada!";
    }
  }, 250);
}

function confirmAndRedirect() {
  localStorage.setItem("parsed_cv_ia", JSON.stringify(mockExtractedData));
  showUploadModal.value = false;
  abrirEditor();
}

function abrirEditor() {
  router.push(portal.rutaEditor.value);
}

const metrics = computed(() => [
  {
    label: "Experiencia detectada",
    value: `${portal.workExperiences.value.length}`,
    detail: "registros laborales",
    icon: BriefcaseBusiness,
    cardClass: "border-border bg-card",
    iconClass: "bg-muted text-primary",
  },
  {
    label: "Certificados",
    value: `${portal.completedCourses.value.length}`,
    detail: "cursos completados",
    icon: GraduationCap,
    cardClass: "border-border bg-card",
    iconClass: "bg-muted text-primary",
  },
  {
    label: "Compatibilidad laboral",
    value: `${portal.forYouJobs.value[0]?.match ?? 91}%`,
    detail: "match laboral detectado",
    icon: BadgeCheck,
    cardClass: "border-primary/20 bg-primary/10",
    iconClass: "bg-primary text-primary-foreground",
  },
  {
    label: "Perfil completado",
    value: `${portal.user.value?.profileProgress ?? 0}%`,
    detail: "faltan 2 datos",
    icon: FileText,
    cardClass: "border-accent/30 bg-accent/10",
    iconClass: "bg-accent text-accent-foreground",
  },
]);

const dataSources = [
  {
    name: "Tukuy Obra",
    state: "Datos verificados",
    detail: "Última sincronización: 12/07/2026",
    badge: "Verificado",
    className:
      "border-border bg-primary/10 text-primary",
  },
  {
    name: "SIADEG",
    state: "Experiencia importada",
    detail: "3 cargos detectados en obras conectadas",
    badge: "Importado",
    className:
      "border-teal-100 bg-teal-50 text-teal-900 dark:border-teal-900/50 dark:bg-teal-950/40 dark:text-teal-200",
  },
  {
    name: "Manual",
    state: "Información agregada por el usuario",
    detail: "Pendiente de validación laboral",
    badge: "Pendiente",
    className:
      "border-amber-100 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200",
  },
];

const technicalSkills = [
  "Kardex",
  "Control de materiales",
  "Valorizaciones",
  "Requerimientos",
  "Logística de obra",
];
const tools = ["Tukuy Obra", "Excel operativo", "SIADEG", "Reportes de obra"];
const softSkills = [
  "Responsabilidad",
  "Organización",
  "Seguimiento documentario",
];

const jobMatches = computed(() =>
  portal.forYouJobs.value.slice(0, 3).map((job) => ({
    title: job.title,
    match: job.match,
    company: job.company,
  })),
);

const recommendedCourses = computed(() =>
  portal.courses.value
    .filter((course) =>
      [
        "Almacen y logistica",
        "Tukuy Obra",
        "Gestión de obras",
        "Control de obra",
      ].includes(course.category),
    )
    .slice(0, 3)
    .map((course, index) => ({
      title: course.title,
      impact: [10, 8, 6][index] ?? 5,
      pricing: course.pricing,
    })),
);
</script>

<template>
  <PortalPageSkeleton v-if="portal.cargando.value" />

  <PortalSection v-else-if="portal.user.value" wide :centered="false">
    <section class="grid gap-7">
      <div
        class="relative overflow-hidden rounded-xl border border-border bg-muted shadow-sm"
      >
        <div
          class="absolute inset-y-0 right-0 hidden w-[35%] bg-[#071F52] lg:block"
        />
        <div
          class="absolute right-[28%] top-0 hidden h-full w-24 -skew-x-6 bg-muted lg:block"
        />

        <div
          class="relative grid min-h-[520px] gap-8 px-6 py-10 lg:grid-cols-[minmax(0,0.96fr)_minmax(420px,1fr)] lg:px-16 lg:py-14"
        >
          <div class="grid content-center gap-7">
            <div class="flex flex-wrap items-center gap-3">
              <div class="flex -space-x-2">
                <span
                  class="grid h-8 w-8 place-items-center rounded-full border-2 border-card bg-primary text-[11px] font-black text-white"
                  >TA</span
                >
                <span
                  class="grid h-8 w-8 place-items-center rounded-full border-2 border-card bg-accent text-[11px] font-black text-foreground"
                  >CV</span
                >
                  <span
                  class="grid h-8 w-8 place-items-center rounded-full border-2 border-card bg-muted text-[11px] font-black text-muted-foreground"
                  >IA</span
                >
              </div>
              <p class="text-sm font-bold text-primary">
                + perfiles de obra listos para mejores oportunidades
              </p>
            </div>

            <div>
              <h1
                class="mt-5 max-w-3xl text-4xl font-black leading-tight tracking-normal text-foreground sm:text-5xl"
              >
                Crea un CV profesional con tu experiencia real de obra
              </h1>
              <p class="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">
                Importa datos de Tukuy Obra y SIADEG, valida tu historial
                laboral y genera un CV orientado a empleabilidad, cursos y
                oportunidades compatibles.
              </p>
            </div>

            <div class="flex flex-wrap gap-3">
              <Button
                class="h-14 rounded-md bg-primary px-8 text-base font-bold text-primary-foreground shadow-sm hover:bg-primary/90"
                type="button"
                @click="abrirEditor"
              >
                Crear mi CV
              </Button>
              <input
                type="file"
                ref="fileInput"
                accept=".pdf"
                class="hidden"
                @change="handleFileChange"
              />
              <Button
                class="h-14 rounded-md border-border bg-card px-8 text-base font-bold text-primary hover:bg-muted"
                variant="outline"
                type="button"
                @click="fileInput?.click()"
              >
                <Upload class="h-4 w-4" />
                Importar mi CV (PDF)
              </Button>
            </div>
          </div>

          <div class="relative min-h-[440px] lg:min-h-[500px]">
            <div
              class="absolute left-[12%] top-[12%] h-[70%] w-[50%] rotate-[-1deg] overflow-hidden rounded-lg border border-border bg-card shadow-2xl"
            >
              <img
                src="/img/vistasimg/vistaPortadaCv.png"
                alt="Profesional preparando su CV"
                class="h-full w-full object-cover"
              />
            </div>

            <div
              class="absolute right-[8%] top-[20%] h-[68%] w-[54%] rotate-[2deg] overflow-hidden rounded-md border border-border bg-card shadow-2xl"
            >
              <img
                src="/img/vistasimg/imgCV.png"
                alt="Vista previa de CV inteligente"
                class="h-full w-full object-cover object-top"
              />
            </div>
          </div>
        </div>
      </div>

      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card
          v-for="metric in metrics"
          :key="metric.label"
          class="shadow-sm"
          :class="metric.cardClass"
        >
          <CardContent
            class="flex items-center gap-4 p-4 transition duration-300 hover:-translate-y-0.5 hover:shadow-md"
          >
            <div
              class="grid h-12 w-12 shrink-0 place-items-center rounded-md"
              :class="metric.iconClass"
            >
              <component :is="metric.icon" class="h-5 w-5" />
            </div>
            <div class="min-w-0">
              <p class="text-xs font-semibold uppercase text-muted-foreground">
                {{ metric.label }}
              </p>
              <strong class="mt-1 block text-2xl font-black text-foreground">{{
                metric.value
              }}</strong>
              <span class="text-xs text-muted-foreground">{{
                metric.detail
              }}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div class="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
        <aside class="grid content-start gap-5">
          <Card class="border-border shadow-sm">
            <CardContent class="grid gap-5 p-5">
              <div>
                <p class="text-xs font-bold uppercase text-secondary">
                  Perfil detectado
                </p>
                <h2 class="mt-1 text-xl font-black">Perfil inteligente</h2>
              </div>

              <div class="grid gap-3 text-sm">
                <div class="rounded-md border border-border bg-muted p-3">
                  <span class="text-muted-foreground"
                    >Especialidad principal</span
                  >
                  <strong class="mt-1 block text-foreground">{{
                    portal.user.value.specialty
                  }}</strong>
                </div>
                <div class="rounded-md border border-border p-3">
                  <span class="text-muted-foreground">Nivel estimado</span>
                  <strong class="mt-1 block text-foreground"
                    >Operativo / Asistente</strong
                  >
                </div>
                <div class="rounded-md border border-border p-3">
                  <span class="text-muted-foreground"
                    >Experiencia validada</span
                  >
                  <strong class="mt-1 block text-foreground"
                    >2 años 4 meses</strong
                  >
                </div>
                <div class="rounded-md border border-border p-3">
                  <span class="text-muted-foreground">Fuentes conectadas</span>
                  <strong class="mt-1 block text-foreground"
                    >Tukuy Obra · SIADEG · Manual</strong
                  >
                </div>
              </div>
            </CardContent>
          </Card>

          <Card class="border-border shadow-sm">
            <CardContent class="grid gap-4 p-5">
              <div class="flex items-center gap-2">
                <Database class="h-4 w-4 text-primary" />
                <h3 class="font-bold">Fuentes de datos</h3>
              </div>

              <div class="grid gap-3">
                <div
                  v-for="source in dataSources"
                  :key="source.name"
                  class="rounded-md border border-border p-3 transition hover:border-border hover:bg-muted/30"
                >
                  <div class="flex items-start justify-between gap-2">
                    <strong class="text-sm">{{ source.name }}</strong>
                    <Badge
                      class="rounded-md border px-2 py-0.5 text-[11px]"
                      :class="source.className"
                      variant="outline"
                    >
                      {{ source.badge }}
                    </Badge>
                  </div>
                  <p class="mt-2 text-sm text-muted-foreground">{{ source.state }}</p>
                  <p class="mt-1 text-xs text-muted-foreground">
                    {{ source.detail }}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </aside>

        <div class="grid gap-6">
          <section
            class="overflow-hidden rounded-lg border border-border bg-card shadow-sm"
          >
            <div
              class="border-b border-border bg-muted px-5 py-4 lg:px-7"
            >
              <div
                class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div class="flex items-center gap-4">
                  <img
                    class="h-20 w-20 shrink-0 rounded-md border border-border bg-card object-cover shadow-sm ring-1 ring-border"
                    src="/img/vistasimg/perfilfoto.png"
                    :alt="portal.user.value.name"
                  />
                  <div>
                    <p
                      class="text-xs font-semibold uppercase text-muted-foreground"
                    >
                      CV generado
                    </p>
                    <h2 class="mt-1 text-2xl font-black text-foreground">
                      {{ portal.user.value.name }}
                    </h2>
                    <p class="mt-1 text-sm text-muted-foreground">
                      {{ portal.user.value.trade }} ·
                      {{ portal.user.value.location }}
                    </p>
                  </div>
                </div>

                <Badge
                  class="w-fit border-border bg-primary/10 text-primary"
                  variant="outline"
                >
                  Perfil recomendado: {{ portal.user.value.specialty }}
                </Badge>
              </div>
            </div>

            <div class="grid gap-7 p-5 lg:p-7">
              <div class="rounded-lg border border-border bg-primary/5 p-5">
                <div
                  class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div>
                    <h3 class="font-bold text-foreground">
                      Resumen profesional generado
                    </h3>
                    <p class="mt-3 text-sm leading-7 text-muted-foreground">
                      Profesional con experiencia en almacén y logística
                      aplicada a proyectos de obra, control de materiales,
                      seguimiento de requerimientos y uso de módulos operativos
                      en Tukuy Obra. Cuenta con experiencia registrada en
                      proyectos de Lima y Cusco, además de formación
                      complementaria en gestión de obras.
                    </p>
                  </div>
                  <div class="flex shrink-0 flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      type="button"
                      @click="abrirEditor"
                    >
                      <Pencil class="h-4 w-4" />
                      Editar
                    </Button>
                    <Button size="sm" type="button">
                      <Sparkles class="h-4 w-4" />
                      IA
                    </Button>
                  </div>
                </div>
              </div>

              <div class="grid gap-4">
                <div class="flex items-center justify-between gap-3">
                  <h3 class="font-bold text-foreground">
                    Experiencia usada para este CV
                  </h3>
                  <Button
                    size="sm"
                    variant="ghost"
                    type="button"
                    @click="portal.navigate('profile')"
                  >
                    Validar datos
                    <ArrowRight class="h-4 w-4" />
                  </Button>
                </div>

                <div class="grid gap-4">
                  <div
                    v-for="experience in portal.workExperiences.value"
                    :key="experience.id"
                    class="relative rounded-lg border border-border bg-card p-4 pl-6 shadow-sm"
                  >
                    <span
                      class="absolute left-0 top-5 h-8 w-1 rounded-r-full bg-primary"
                    />
                    <div
                      class="flex flex-wrap items-start justify-between gap-3"
                    >
                      <div>
                        <span
                          class="text-xs font-semibold uppercase text-muted-foreground"
                          >{{ experience.period }}</span
                        >
                        <strong class="mt-1 block text-base text-foreground">{{
                          experience.role
                        }}</strong>
                        <p class="mt-1 text-sm text-muted-foreground">
                          {{ experience.project }} · {{ experience.location }}
                        </p>
                      </div>
                      <Badge
                        :variant="
                          experience.status === 'Verificado'
                            ? 'success'
                            : experience.status === 'Declarado'
                              ? 'warning'
                              : 'default'
                        "
                      >
                        {{ experience.source }} · {{ experience.status }}
                      </Badge>
                    </div>
                    <p class="mt-3 text-sm leading-6 text-muted-foreground">
                      {{ experience.summary }}
                    </p>
                  </div>
                </div>
              </div>

              <div class="grid gap-4">
                <h3 class="font-bold text-foreground">
                  Competencias detectadas
                </h3>
                <div class="grid gap-3 md:grid-cols-3">
                  <div
                    class="rounded-lg border border-border bg-muted p-4"
                  >
                    <p
                      class="text-xs font-bold uppercase text-muted-foreground"
                    >
                      Técnicas
                    </p>
                    <div class="mt-3 flex flex-wrap gap-2">
                      <Badge
                        v-for="skill in technicalSkills"
                        :key="skill"
                        class="bg-card"
                        variant="outline"
                        >{{ skill }}</Badge
                      >
                    </div>
                  </div>
                  <div
                    class="rounded-lg border border-border bg-muted p-4"
                  >
                    <p
                      class="text-xs font-bold uppercase text-muted-foreground"
                    >
                      Herramientas
                    </p>
                    <div class="mt-3 flex flex-wrap gap-2">
                      <Badge
                        v-for="tool in tools"
                        :key="tool"
                        class="bg-card"
                        variant="outline"
                        >{{ tool }}</Badge
                      >
                    </div>
                  </div>
                  <div
                    class="rounded-lg border border-border bg-muted p-4"
                  >
                    <p
                      class="text-xs font-bold uppercase text-muted-foreground"
                    >
                      Blandas
                    </p>
                    <div class="mt-3 flex flex-wrap gap-2">
                      <Badge
                        v-for="skill in softSkills"
                        :key="skill"
                        class="bg-card"
                        variant="outline"
                        >{{ skill }}</Badge
                      >
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section class="grid gap-5 lg:grid-cols-2">
            <Card class="border-border shadow-sm">
              <CardContent class="grid gap-5 p-5">
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <p class="text-xs font-bold uppercase text-secondary">
                      Oportunidades
                    </p>
                    <h3 class="mt-1 text-lg font-black">
                      Compatibilidad laboral
                    </h3>
                  </div>
                  <ShieldCheck class="h-5 w-5 text-primary" />
                </div>

                <div class="grid gap-4">
                  <div
                    v-for="job in jobMatches"
                    :key="job.title"
                    class="grid gap-2"
                  >
                    <div class="flex items-start justify-between gap-3">
                      <div>
                        <strong class="block text-sm">{{ job.title }}</strong>
                        <span class="text-xs text-muted-foreground">{{
                          job.company
                        }}</span>
                      </div>
                      <span class="text-sm font-black text-primary"
                        >{{ job.match }}%</span
                      >
                    </div>
                    <Progress :model-value="job.match" class="h-2" />
                  </div>
                </div>

                <Button
                  class="w-full"
                  variant="outline"
                  type="button"
                  @click="portal.navigate('jobs')"
                >
                  Ver oportunidades
                </Button>
              </CardContent>
            </Card>

            <Card class="border-border shadow-sm">
              <CardContent class="grid gap-5 p-5">
                <div>
                  <p class="text-xs font-bold uppercase text-secondary">
                    Cursos recomendados
                  </p>
                  <h3 class="mt-1 text-lg font-black">Mejora tu perfil</h3>
                </div>

                <div class="grid gap-3">
                  <div
                    v-for="course in recommendedCourses"
                    :key="course.title"
                    class="rounded-md border border-border p-3 transition hover:border-border hover:bg-muted/30"
                  >
                    <strong class="line-clamp-2 text-sm">{{
                      course.title
                    }}</strong>
                    <p class="mt-2 text-xs text-muted-foreground">
                      Aumenta compatibilidad +{{ course.impact }}%
                    </p>
                  </div>
                </div>

                <Button
                  class="w-full"
                  type="button"
                  @click="portal.navigate('courses')"
                >
                  Inscribirme
                </Button>
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </section>
    <!-- AI CV Extractor Modal -->
    <Transition name="fade">
      <div
        v-if="showUploadModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      >
        <div
          class="relative w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-2xl transition-all duration-300"
        >
          <button
            type="button"
            class="absolute right-4 top-4 text-muted-foreground hover:text-muted-foreground"
            @click="showUploadModal = false"
            :disabled="uploading"
          >
            <svg
              class="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          <div class="flex flex-col items-center text-center">
            <div
              class="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary"
            >
              <Sparkles class="h-7 w-7 animate-pulse" />
            </div>

            <h3 class="text-xl font-black text-foreground">
              Extracción Inteligente de CV
            </h3>
            <p class="mt-2 text-sm text-muted-foreground">
              Analizando tu archivo
              <strong class="text-foreground">{{ uploadedFileName }}</strong>
            </p>

            <!-- Loading State -->
            <div v-if="uploading" class="mt-6 w-full">
              <div
                class="relative h-4 w-full overflow-hidden rounded-full bg-muted"
              >
                <div
                  class="h-full bg-linear-to-r from-blue-500 to-primary transition-all duration-300"
                  :style="{ width: `${uploadProgress}%` }"
                ></div>
              </div>
              <p
                class="mt-3 text-xs font-bold uppercase tracking-wider text-primary animate-pulse"
              >
                {{ uploadStep }}
              </p>
              <p class="mt-1 text-xs text-muted-foreground">
                {{ uploadProgress }}% procesado
              </p>
            </div>

            <!-- Success State -->
            <div v-else-if="showSuccessState" class="mt-6 w-full">
              <div
                class="rounded-lg border border-emerald-100 bg-emerald-50/50 p-4 text-left dark:border-emerald-900/50 dark:bg-emerald-950/30"
              >
                <h4
                  class="text-sm font-bold text-emerald-900 flex items-center gap-1.5 dark:text-emerald-200"
                >
                  <BadgeCheck class="h-5 w-5 text-emerald-600" />
                  ¡Extracción por IA completada con éxito!
                </h4>

                <div class="mt-4 space-y-2 text-xs text-muted-foreground">
                  <p>
                    <strong>👤 Nombre:</strong> {{ mockExtractedData.name }}
                  </p>
                  <p>
                    <strong>💼 Oficio detectado:</strong>
                    {{ mockExtractedData.trade }}
                  </p>
                  <p>
                    <strong>🎯 Experiencia laboral:</strong>
                    {{ mockExtractedData.experiences.length }} nuevos proyectos
                    encontrados en el PDF.
                  </p>
                  <p>
                    <strong>🛠️ Habilidades detectadas:</strong>
                    {{ mockExtractedData.skills.join(", ") }}
                  </p>
                </div>
              </div>

              <div class="mt-6 flex flex-col gap-2">
                <Button
                  class="w-full bg-primary hover:bg-primary/90 text-white"
                  @click="confirmAndRedirect"
                >
                  Confirmar e Ir al Editor para Fusionar
                </Button>
                <Button
                  variant="outline"
                  class="w-full"
                  @click="showUploadModal = false"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </PortalSection>
</template>
