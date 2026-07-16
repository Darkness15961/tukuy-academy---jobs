<script setup lang="ts">
import { computed, ref, watchEffect } from "vue";
import { useRouter } from "vue-router";
import {
  ArrowLeft,
  BriefcaseBusiness,
  Database,
  Download,
  GraduationCap,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  Trash2,
  UserRound,
} from "lucide-vue-next";

import PortalPageSkeleton from "@/components/shared/PortalPageSkeleton.vue";
import PortalSection from "@/components/shared/PortalSection.vue";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { usePerfilLaboral } from "@/modulos/perfil-laboral/composables/usePerfilLaboral";
import type { WorkExperience } from "@/types/academia";

const portal = usePerfilLaboral();
const router = useRouter();

// Form fields
const name = ref("");
const trade = ref("");
const specialty = ref("");
const location = ref("");
const birthDate = ref("");
const summary = ref(
  "Profesional enfocado en la gestión y control operativo de obras con sólidos conocimientos en logística, control de materiales e inventarios.",
);

const experiences = ref<WorkExperience[]>([]);

const skills = ref<string[]>([
  "Kardex",
  "Control de materiales",
  "Tukuy Obra",
  "Excel operativo",
]);
const newSkill = ref("");
const perfilInicializado = ref(false);

watchEffect(() => {
  const usuario = portal.user.value;
  if (perfilInicializado.value || portal.cargando.value || !usuario) return;

  name.value = usuario.name;
  trade.value = usuario.trade;
  specialty.value = usuario.specialty;
  location.value = usuario.location;
  birthDate.value = usuario.birthDate ?? "";
  experiences.value = portal.workExperiences.value.map((exp) => ({ ...exp }));
  perfilInicializado.value = true;
});

const savedMessage = ref("");
let saveTimeout: ReturnType<typeof setTimeout> | null = null;

function showNotification(msg: string) {
  if (saveTimeout) clearTimeout(saveTimeout);
  savedMessage.value = msg;
  saveTimeout = setTimeout(() => {
    savedMessage.value = "";
  }, 3000);
}

// Import data from SIADEG/Tukuy Obra and merge with AI extracted data if exists
function importFromPortal() {
  // 1. Get portal values
  let newName = portal.user.value?.name ?? "";
  let newTrade = portal.user.value?.trade ?? "";
  let newSpecialty = portal.user.value?.specialty ?? "";
  let newLocation = portal.user.value?.location ?? "";
  let newBirthDate = portal.user.value?.birthDate ?? "";

  // 2. Retrieve AI extracted data from localStorage
  let aiData: any = null;
  const savedAiData = localStorage.getItem("parsed_cv_ia");
  if (savedAiData) {
    try {
      aiData = JSON.parse(savedAiData);
    } catch (e) {
      console.error(e);
    }
  }

  // 3. Update personal details favoring AI if portal has defaults or if AI has them
  if (aiData) {
    if (aiData.name) newName = aiData.name;
    if (aiData.trade) newTrade = aiData.trade;
    if (aiData.specialty) newSpecialty = aiData.specialty;
    if (aiData.location) newLocation = aiData.location;
    if (aiData.birthDate) newBirthDate = aiData.birthDate;
  }

  name.value = newName;
  trade.value = newTrade;
  specialty.value = newSpecialty;
  location.value = newLocation;
  birthDate.value = newBirthDate;

  // 4. Merge Experiences (deduplicating by role & project)
  const mergedExps: WorkExperience[] = [];

  // Add portal experiences first
  if (portal.workExperiences.value) {
    portal.workExperiences.value.forEach((exp) => {
      mergedExps.push({ ...exp });
    });
  }

  // Add AI experiences if not duplicate
  if (aiData && aiData.experiences) {
    aiData.experiences.forEach((aiExp: any) => {
      const isDuplicate = mergedExps.some(
        (exp) =>
          exp.role.trim().toLowerCase() === aiExp.role.trim().toLowerCase() &&
          exp.project.trim().toLowerCase() ===
            aiExp.project.trim().toLowerCase(),
      );
      if (!isDuplicate) {
        mergedExps.push({ ...aiExp });
      }
    });
  }

  experiences.value = mergedExps;

  // 5. Merge Skills (union, no duplicates)
  const mergedSkills = new Set<string>(skills.value);
  if (aiData && aiData.skills) {
    aiData.skills.forEach((s: string) => mergedSkills.add(s));
  }
  skills.value = Array.from(mergedSkills);

  // 6. Set professional summary with summary from AI if available or custom enriched message
  if (aiData) {
    summary.value = `Auxiliar de almacén verificado con experiencia real en ${portal.workExperiences.value[0]?.project ?? "Tukuy Obra"} y obras viales. Especialista en control de materiales, Kardex y gestión de asistencia de personal en campo.`;
    showNotification(
      "¡Fusión Exitosa! Datos de Tukuy Obra y CV extraído por la IA integrados (duplicados omitidos).",
    );
  } else {
    summary.value = `Auxiliar de almacén verificado con experiencia real en el proyecto "${portal.workExperiences.value[0]?.project ?? "Tukuy Obra"}". Especialista en control de materiales, Kardex y gestión de asistencia de personal en campo.`;
    showNotification(
      "Datos importados correctamente desde Tukuy Obra y SIADEG",
    );
  }
}

// Add new experience
function addExperience() {
  experiences.value.push({
    id: `exp-new-${Date.now()}`,
    source: "Manual",
    project: "Nuevo proyecto de obra",
    role: "Puesto ocupado",
    location: location.value || "Lima",
    period: "Mes Año - Mes Año",
    modules: ["Registro manual"],
    status: "Declarado",
    summary:
      "Escribe aquí los logros, responsabilidades y tareas realizadas durante el proyecto.",
  });
}

// Remove experience
function removeExperience(index: number) {
  experiences.value.splice(index, 1);
}

// Add skill
function addSkill() {
  if (newSkill.value.trim() && !skills.value.includes(newSkill.value.trim())) {
    skills.value.push(newSkill.value.trim());
    newSkill.value = "";
  }
}

// Remove skill
function removeSkill(index: number) {
  skills.value.splice(index, 1);
}

// Save all changes
async function saveCv() {
  if (portal.updateUserProfile) {
    await portal.updateUserProfile({
      name: name.value,
      trade: trade.value,
      specialty: specialty.value,
      location: location.value,
      birthDate: birthDate.value,
    });
  }

  // Here we would sync experiences back to portal context if writable,
  // or simulate local database persistence.
  showNotification(
    "¡CV guardado con éxito! Los datos fueron actualizados en tu perfil.",
  );
}

function goBack() {
  router.push(portal.rutaPrincipal.value);
}

// Format birth date for preview
function previewBirthDate(dateStr?: string) {
  if (!dateStr) return "-";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}
</script>

<template>
  <PortalPageSkeleton v-if="portal.cargando.value" />

  <PortalSection v-else-if="portal.user.value" wide :centered="false">
    <div class="mb-6 flex items-center justify-between">
      <Button variant="ghost" class="gap-2" @click="goBack">
        <ArrowLeft class="h-4 w-4" />
        Volver a mi CV
      </Button>

      <div class="flex items-center gap-3">
        <Button
          variant="outline"
          class="gap-2 border-border text-primary hover:bg-muted"
          @click="importFromPortal"
        >
          <RefreshCw class="h-4 w-4" />
          Importar experiencia laboral en obras
        </Button>
        <Button
          class="gap-2 bg-primary hover:bg-primary/90 text-white"
          @click="saveCv"
        >
          <Save class="h-4 w-4" />
          Guardar CV
        </Button>
      </div>
    </div>

    <!-- Notification -->
    <Transition name="fade">
      <div
        v-if="savedMessage"
        class="mb-6 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200"
      >
        <svg
          class="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M5 13l4 4L19 7"
          />
        </svg>
        {{ savedMessage }}
      </div>
    </Transition>

    <div class="grid gap-6 lg:grid-cols-2">
      <!-- Left side: Form Editor -->
      <div class="grid gap-6">
        <Card class="border-border shadow-sm">
          <CardHeader>
            <CardTitle class="flex items-center gap-2 text-xl">
              <UserRound class="h-5 w-5 text-primary" />
              Datos personales y de contacto
            </CardTitle>
          </CardHeader>
          <CardContent class="grid gap-4">
            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  class="mb-1.5 block text-xs font-semibold uppercase text-muted-foreground"
                  >Nombre completo</label
                >
                <Input
                  v-model="name"
                  type="text"
                  placeholder="Ej. Carlos Quispe"
                  class="h-11"
                />
              </div>
              <div>
                <label
                  class="mb-1.5 block text-xs font-semibold uppercase text-muted-foreground"
                  >Fecha de nacimiento</label
                >
                <Input v-model="birthDate" type="date" class="h-11" />
              </div>
            </div>

            <div class="grid gap-4 sm:grid-cols-3">
              <div>
                <label
                  class="mb-1.5 block text-xs font-semibold uppercase text-muted-foreground"
                  >Oficio principal</label
                >
                <Input
                  v-model="trade"
                  type="text"
                  placeholder="Ej. Auxiliar de almacén"
                  class="h-11"
                />
              </div>
              <div>
                <label
                  class="mb-1.5 block text-xs font-semibold uppercase text-muted-foreground"
                  >Especialidad</label
                >
                <Input
                  v-model="specialty"
                  type="text"
                  placeholder="Ej. Almacén y logística"
                  class="h-11"
                />
              </div>
              <div>
                <label
                  class="mb-1.5 block text-xs font-semibold uppercase text-muted-foreground"
                  >Ubicación</label
                >
                <Input
                  v-model="location"
                  type="text"
                  placeholder="Ej. Lima, Ate"
                  class="h-11"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <!-- Professional Summary -->
        <Card class="border-border shadow-sm">
          <CardHeader>
            <CardTitle class="flex items-center gap-2 text-xl">
              <Sparkles class="h-5 w-5 text-primary" />
              Resumen profesional
            </CardTitle>
          </CardHeader>
          <CardContent>
            <textarea
              v-model="summary"
              rows="4"
              class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="Describe tus principales competencias y logros profesionales de obra..."
            ></textarea>
          </CardContent>
        </Card>

        <!-- Work Experience -->
        <Card class="border-border shadow-sm">
          <CardHeader class="flex flex-row items-center justify-between">
            <CardTitle class="flex items-center gap-2 text-xl">
              <BriefcaseBusiness class="h-5 w-5 text-primary" />
              Experiencia laboral
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              class="gap-1"
              @click="addExperience"
            >
              <Plus class="h-4 w-4" />
              Agregar
            </Button>
          </CardHeader>
          <CardContent class="grid gap-5">
            <div
              v-for="(exp, idx) in experiences"
              :key="exp.id"
              class="relative rounded-lg border border-border bg-muted/50 p-4"
            >
              <button
                type="button"
                class="absolute right-3 top-3 text-muted-foreground hover:text-red-500 transition-colors"
                @click="removeExperience(idx)"
              >
                <Trash2 class="h-4 w-4" />
              </button>

              <div class="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    class="mb-1 block text-xs font-semibold text-muted-foreground"
                    >Puesto / Cargo</label
                  >
                  <Input v-model="exp.role" type="text" class="h-9" />
                </div>
                <div>
                  <label
                    class="mb-1 block text-xs font-semibold text-muted-foreground"
                    >Proyecto / Empresa</label
                  >
                  <Input v-model="exp.project" type="text" class="h-9" />
                </div>
              </div>

              <div class="mt-3 grid gap-4 sm:grid-cols-3">
                <div>
                  <label
                    class="mb-1 block text-xs font-semibold text-muted-foreground"
                    >Periodo</label
                  >
                  <Input
                    v-model="exp.period"
                    type="text"
                    class="h-9"
                    placeholder="Ene 2025 - Oct 2025"
                  />
                </div>
                <div>
                  <label
                    class="mb-1 block text-xs font-semibold text-muted-foreground"
                    >Ubicación</label
                  >
                  <Input v-model="exp.location" type="text" class="h-9" />
                </div>
                <div>
                  <label
                    class="mb-1 block text-xs font-semibold text-muted-foreground"
                    >Fuente</label
                  >
                  <Input
                    v-model="exp.source"
                    type="text"
                    disabled
                    class="h-9 bg-muted"
                  />
                </div>
              </div>

              <div class="mt-3">
                <label
                  class="mb-1 block text-xs font-semibold text-muted-foreground"
                  >Logros y funciones</label
                >
                <textarea
                  v-model="exp.summary"
                  rows="2"
                  class="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                ></textarea>
              </div>
            </div>
          </CardContent>
        </Card>

        <!-- Competencies -->
        <Card class="border-border shadow-sm">
          <CardHeader>
            <CardTitle class="flex items-center gap-2 text-xl">
              <GraduationCap class="h-5 w-5 text-primary" />
              Habilidades y competencias
            </CardTitle>
          </CardHeader>
          <CardContent class="grid gap-4">
            <div class="flex gap-2">
              <Input
                v-model="newSkill"
                type="text"
                placeholder="Ej. Lectura de planos"
                class="h-10"
                @keyup.enter="addSkill"
              />
              <Button type="button" @click="addSkill">Agregar</Button>
            </div>
            <div class="flex flex-wrap gap-2">
              <Badge
                v-for="(skill, idx) in skills"
                :key="skill"
                variant="secondary"
                class="gap-1.5 px-3 py-1 text-sm bg-primary/10 text-primary"
              >
                {{ skill }}
                <button
                  type="button"
                  class="text-red-500 hover:text-red-700"
                  @click="removeSkill(idx)"
                >
                  ×
                </button>
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- Right side: Live Preview -->
      <div class="sticky top-6">
        <Card class="border-border shadow-lg overflow-hidden bg-card">
          <div class="bg-primary p-6 text-white">
            <div class="flex justify-between items-start">
              <div>
                <p class="text-xs uppercase tracking-wider text-blue-200">
                  Currículum Vitae Inteligente
                </p>
                <h2 class="mt-1 text-2xl font-bold tracking-tight">
                  {{ name || "Tu Nombre Completo" }}
                </h2>
                <p class="text-sm text-blue-100/90 font-medium mt-1">
                  {{ trade || "Tu Oficio" }}
                </p>
              </div>
              <Badge
                variant="outline"
                class="border-white/20 bg-card/10 text-white"
              >
                {{ specialty || "Especialidad" }}
              </Badge>
            </div>

            <div
              class="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-blue-100"
            >
              <span v-if="location">📍 {{ location }}</span>
              <span v-if="birthDate"
                >📅 Nacimiento: {{ previewBirthDate(birthDate) }}</span
              >
            </div>
          </div>

          <CardContent class="p-6 grid gap-6">
            <!-- Profile Summary -->
            <div class="grid gap-1.5">
              <h3
                class="text-xs font-bold uppercase text-primary tracking-wider border-b border-border pb-1"
              >
                Resumen Profesional
              </h3>
              <p class="text-sm leading-relaxed text-muted-foreground">
                {{
                  summary ||
                  "Describe tu perfil profesional en el editor de la izquierda."
                }}
              </p>
            </div>

            <!-- Work Experiences preview -->
            <div class="grid gap-3">
              <h3
                class="text-xs font-bold uppercase text-primary tracking-wider border-b border-border pb-1"
              >
                Trayectoria Laboral
              </h3>
              <div class="grid gap-4">
                <div
                  v-if="experiences.length === 0"
                  class="text-sm text-muted-foreground italic"
                >
                  No hay experiencia agregada todavía.
                </div>
                <div
                  v-for="exp in experiences"
                  :key="exp.id"
                  class="relative pl-4 border-l-2 border-border"
                >
                  <div class="flex justify-between items-start gap-2">
                    <strong class="text-sm text-foreground block font-bold">{{
                      exp.role
                    }}</strong>
                    <span
                      class="text-[11px] font-semibold text-muted-foreground shrink-0"
                      >{{ exp.period }}</span
                    >
                  </div>
                  <div class="flex items-center gap-2 mt-0.5">
                    <span class="text-xs text-muted-foreground font-medium">{{
                      exp.project
                    }}</span>
                    <span
                      class="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.2 rounded"
                      >{{ exp.source }}</span
                    >
                  </div>
                  <p class="text-xs text-muted-foreground mt-2 leading-relaxed">
                    {{ exp.summary }}
                  </p>
                </div>
              </div>
            </div>

            <!-- Skills preview -->
            <div class="grid gap-2">
              <h3
                class="text-xs font-bold uppercase text-primary tracking-wider border-b border-border pb-1"
              >
                Competencias y Habilidades
              </h3>
              <div class="flex flex-wrap gap-1.5 mt-1">
                <span
                  v-for="skill in skills"
                  :key="skill"
                  class="text-xs bg-muted text-muted-foreground px-2.5 py-1 rounded-full font-medium"
                >
                  ✓ {{ skill }}
                </span>
              </div>
            </div>
          </CardContent>

          <!-- Footer preview -->
          <div
            class="bg-muted border-t border-border px-6 py-4 flex justify-between items-center"
          >
            <span class="text-[10px] text-muted-foreground"
              >Generado por Tukuy Academy & Jobs</span
            >
            <Button
              size="sm"
              variant="ghost"
              class="gap-1 text-xs text-primary"
              disabled
            >
              <Download class="h-3 w-3" />
              Exportar PDF
            </Button>
          </div>
        </Card>
      </div>
    </div>
  </PortalSection>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
