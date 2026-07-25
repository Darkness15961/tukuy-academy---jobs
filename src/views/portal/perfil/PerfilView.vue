<script setup lang="ts">
import {
  Award,
  BriefcaseBusiness,
  CalendarDays,
  ChevronDown,
  ClipboardCheck,
  FileText,
  MapPin,
  ShieldCheck,
  Sparkles,
  UserRound,
  UsersRound,
} from "lucide-vue-next";
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRoot,
  DropdownMenuTrigger,
} from "reka-ui";
import { computed, ref } from "vue";
import { useRouter } from "vue-router";

import PageTitle from "@/components/shared/PageTitle.vue";
import PortalSection from "@/components/shared/PortalSection.vue";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { portalPathByView } from "@/lib/portal-routes";
import type { WorkExperience } from "@/types/academia";
import { usePortalContext } from "../composables/usePortalContext";

const portal = usePortalContext();
const router = useRouter();
const profilePhotoSrc = "/img/vistasimg/perfilfoto.png";
const ecosistemaAbierto = ref(false);

const herramientasEcosistema = [
  {
    id: "cv",
    etiqueta: "CV / Perfil profesional",
    detalle: "Tu carta de presentación y experiencia laboral",
    ruta: "/perfil-profesional",
    icono: FileText,
  },
  {
    id: "bolsa",
    etiqueta: "Bolsa Tukuy",
    detalle: "Vacantes y postulaciones del ecosistema",
    ruta: "/bolsa-tukuy",
    icono: BriefcaseBusiness,
  },
  {
    id: "comunidad",
    etiqueta: "Comunidad Tukuy",
    detalle: "Publicaciones, grupos y networking",
    ruta: "/comunidad",
    icono: UsersRound,
  },
] as const;

const profileStats = computed(() => [
  {
    label: "Perfil",
    value: `${portal.user.value?.profileProgress ?? 0}%`,
    helper: "completado",
    icon: ClipboardCheck,
    class: "bg-primary/10 text-primary",
  },
  {
    label: "Empleabilidad",
    value: `${portal.user.value?.employabilityScore ?? 0}%`,
    helper: "score actual",
    icon: Sparkles,
    class: "bg-amber-50 text-amber-700",
  },
  {
    label: "Certificados",
    value: String(portal.user.value?.certificates ?? 0),
    helper: "validados",
    icon: Award,
    class: "bg-emerald-50 text-emerald-700",
  },
  {
    label: "Postulaciones",
    value: String(portal.user.value?.applications ?? 0),
    helper: "activas",
    icon: BriefcaseBusiness,
    class: "bg-muted text-foreground",
  },
]);

function formatDate(dateStr?: string) {
  if (!dateStr) return "-";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

const profileDetails = computed(() => [
  { label: "Oficio", value: portal.user.value?.trade ?? "-" },
  { label: "Especialidad", value: portal.user.value?.specialty ?? "-" },
  {
    label: "Fecha de nacimiento",
    value: formatDate(portal.user.value?.birthDate),
  },
  { label: "Ubicación", value: portal.user.value?.location ?? "-" },
  { label: "Disponibilidad", value: "Inmediata" },
  { label: "Pretensión", value: "S/ 1,800" },
  { label: "Estado", value: "Verificado" },
]);

function statusVariant(status: WorkExperience["status"]) {
  if (status === "Verificado") return "success";
  if (status === "Declarado") return "warning";
  return "default";
}

function irEcosistema(ruta: string) {
  ecosistemaAbierto.value = false;
  void router.push(ruta);
}

function irCalendario() {
  void router.push(portalPathByView.calendar);
}

function irCertificados() {
  void router.push(portalPathByView.certificates);
}
</script>

<template>
  <PortalSection v-if="portal.user.value" wide :centered="false">
    <PageTitle
      eyebrow="Perfil laboral"
      title="Datos listos para postular"
      description="Gestiona tu información, experiencia conectada y evidencias laborales."
    />

    <section
      class="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
    >
      <div class="grid gap-0 lg:grid-cols-[0.95fr_1.05fr]">
        <div class="relative bg-slate-950 p-6 text-white sm:p-8">
          <div
            class="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(37,99,235,0.32),transparent_34%),radial-gradient(circle_at_80%_20%,rgba(245,158,11,0.18),transparent_28%)]"
          />
          <div class="relative flex flex-col gap-6">
            <div class="flex items-start gap-4">
              <img
                class="h-24 w-24 rounded-2xl border border-white/20 object-cover shadow-xl sm:h-28 sm:w-28"
                :src="profilePhotoSrc"
                :alt="`Foto de ${portal.user.value.name}`"
              />
              <div class="min-w-0 pt-1">
                <Badge
                  class="bg-white/10 text-white ring-1 ring-white/15"
                  variant="secondary"
                >
                  Perfil verificado
                </Badge>
                <h2 class="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                  {{ portal.user.value.name }}
                </h2>
                <p class="mt-2 text-sm text-white/75">
                  {{ portal.user.value.trade }} ·
                  {{ portal.user.value.location }}
                </p>
              </div>
            </div>

            <div class="grid gap-3 sm:grid-cols-2">
              <div class="rounded-xl border border-white/10 bg-card/8 p-4">
                <div class="flex items-center gap-2 text-sm text-white/70">
                  <ShieldCheck class="h-4 w-4 text-emerald-300" />
                  Experiencia conectada
                </div>
                <strong class="mt-2 block text-2xl">{{
                  portal.workExperiences.value.length
                }}</strong>
              </div>
              <div class="rounded-xl border border-white/10 bg-card/8 p-4">
                <div class="flex items-center gap-2 text-sm text-white/70">
                  <MapPin class="h-4 w-4 text-amber-300" />
                  Zona principal
                </div>
                <strong class="mt-2 block text-2xl">Lima Este</strong>
              </div>
            </div>
          </div>
        </div>

        <div class="grid content-between gap-6 p-6 sm:p-8">
          <div>
            <div class="mb-3 flex items-center justify-between gap-4">
              <div>
                <span class="text-xs font-bold uppercase text-primary"
                  >Completitud del perfil</span
                >
                <h3 class="mt-1 text-xl font-bold text-foreground">
                  Base profesional actualizada
                </h3>
              </div>
              <strong class="text-3xl text-foreground"
                >{{ portal.user.value.profileProgress }}%</strong
              >
            </div>
            <Progress
              :model-value="portal.user.value.profileProgress"
              class="h-3"
            />
          </div>

          <div class="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <DropdownMenuRoot v-model:open="ecosistemaAbierto">
              <DropdownMenuTrigger as-child>
                <Button
                  class="w-full gap-2 sm:w-auto"
                  variant="outline"
                  type="button"
                >
                  <UsersRound class="h-4 w-4" />
                  Comunidad Tukuy
                  <span
                    class="rounded-sm bg-accent/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#B87A00] dark:text-accent"
                  >
                    Pro
                  </span>
                  <ChevronDown
                    class="h-4 w-4 text-muted-foreground transition-transform duration-200"
                    :class="ecosistemaAbierto ? 'rotate-180' : ''"
                  />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                class="z-50 w-[min(20rem,calc(100vw-2rem))] rounded-none border border-border bg-card p-1 shadow-lg"
                :side-offset="8"
                align="end"
              >
                <DropdownMenuItem
                  v-for="item in herramientasEcosistema"
                  :key="item.id"
                  class="flex cursor-pointer items-center gap-2 rounded-none px-2 py-2 text-sm outline-none hover:bg-muted"
                  @select="irEcosistema(item.ruta)"
                >
                  <component :is="item.icono" class="h-4 w-4" />
                  {{ item.etiqueta }}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenuRoot>
          </div>
        </div>
      </div>
    </section>

    <section class="border border-border bg-card shadow-sm">
      <div
        class="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4 sm:px-6"
      >
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <UsersRound class="h-4 w-4 text-primary" />
            <h3 class="text-lg font-bold text-foreground">Comunidad Tukuy</h3>
            <span
              class="rounded-sm bg-accent/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#B87A00] dark:text-accent"
            >
              Pro
            </span>
          </div>
          <p class="mt-1 text-sm text-muted-foreground">
            Ecosistema: perfil profesional, bolsa laboral y comunidad.
          </p>
        </div>
        <DropdownMenuRoot v-model:open="ecosistemaAbierto">
          <DropdownMenuTrigger as-child>
            <Button variant="outline" type="button" class="gap-2">
              Abrir
              <ChevronDown
                class="h-4 w-4 text-muted-foreground transition-transform duration-200"
                :class="ecosistemaAbierto ? 'rotate-180' : ''"
              />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            class="z-50 w-[min(20rem,calc(100vw-2rem))] rounded-none border border-border bg-card p-1 shadow-lg"
            :side-offset="8"
            align="end"
          >
            <DropdownMenuItem
              v-for="item in herramientasEcosistema"
              :key="`card-${item.id}`"
              class="flex cursor-pointer items-center gap-2 rounded-none px-2 py-2 text-sm outline-none hover:bg-muted"
              @select="irEcosistema(item.ruta)"
            >
              <component :is="item.icono" class="h-4 w-4" />
              {{ item.etiqueta }}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenuRoot>
      </div>
      <div class="grid gap-0 sm:grid-cols-3">
        <button
          v-for="item in herramientasEcosistema"
          :key="`grid-${item.id}`"
          type="button"
          class="flex items-center gap-3 border-b border-border px-5 py-4 text-left transition hover:bg-muted/60 sm:border-b-0 sm:border-r sm:last:border-r-0"
          @click="irEcosistema(item.ruta)"
        >
          <component :is="item.icono" class="h-4 w-4 shrink-0 text-primary" />
          <span>
            <strong class="block text-sm">{{ item.etiqueta }}</strong>
            <span class="mt-0.5 block text-xs text-muted-foreground">{{
              item.detalle
            }}</span>
          </span>
        </button>
      </div>
    </section>

    <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Card
        v-for="stat in profileStats"
        :key="stat.label"
        class="border-border shadow-sm"
      >
        <CardContent class="flex items-center gap-4 p-5">
          <div
            :class="[
              'flex h-12 w-12 items-center justify-center rounded-xl',
              stat.class,
            ]"
          >
            <component :is="stat.icon" class="h-5 w-5" />
          </div>
          <div>
            <span
              class="text-xs font-semibold uppercase text-muted-foreground"
              >{{ stat.label }}</span
            >
            <div class="mt-1 flex items-end gap-2">
              <strong class="text-2xl leading-none text-foreground">{{
                stat.value
              }}</strong>
              <span class="text-xs text-muted-foreground">{{
                stat.helper
              }}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>

    <section class="grid gap-4 md:grid-cols-2">
      <Card class="border-border shadow-sm">
        <CardContent
          class="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
        >
          <div class="flex items-start gap-3">
            <span
              class="grid h-12 w-12 place-items-center rounded-xl bg-emerald-50 text-emerald-700"
            >
              <Award class="h-5 w-5" />
            </span>
            <div>
              <h3 class="text-base font-bold text-foreground">
                Mis certificados
              </h3>
              <p class="mt-1 text-sm text-muted-foreground">
                Revisa, descarga y comparte tus certificados verificables.
              </p>
            </div>
          </div>
          <Button
            class="shrink-0 rounded-none"
            variant="outline"
            type="button"
            @click="irCertificados"
          >
            Ver certificados
          </Button>
        </CardContent>
      </Card>

      <Card class="border-border shadow-sm">
        <CardContent
          class="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
        >
          <div class="flex items-start gap-3">
            <span
              class="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary"
            >
              <CalendarDays class="h-5 w-5" />
            </span>
            <div>
              <h3 class="text-base font-bold text-foreground">
                Mi calendario
              </h3>
              <p class="mt-1 text-sm text-muted-foreground">
                Clases en vivo y sesiones programadas de tus cursos.
              </p>
            </div>
          </div>
          <Button
            class="shrink-0 rounded-none"
            type="button"
            @click="irCalendario"
          >
            Abrir calendario
          </Button>
        </CardContent>
      </Card>
    </section>

    <section class="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
      <Card class="shadow-sm">
        <CardHeader>
          <CardTitle class="flex items-center gap-2 text-xl">
            <UserRound class="h-5 w-5 text-primary" />
            Información laboral
          </CardTitle>
        </CardHeader>
        <CardContent class="grid gap-3 sm:grid-cols-2">
          <div
            v-for="detail in profileDetails"
            :key="detail.label"
            class="rounded-xl border border-border bg-muted p-4"
          >
            <span
              class="text-xs font-semibold uppercase text-muted-foreground"
              >{{ detail.label }}</span
            >
            <strong class="mt-1 block text-sm text-foreground">{{
              detail.value
            }}</strong>
          </div>
        </CardContent>
      </Card>

      <Card class="shadow-sm">
        <CardHeader>
          <CardTitle class="flex items-center gap-2 text-xl">
            <ShieldCheck class="h-5 w-5 text-primary" />
            Fuentes conectadas
          </CardTitle>
        </CardHeader>
        <CardContent class="grid gap-3">
          <button
            class="group flex items-center justify-between gap-4 rounded-xl border border-border bg-primary/10 p-4 text-left transition hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary/10 hover:shadow-md"
            type="button"
          >
            <div>
              <strong class="block text-sm text-foreground"
                >Tukuy Obra / SIADEG</strong
              >
              <span class="text-xs text-muted-foreground"
                >Cargos, obras, módulos y evidencias.</span
              >
            </div>
            <Badge variant="success">Conectado</Badge>
          </button>

          <button
            class="group flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 text-left transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
            type="button"
          >
            <div>
              <strong class="block text-sm text-foreground"
                >Registro manual</strong
              >
              <span class="text-xs text-muted-foreground"
                >Experiencia adicional para validar.</span
              >
            </div>
            <Badge variant="outline">Editar</Badge>
          </button>
        </CardContent>
      </Card>
    </section>

    <Card class="shadow-sm">
      <CardHeader
        class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <CardTitle class="flex items-center gap-2 text-xl">
          <BriefcaseBusiness class="h-5 w-5 text-primary" />
          Experiencia laboral
        </CardTitle>
        <Button
          variant="outline"
          type="button"
          @click="portal.navigate('jobs')"
        >
          Ver oportunidades
        </Button>
      </CardHeader>
      <CardContent class="grid gap-4">
        <article
          v-for="experience in portal.workExperiences.value"
          :key="experience.id"
          class="rounded-2xl border border-border bg-card p-4 transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
        >
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <strong class="text-base text-foreground">{{
                  experience.role
                }}</strong>
                <Badge :variant="statusVariant(experience.status)">
                  {{ experience.status }}
                </Badge>
              </div>
              <p class="mt-1 text-sm text-muted-foreground">
                {{ experience.project }} · {{ experience.location }}
              </p>
            </div>
            <span
              class="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground"
            >
              {{ experience.period }}
            </span>
          </div>

          <div class="mt-4 flex flex-wrap gap-2">
            <Badge variant="outline">{{ experience.source }}</Badge>
            <Badge
              v-for="module in experience.modules"
              :key="module"
              variant="outline"
              >{{ module }}</Badge
            >
          </div>
        </article>
      </CardContent>
    </Card>
  </PortalSection>
</template>
