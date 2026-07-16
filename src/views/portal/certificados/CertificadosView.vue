<script setup lang="ts">
import {
  Award,
  BadgeCheck,
  CalendarCheck,
  Download,
  QrCode,
  Search,
  ShieldCheck,
  X,
  Loader2,
  CheckCircle2,
  AlertTriangle,
} from "lucide-vue-next";
import { computed, ref } from "vue";

import PortalSection from "@/components/shared/PortalSection.vue";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Course } from "@/types/academia";
import { downloadPortfolioPdf } from "@/lib/certificado-pdf";
import { usePortalContext } from "../composables/usePortalContext";

const portal = usePortalContext();

const simulatedCertificates = computed<Course[]>(() => [
  ...portal.completedCourses.value,
  {
    id: "c-010",
    title: "Tukuy Asistencia: control de personal y tareos",
    category: "Tukuy Asistencia",
    duration: "12 horas",
    level: "Intermedio",
    mode: "Virtual",
    progress: 100,
    status: "Completado",
    pricing: "free",
    imageTone: "from-blue-800 to-slate-900",
    image:
      "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "c-011",
    title: "Requerimientos, compras y trazabilidad en obra",
    category: "Requerimientos",
    duration: "16 horas",
    level: "Intermedio",
    mode: "Mixto",
    progress: 100,
    status: "Completado",
    pricing: "paid",
    imageTone: "from-teal-700 to-blue-900",
    image:
      "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "c-012",
    title: "Reportes ejecutivos y KPIs para seguimiento de obras",
    category: "Reportes Avanzados",
    duration: "18 horas",
    level: "Avanzado",
    mode: "Virtual",
    progress: 100,
    status: "Completado",
    pricing: "paid",
    imageTone: "from-slate-700 to-cyan-800",
    image:
      "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=900&q=80",
  },
]);

const featuredCertificate = computed(() => simulatedCertificates.value[0]);

const metrics = computed(() => [
  {
    label: "Certificados emitidos",
    value: `${simulatedCertificates.value.length}`,
    detail: "constancias verificables",
    icon: Award,
    image:
      "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=900&q=80",
  },
  {
    label: "Horas certificadas",
    value: `${simulatedCertificates.value.reduce((total, course) => total + Number.parseInt(course.duration, 10), 0)}`,
    detail: "horas acumuladas",
    icon: CalendarCheck,
    image:
      "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=900&q=80",
  },
  {
    label: "Validados",
    value: "100%",
    detail: "con código de verificación",
    icon: ShieldCheck,
    image:
      "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=900&q=80",
  },
  {
    label: "Perfil laboral",
    value: `${portal.user.value?.profileProgress ?? 0}%`,
    detail: "impacto en CV inteligente",
    icon: BadgeCheck,
    image:
      "https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=900&q=80",
  },
]);

function certificateCode(course: Course) {
  return `TA-2026-${course.id.replace("c-", "").padStart(4, "0")}`;
}

function issuedDate(course: Course, index: number) {
  const dates: Record<string, string> = {
    "c-001": "15 jun 2026",
    "c-003": "28 may 2026",
    "c-008": "02 jul 2026",
    "c-010": "06 jul 2026",
    "c-011": "18 jun 2026",
    "c-012": "03 jul 2026",
  };
  return dates[course.id] ?? `${10 + index} jul 2026`;
}

const isDownloadingPortfolio = ref(false);
const showVerifyModal = ref(false);
const verificationCode = ref("");
const isVerifying = ref(false);
const verificationResult = ref<{
  success: boolean;
  message: string;
  certificate?: any;
} | null>(null);

async function handleDownloadPortfolio() {
  if (isDownloadingPortfolio.value) return;
  isDownloadingPortfolio.value = true;
  try {
    if (portal.user.value) {
      await downloadPortfolioPdf(
        simulatedCertificates.value,
        portal.user.value,
      );
    }
  } catch (err) {
    console.error("Error downloading portfolio:", err);
  } finally {
    isDownloadingPortfolio.value = false;
  }
}

function handleVerifyCode() {
  if (!verificationCode.value.trim()) return;
  isVerifying.value = true;
  verificationResult.value = null;

  setTimeout(() => {
    isVerifying.value = false;
    const code = verificationCode.value.trim().toUpperCase();
    const found = simulatedCertificates.value.find((c) => {
      const suffix = c.id.replace("c-", "").padStart(4, "0");
      return (
        code === `TA-2026-${suffix}` ||
        code === c.id.toUpperCase() ||
        code === `TA-2026-${c.id.replace("c-", "")}`
      );
    });

    if (found) {
      verificationResult.value = {
        success: true,
        message: "Código de certificado verificado exitosamente.",
        certificate: {
          title: found.title,
          category: found.category,
          code: `TA-2026-${found.id.replace("c-", "").padStart(4, "0")}`,
          issuedAt: "07 jul 2026",
          duration: found.duration,
          mode: found.mode,
        },
      };
    } else {
      verificationResult.value = {
        success: false,
        message:
          "El código ingresado no corresponde a ningún certificado válido o emitido en la plataforma.",
      };
    }
  }, 1500);
}
</script>

<template>
  <PortalSection wide :centered="false">
    <section class="grid gap-7">
      <div
        class="relative overflow-hidden rounded-xl border border-border bg-card shadow-sm"
      >
        <div
          class="absolute inset-y-0 right-0 hidden w-[35%] bg-[#071F52] lg:block"
        />
        <div
          class="absolute right-[28%] top-0 hidden h-full w-24 -skew-x-6 bg-card lg:block"
        />

        <div
          class="relative grid min-h-[520px] gap-8 px-6 py-10 lg:grid-cols-[minmax(0,0.96fr)_minmax(420px,1fr)] lg:px-16 lg:py-14"
        >
          <div class="grid content-center gap-7">
            <div class="flex flex-wrap items-center gap-3">
              <div class="flex -space-x-2">
                <span
                  class="grid h-8 w-8 place-items-center rounded-full border-2 border-white bg-[#0B3A78] text-[11px] font-black text-white"
                  >TA</span
                >
                <span
                  class="grid h-8 w-8 place-items-center rounded-full border-2 border-white bg-accent text-[11px] font-black text-accent-foreground"
                  >OK</span
                >
                <span
                  class="grid h-8 w-8 place-items-center rounded-full border-2 border-white bg-muted text-[11px] font-black text-foreground"
                  >PDF</span
                >
              </div>
              <p class="text-sm font-bold text-primary">
                certificados verificables para empleabilidad en obra
              </p>
            </div>

            <div>
              <h1
                class="mt-5 max-w-3xl text-4xl font-black leading-tight tracking-normal text-foreground sm:text-5xl"
              >
                Respalda tus habilidades con certificados verificables
              </h1>
            </div>

            <div class="flex flex-wrap gap-3">
              <Button
                class="h-14 rounded-md bg-primary px-8 text-base font-bold text-primary-foreground shadow-sm hover:bg-primary/90"
                type="button"
                :disabled="isDownloadingPortfolio"
                @click="handleDownloadPortfolio"
              >
                <Loader2
                  v-if="isDownloadingPortfolio"
                  class="h-4 w-4 animate-spin mr-1.5"
                />
                <Download v-else class="h-4 w-4" />
                {{
                  isDownloadingPortfolio
                    ? "Generando portafolio..."
                    : "Descargar portafolio"
                }}
              </Button>
              <Button
                class="h-14 rounded-md border-border bg-card px-8 text-base font-bold text-primary hover:bg-muted"
                variant="outline"
                type="button"
                @click="
                  showVerifyModal = true;
                  verificationCode = '';
                  verificationResult = null;
                "
              >
                <QrCode class="h-4 w-4" />
                Verificar código
              </Button>
            </div>
          </div>

          <div
            v-if="featuredCertificate"
            class="relative min-h-[440px] lg:min-h-[500px]"
          >
            <div
              class="absolute left-[9%] top-[13%] h-[66%] w-[48%] rotate-[-2deg] overflow-hidden rounded-lg border border-border bg-card shadow-2xl"
            >
              <img
                :src="featuredCertificate.image"
                :alt="featuredCertificate.title"
                class="h-full w-full object-cover"
              />
              <div
                class="absolute inset-0 bg-linear-to-t from-[#07152B]/55 to-transparent"
              />
            </div>

            <div
              class="certificado-impreso absolute right-[6%] top-[17%] w-[57%] rotate-[2deg] rounded-lg border border-[#DDE7F4] bg-white p-5 text-[#07152B] shadow-2xl dark:border-[#DDE7F4] dark:bg-white dark:text-[#07152B]"
              role="img"
              :aria-label="`Vista previa del certificado de ${featuredCertificate.title}`"
            >
              <div class="border-4 border-[#0B3A78] bg-white p-4">
                <div class="border border-[#8FB5CE] bg-white p-4 text-center">
                  <img
                    class="mx-auto h-8 w-auto object-contain"
                    src="/img/iconoTukuyAcademy.png"
                    alt="Tukuy Academy"
                  />
                  <p
                    class="mt-4 text-[10px] font-black uppercase tracking-wide text-primary"
                  >
                    Certificado de reconocimiento
                  </p>
                  <h2 class="mt-4 text-lg font-black text-[#07152B]">
                    {{ portal.user.value?.name }}
                  </h2>
                  <div class="mx-auto mt-2 h-px w-32 bg-slate-200" />
                  <p class="mt-3 text-[11px] text-[#64748B]">
                    ha completado satisfactoriamente
                  </p>
                  <p
                    class="mt-2 line-clamp-2 text-sm font-black text-[#07152B]"
                  >
                    {{ featuredCertificate.title }}
                  </p>
                  <p class="mt-3 text-[10px] text-[#64748B]">
                    {{ certificateCode(featuredCertificate) }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <article
          v-for="metric in metrics"
          :key="metric.label"
          class="group relative flex min-h-44 flex-col overflow-hidden rounded-none border border-border bg-card shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-md"
        >
          <img
            :src="metric.image"
            :alt="metric.label"
            class="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
          <div
            class="absolute inset-0 bg-linear-to-t from-[#07152B]/95 via-[#07152B]/70 to-[#0B3A78]/35"
          />

          <div class="relative z-[1] flex flex-1 flex-col justify-between p-4">
            <div class="flex items-start justify-between gap-3">
              <p
                class="text-[11px] font-bold uppercase tracking-[0.16em] text-[#F5B400]"
              >
                {{ metric.label }}
              </p>
              <span
                class="grid h-9 w-9 shrink-0 place-items-center border border-white/25 bg-card/10 text-white backdrop-blur-sm"
              >
                <component :is="metric.icon" class="h-4 w-4" />
              </span>
            </div>

            <div>
              <strong class="block text-3xl font-black tracking-tight text-white">
                {{ metric.value }}
              </strong>
              <p class="mt-1 text-sm text-white/75">
                {{ metric.detail }}
              </p>
            </div>
          </div>
        </article>
      </div>

      <div
        class="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between"
      >
        <div>
          <p class="text-xs font-bold uppercase text-primary">
            Biblioteca de certificados
          </p>
          <h2 class="mt-1 text-2xl font-black text-foreground">
            Constancias disponibles
          </h2>
        </div>
        <div class="relative w-full lg:max-w-sm">
          <Search
            class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            class="h-11 border-border bg-background pl-10"
            type="search"
            placeholder="Buscar certificado..."
          />
        </div>
      </div>

      <div class="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <article
          v-for="(course, index) in simulatedCertificates"
          :key="course.id"
          class="group relative flex flex-col rounded-none border border-border bg-card text-card-foreground shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-md"
        >
          <div
            class="relative aspect-video w-full overflow-hidden border-b border-border bg-muted"
          >
            <img
              :src="course.image"
              :alt="course.title"
              class="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            />
            <Badge
              class="absolute left-3 top-3 rounded-none border-border bg-card/95 px-2.5 py-0.5 text-[11px] font-semibold text-foreground shadow-none"
              variant="outline"
            >
              {{ course.category }}
            </Badge>
          </div>

          <div class="flex flex-1 flex-col gap-2 px-4 pb-4 pt-3">
            <h3
              class="line-clamp-2 text-base font-bold leading-snug text-foreground transition group-hover:text-primary"
            >
              {{ course.title }}
            </h3>

            <p class="text-sm text-muted-foreground">
              Emitido el {{ issuedDate(course, index) }} ·
              {{ course.duration }} · {{ course.mode }}
            </p>

            <div class="flex flex-wrap items-center gap-2">
              <Badge
                class="rounded-none border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 shadow-none dark:text-emerald-400"
                variant="outline"
              >
                Verificado
              </Badge>
              <span class="text-xs font-semibold text-muted-foreground">
                {{ certificateCode(course) }}
              </span>
            </div>

            <div class="mt-auto flex items-end justify-between gap-2 pt-2">
              <Button
                size="sm"
                variant="outline"
                class="rounded-none"
                :disabled="portal.openingCertificateId.value === course.id"
                @click="portal.handleViewCertificate(course)"
              >
                {{
                  portal.openingCertificateId.value === course.id
                    ? "Generando..."
                    : "Ver PDF"
                }}
              </Button>
              <Button
                size="sm"
                class="rounded-none"
                :disabled="portal.openingCertificateId.value === course.id"
                @click="portal.handleDownloadCertificate(course)"
              >
                <Download class="h-4 w-4" />
                Descargar
              </Button>
            </div>
          </div>
        </article>
      </div>

      <section class="grid gap-5 lg:grid-cols-[1fr_360px]">
        <Card class="border-border bg-card shadow-sm">
          <CardContent class="grid gap-4 p-5">
            <div>
              <p class="text-xs font-bold uppercase text-primary">
                Trazabilidad
              </p>
              <h3 class="mt-1 text-xl font-black text-foreground">
                Cómo se valida cada certificado
              </h3>
            </div>
            <div class="grid gap-3 md:grid-cols-3">
              <div class="rounded-md border border-border bg-muted/50 p-4">
                <QrCode class="h-5 w-5 text-primary" />
                <strong class="mt-3 block text-foreground">Código único</strong>
                <p class="mt-2 text-sm text-muted-foreground">
                  Cada constancia tiene un código TA verificable.
                </p>
              </div>
              <div class="rounded-md border border-border bg-muted/50 p-4">
                <ShieldCheck class="h-5 w-5 text-primary" />
                <strong class="mt-3 block text-foreground">Validación online</strong>
                <p class="mt-2 text-sm text-muted-foreground">
                  Empresas pueden confirmar autenticidad y vigencia.
                </p>
              </div>
              <div class="rounded-md border border-border bg-muted/50 p-4">
                <BadgeCheck class="h-5 w-5 text-primary" />
                <strong class="mt-3 block text-foreground">Impacto en CV</strong>
                <p class="mt-2 text-sm text-muted-foreground">
                  Los certificados alimentan el CV inteligente y el matching.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card class="border-primary/20 bg-primary/10 shadow-sm">
          <CardContent class="grid gap-4 p-5">
            <Award class="h-6 w-6 text-primary" />
            <div>
              <h3 class="text-xl font-black text-foreground">
                Portafolio certificable
              </h3>
              <p class="mt-2 text-sm leading-6 text-muted-foreground">
                Agrupa tus constancias en un portafolio profesional para
                adjuntar en postulaciones.
              </p>
            </div>
            <Button
              type="button"
              :disabled="isDownloadingPortfolio"
              @click="handleDownloadPortfolio"
            >
              <Loader2
                v-if="isDownloadingPortfolio"
                class="h-4 w-4 animate-spin mr-1.5"
              />
              <Download v-else class="h-4 w-4" />
              {{
                isDownloadingPortfolio ? "Generando..." : "Descargar resumen"
              }}
            </Button>
          </CardContent>
        </Card>
      </section>
    </section>

    <!-- Verification Modal -->
    <div
      v-if="showVerifyModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      @click.self="showVerifyModal = false"
    >
      <div
        class="w-full max-w-md overflow-hidden rounded-xl border border-border bg-card shadow-2xl transition-all"
      >
        <!-- Modal Header -->
        <div
          class="flex items-center justify-between border-b border-border bg-muted px-5 py-4"
        >
          <div class="flex items-center gap-2">
            <QrCode class="h-5 w-5 text-primary" />
            <h3 class="text-sm font-black text-foreground">
              Verificador de Certificados
            </h3>
          </div>
          <button
            type="button"
            class="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            @click="showVerifyModal = false"
          >
            <X class="h-4 w-4" />
          </button>
        </div>

        <!-- Modal Body -->
        <div class="p-5 space-y-4">
          <p class="text-xs leading-relaxed text-muted-foreground">
            Ingresa el código único de validación de Tukuy Academy (ejemplo:
            <strong class="text-foreground">TA-2026-0008</strong> o
            <strong class="text-foreground">TA-2026-010</strong>) para verificar
            su autenticidad.
          </p>

          <div class="flex gap-2">
            <Input
              v-model="verificationCode"
              type="text"
              placeholder="Código de certificado (TA-2026-XXXX)"
              class="h-11 border-border bg-background"
              @keyup.enter="handleVerifyCode"
            />
            <Button
              class="h-11 shrink-0 px-4 font-bold"
              :disabled="isVerifying || !verificationCode.trim()"
              @click="handleVerifyCode"
            >
              <Loader2 v-if="isVerifying" class="h-4 w-4 animate-spin" />
              <span v-else>Verificar</span>
            </Button>
          </div>

          <!-- Loading State -->
          <div
            v-if="isVerifying"
            class="flex flex-col items-center justify-center py-6 gap-2"
          >
            <Loader2 class="h-8 w-8 animate-spin text-primary" />
            <span class="text-xs font-bold text-primary"
              >Consultando base de datos central...</span
            >
          </div>

          <!-- Verification Results -->
          <div v-if="!isVerifying && verificationResult" class="mt-2 space-y-3">
            <!-- Success state -->
            <div
              v-if="verificationResult.success"
              class="rounded-lg border border-emerald-100 bg-emerald-50/50 p-4 space-y-3"
            >
              <div class="flex items-start gap-2.5">
                <CheckCircle2
                  class="h-5 w-5 text-emerald-600 shrink-0 mt-0.5"
                />
                <div>
                  <h4 class="text-xs font-bold text-emerald-800">
                    Certificado Auténtico y Válido
                  </h4>
                  <p class="text-[10px] text-emerald-700 mt-0.5">
                    La firma digital y registro corresponden a un documento
                    emitido por Tukuy.
                  </p>
                </div>
              </div>

              <!-- Certificate Detail Box -->
              <div
                class="space-y-2 rounded border border-emerald-500/20 bg-card p-3 text-xs"
              >
                <div class="flex justify-between">
                  <span class="text-muted-foreground">Estudiante:</span>
                  <strong class="font-bold text-foreground">{{
                    portal.user.value?.name
                  }}</strong>
                </div>
                <div class="flex justify-between">
                  <span class="text-muted-foreground">Programa:</span>
                  <strong
                    class="max-w-50 truncate text-right font-bold text-foreground"
                    >{{ verificationResult.certificate.title }}</strong
                  >
                </div>
                <div class="flex justify-between">
                  <span class="text-muted-foreground">Código:</span>
                  <strong class="font-mono font-bold text-foreground">{{
                    verificationResult.certificate.code
                  }}</strong>
                </div>
                <div class="flex justify-between">
                  <span class="text-muted-foreground">Emisión:</span>
                  <strong class="font-bold text-foreground">{{
                    verificationResult.certificate.issuedAt
                  }}</strong>
                </div>
                <div class="flex justify-between">
                  <span class="text-muted-foreground">Duración:</span>
                  <strong class="font-bold text-foreground"
                    >{{ verificationResult.certificate.duration }} ({{
                      verificationResult.certificate.mode
                    }})</strong
                  >
                </div>
              </div>
            </div>

            <!-- Error state -->
            <div
              v-else
              class="rounded-lg border border-red-100 bg-red-50/50 p-4 flex items-start gap-2.5"
            >
              <AlertTriangle class="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <h4 class="text-xs font-bold text-red-800">
                  Código no Encontrado
                </h4>
                <p class="text-[11px] text-red-700 mt-0.5 leading-relaxed">
                  {{ verificationResult.message }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Modal Footer -->
        <div
          class="flex justify-end border-t border-border bg-muted px-5 py-3.5"
        >
          <Button
            variant="outline"
            size="sm"
            class="h-9 border-border bg-card font-semibold"
            @click="showVerifyModal = false"
          >
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  </PortalSection>
</template>

<style scoped>
/* El certificado representa un documento impreso. Su paleta no hereda el
   tema de la aplicación y debe conservarse igual que una imagen o un PDF. */
.certificado-impreso {
  color-scheme: light;
}
</style>
