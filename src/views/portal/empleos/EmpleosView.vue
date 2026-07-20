<script setup lang="ts">
import { ref, onMounted } from "vue";
import {
  Search,
  Sparkles,
  X,
  Briefcase,
  MapPin,
  CalendarDays,
  CheckCircle2,
  FileText,
  Award,
  Loader2,
} from "lucide-vue-next";

import TarjetaEmpleo from "@/components/shared/TarjetaEmpleo.vue";
import EsqueletoTarjetaEmpleo from "@/components/shared/EsqueletoTarjetaEmpleo.vue";
import PortalSection from "@/components/shared/PortalSection.vue";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { usePortalContext } from "../composables/usePortalContext";
import type { Job } from "@/types/academia";
import { formatDeadline } from "@/types/empleo.types";

const portal = usePortalContext();

// User skills for match matrix simulation
const userSkills = [
  "kardex",
  "almacen",
  "control de materiales",
  "excel",
  "logística",
  "materiales",
  "reportes",
  "valorizaciones",
  "requerimientos",
  "obra",
];

// Applied jobs tracking
const appliedJobIds = ref<string[]>([]);

onMounted(() => {
  const saved = localStorage.getItem("tukuy_applied_jobs");
  if (saved) {
    appliedJobIds.value = JSON.parse(saved);
  }
});

// Modal states
const selectedJob = ref<Job | null>(null);
const applicationStep = ref<"details" | "submitting" | "success">("details");
const coverLetter = ref("");
const submittingStep = ref(0);

function openApplyModal(job: Job) {
  selectedJob.value = job;
  applicationStep.value = "details";
  coverLetter.value = "";
}

function handleConfirmApply() {
  if (!selectedJob.value) return;
  applicationStep.value = "submitting";
  submittingStep.value = 0;

  // Step 1: Analizando compatibilidad de perfil (0.8s)
  const t1 = setTimeout(() => {
    submittingStep.value = 1;
  }, 800);

  // Step 2: Adjuntando CV inteligente y Certificados (1.6s)
  const t2 = setTimeout(() => {
    submittingStep.value = 2;
  }, 1600);

  // Step 3: Éxito (2.4s)
  const t3 = setTimeout(() => {
    if (selectedJob.value) {
      appliedJobIds.value.push(selectedJob.value.id);
      localStorage.setItem(
        "tukuy_applied_jobs",
        JSON.stringify(appliedJobIds.value),
      );
      applicationStep.value = "success";
    }
  }, 2400);
}
</script>

<template>
  <PortalSection wide :centered="false">
    <div class="grid gap-4 rounded-lg border border-border bg-muted/30 p-4">
      <div class="relative max-w-xl">
        <Search
          class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          v-model="portal.jobSearchTerm.value"
          class="h-11 bg-background pl-10"
          type="search"
          placeholder="Buscar por cargo, empresa, ubicación o etiqueta..."
        />
      </div>

      <div class="grid gap-3">
        <div class="flex flex-wrap items-center gap-2">
          <span
            class="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >Mostrar</span
          >
          <Button
            :variant="
              portal.scopeFilter.value === 'all' ? 'default' : 'outline'
            "
            size="sm"
            @click="portal.scopeFilter.value = 'all'"
          >
            Todas
          </Button>
          <Button
            :variant="
              portal.scopeFilter.value === 'for-you' ? 'default' : 'outline'
            "
            size="sm"
            @click="portal.scopeFilter.value = 'for-you'"
          >
            <Sparkles class="h-3.5 w-3.5" />
            Hecho para ti
          </Button>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <span
            class="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >Fecha</span
          >
          <Button
            :variant="portal.dateFilter.value === 'all' ? 'default' : 'outline'"
            size="sm"
            @click="portal.dateFilter.value = 'all'"
          >
            Todas
          </Button>
          <Button
            :variant="
              portal.dateFilter.value === 'recent' ? 'default' : 'outline'
            "
            size="sm"
            @click="portal.dateFilter.value = 'recent'"
          >
            Recientes
          </Button>
          <Button
            :variant="
              portal.dateFilter.value === 'closing-soon' ? 'default' : 'outline'
            "
            size="sm"
            @click="portal.dateFilter.value = 'closing-soon'"
          >
            Cierran pronto
          </Button>
          <Button
            :variant="
              portal.dateFilter.value === 'this-month' ? 'default' : 'outline'
            "
            size="sm"
            @click="portal.dateFilter.value = 'this-month'"
          >
            Cierran este mes
          </Button>
        </div>
      </div>
    </div>

    <!-- Recommended jobs block -->
    <section
      v-if="
        portal.scopeFilter.value === 'all' && portal.forYouJobs.value.length
      "
      class="grid gap-4"
    >
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p class="text-xs font-bold uppercase text-primary">
            Hecho para ti
          </p>
          <h2 class="text-xl font-bold text-foreground">
            Vacantes alineadas con tu perfil
          </h2>
          <p class="mt-1 text-sm text-muted-foreground">
            Según tu CV, certificados y experiencia en Tukuy Obra / SIADEG.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          @click="portal.scopeFilter.value = 'for-you'"
        >
          Ver solo para ti ({{ portal.forYouJobs.value.length }})
        </Button>
      </div>

      <div class="grid gap-3">
        <TarjetaEmpleo
          v-for="job in portal.forYouJobs.value.slice(0, 3)"
          :key="job.id"
          :job="job"
          :applied="appliedJobIds.includes(job.id)"
          featured
          @apply="openApplyModal(job)"
        />
      </div>
    </section>

    <!-- Main jobs listings -->
    <section class="grid gap-4">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 class="text-xl font-bold text-foreground">
            {{
              portal.scopeFilter.value === "for-you"
                ? "Oportunidades para tu perfil"
                : "Todas las oportunidades"
            }}
          </h2>
          <p class="mt-1 text-sm text-muted-foreground">
            {{ portal.filteredJobs.value.length }} vacante{{
              portal.filteredJobs.value.length === 1 ? "" : "s"
            }}
            disponible{{ portal.filteredJobs.value.length === 1 ? "" : "s" }}
            {{
              portal.scopeFilter.value === "for-you"
                ? " con alto match para ti"
                : " en la bolsa Tukuy"
            }}.
          </p>
        </div>
      </div>

      <div class="grid gap-3">
        <template v-if="portal.jobsLoading.value">
          <EsqueletoTarjetaEmpleo v-for="i in 4" :key="i" />
        </template>
        <template v-else-if="portal.filteredJobs.value.length">
          <TarjetaEmpleo
            v-for="job in portal.filteredJobs.value"
            :key="job.id"
            :job="job"
            :applied="appliedJobIds.includes(job.id)"
            @apply="openApplyModal(job)"
          />
        </template>
        <Card v-else class="shadow-none">
          <CardContent class="py-10 text-center text-sm text-muted-foreground">
            No hay vacantes con estos filtros. Prueba otra fecha o quita el
            filtro "Hecho para ti".
          </CardContent>
        </Card>
      </div>
    </section>

    <!-- Interactive Job Application Modal -->
    <div
      v-if="selectedJob"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
    >
      <div
        class="relative w-full max-w-md overflow-hidden rounded-xl border border-white/20 bg-card shadow-2xl transition-all duration-300"
      >
        <!-- Modal Header -->
        <div
          class="flex items-center justify-between border-b border-border px-6 py-4"
        >
          <div class="flex items-center gap-2">
            <Briefcase class="h-5 w-5 text-primary" />
            <h3
              class="text-sm font-extrabold text-primary uppercase tracking-wide"
            >
              Postulación Laboral
            </h3>
          </div>
          <button
            type="button"
            class="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition"
            @click="selectedJob = null"
          >
            <X class="h-5 w-5" />
          </button>
        </div>

        <!-- Step 1: Details and verification -->
        <template v-if="applicationStep === 'details'">
          <div class="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
            <!-- Job title summary -->
            <div class="rounded-lg bg-muted p-4 border border-border">
              <h4 class="text-base font-bold text-foreground leading-snug">
                {{ selectedJob.title }}
              </h4>
              <p class="mt-1 text-xs text-muted-foreground flex flex-wrap gap-x-3">
                <span class="font-semibold text-foreground">{{
                  selectedJob.company
                }}</span>
                <span>·</span>
                <span>{{ selectedJob.location }}</span>
              </p>
              <div
                class="mt-2.5 flex items-center gap-1.5 text-[11px] text-amber-700 bg-amber-50 border border-amber-200/50 px-2.5 py-1 rounded-md w-fit font-medium"
              >
                <CalendarDays class="h-3.5 w-3.5" />
                <span>Fecha límite: {{ formatDeadline(selectedJob.deadlineAt) }}</span>
              </div>
            </div>

            <!-- Skills match matrix -->
            <div class="space-y-2">
              <h5
                class="text-[11px] font-bold uppercase tracking-wider text-muted-foreground"
              >
                Compatibilidad de Requisitos
              </h5>
              <div class="grid gap-2 sm:grid-cols-2">
                <div
                  v-for="tag in selectedJob.tags"
                  :key="tag"
                  class="flex items-center gap-2 rounded-lg border p-2.5 text-xs font-medium transition"
                  :class="
                    userSkills.includes(tag.toLowerCase())
                      ? 'border-emerald-100 bg-emerald-50/50 text-emerald-800'
                      : 'border-border bg-muted text-muted-foreground'
                  "
                >
                  <CheckCircle2
                    class="h-4 w-4 shrink-0"
                    :class="
                      userSkills.includes(tag.toLowerCase())
                        ? 'text-emerald-600'
                        : 'text-muted-foreground/50'
                    "
                  />
                  <div class="min-w-0 flex-1">
                    <p class="font-bold truncate text-[11px]">{{ tag }}</p>
                    <p class="text-[9px] text-muted-foreground leading-none mt-0.5">
                      {{
                        userSkills.includes(tag.toLowerCase())
                          ? "Perfil verificado ✅"
                          : "Habilidad deseable"
                      }}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Verification document info -->
            <div
              class="space-y-2 rounded-lg border border-border bg-card p-4 shadow-sm"
            >
              <h5
                class="text-[11px] font-bold uppercase tracking-wider text-muted-foreground"
              >
                Documentos verificados que se enviarán
              </h5>
              <div class="space-y-3 mt-1.5">
                <div class="flex items-start gap-2.5">
                  <FileText
                    class="h-4.5 w-4.5 text-primary shrink-0 mt-0.5"
                  />
                  <div class="text-xs leading-snug">
                    <p class="font-bold text-foreground">
                      Currículum Vitae Inteligente
                    </p>
                    <p class="text-muted-foreground text-[10px]">
                      Tu CV unificado con historial laboral verificado en Tukuy
                      Obra y SIADEG.
                    </p>
                  </div>
                </div>
                <div class="flex items-start gap-2.5">
                  <Award class="h-4.5 w-4.5 text-emerald-600 shrink-0 mt-0.5" />
                  <div class="text-xs leading-snug">
                    <p class="font-bold text-foreground">
                      Certificados de Tukuy Academy ({{
                        portal.completedCourses.value.length
                      }}
                      completados)
                    </p>
                    <p class="text-muted-foreground text-[10px]">
                      Tus acreditaciones aprobadas que validan tus capacidades
                      técnicas.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Cover letter text box -->
            <div class="space-y-1.5">
              <label
                class="text-[11px] font-bold uppercase tracking-wider text-muted-foreground"
                for="cover-letter"
              >
                Presentación personal corta (Opcional)
              </label>
              <textarea
                id="cover-letter"
                v-model="coverLetter"
                rows="2"
                placeholder="Hola constructora, tengo experiencia en el control logístico de obras..."
                class="w-full rounded-lg border border-border bg-card p-2.5 text-xs leading-relaxed focus:border-[#0B3A78] focus:ring-1 focus:ring-[#0B3A78] outline-none transition"
              />
            </div>
          </div>

          <!-- Footer actions -->
          <div
            class="flex items-center justify-end gap-3 border-t border-border bg-muted px-6 py-4"
          >
            <Button variant="outline" size="sm" @click="selectedJob = null"
              >Cancelar</Button
            >
            <Button
              size="sm"
              class="bg-[#0B3A78] text-white hover:bg-[#072a56] font-semibold"
              @click="handleConfirmApply"
            >
              Postular con Perfil Verificado
            </Button>
          </div>
        </template>

        <!-- Step 2: Animated submitting -->
        <template v-else-if="applicationStep === 'submitting'">
          <div
            class="flex flex-col items-center justify-center p-10 text-center space-y-6"
          >
            <Loader2 class="h-10 w-10 animate-spin text-primary" />
            <div class="space-y-2">
              <h4 class="text-sm font-bold text-foreground">
                Procesando postulación en la Bolsa Tukuy
              </h4>
              <p class="text-xs text-muted-foreground max-w-xs leading-relaxed">
                Nuestra Inteligencia de Match está cruzando tus credenciales con
                los requisitos de la constructora.
              </p>
            </div>

            <!-- Progress indicator steps -->
            <div
              class="w-full max-w-xs space-y-2 text-left text-xs bg-muted p-4 rounded-lg border border-border"
            >
              <div
                class="flex items-center justify-between gap-3 text-foreground"
              >
                <span
                  :class="
                    submittingStep >= 0
                      ? 'font-bold text-primary'
                      : 'text-muted-foreground'
                  "
                >
                  1. Cruzando perfil con requerimientos
                </span>
                <span
                  v-if="submittingStep > 0"
                  class="text-emerald-600 font-bold"
                  >✅</span
                >
                <Loader2
                  v-else-if="submittingStep === 0"
                  class="h-3 w-3 animate-spin text-primary"
                />
              </div>
              <div
                class="flex items-center justify-between gap-3 text-foreground"
              >
                <span
                  :class="
                    submittingStep >= 1
                      ? 'font-bold text-primary'
                      : 'text-muted-foreground'
                  "
                >
                  2. Adjuntando CV Inteligente y Certificados
                </span>
                <span
                  v-if="submittingStep > 1"
                  class="text-emerald-600 font-bold"
                  >✅</span
                >
                <Loader2
                  v-else-if="submittingStep === 1"
                  class="h-3 w-3 animate-spin text-primary"
                />
              </div>
              <div
                class="flex items-center justify-between gap-3 text-foreground"
              >
                <span
                  :class="
                    submittingStep >= 2
                      ? 'font-bold text-primary'
                      : 'text-muted-foreground'
                  "
                >
                  3. Registrando postulación oficial
                </span>
                <Loader2
                  v-if="submittingStep === 2"
                  class="h-3 w-3 animate-spin text-primary"
                />
              </div>
            </div>
          </div>
        </template>

        <!-- Step 3: Success state -->
        <template v-else-if="applicationStep === 'success'">
          <div
            class="flex flex-col items-center justify-center p-10 text-center space-y-5"
          >
            <div
              class="rounded-full bg-emerald-50 p-3.5 ring-8 ring-emerald-500/10"
            >
              <CheckCircle2 class="h-8 w-8 text-emerald-600" />
            </div>
            <div class="space-y-2">
              <h4 class="text-base font-black text-foreground">
                ¡Postulación Enviada con Éxito!
              </h4>
              <p
                class="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed"
              >
                Tus certificados oficiales y tu currículum inteligente
                verificado han sido entregados a
                <strong>{{ selectedJob.company }}</strong
                >.
              </p>
            </div>
            <div
              class="rounded-lg bg-emerald-50/50 border border-emerald-100 p-3.5 text-xs text-emerald-800 max-w-sm text-left"
            >
              💡 <strong>¿Qué sigue?</strong> La constructora revisará tu perfil
              directamente desde su panel de control de Tukuy Obra. Te
              notificaremos si eres seleccionado para entrevista.
            </div>
            <Button
              size="sm"
              class="font-semibold px-6 mt-2"
              @click="selectedJob = null"
            >
              Entendido
            </Button>
          </div>
        </template>
      </div>
    </div>
  </PortalSection>
</template>
