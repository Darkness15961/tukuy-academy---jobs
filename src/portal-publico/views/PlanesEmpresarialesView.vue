<script setup lang="ts">
import {
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  Database,
  GraduationCap,
  ShieldCheck,
  UsersRound,
} from "lucide-vue-next";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import ToggleSwitch from "primevue/toggleswitch";
import { computed, nextTick, onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import SiteFooter from "@/components/shared/SiteFooter.vue";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { delay } from "@/lib/delay";
import HeaderPublico from "../components/HeaderPublico.vue";
import { planesEmpresariales, type PlanEmpresarial } from "../data/planes.mock";

const route = useRoute();
const router = useRouter();
const cargando = ref(true);
const facturacionAnual = ref(true);
const planSeleccionado = ref<PlanEmpresarial | null>(null);
const solicitudEnviada = ref(false);

const solicitud = reactive({
  organizacion: "",
  ruc: "",
  tipo: "Empresa",
  colaboradores: "51 a 200",
  contacto: "",
  correo: "",
  telefono: "",
});

const tiposOrganizacion = [
  "Empresa",
  "Academia",
  "Instituto",
  "Universidad",
  "ONG",
  "Entidad pública",
];
const rangosColaboradores = [
  "1 a 50",
  "51 a 200",
  "201 a 500",
  "501 a 1,000",
  "Más de 1,000",
];

onMounted(async () => {
  await delay(400);
  cargando.value = false;

  if (typeof route.query.plan === "string") {
    const plan = planesEmpresariales.find(
      (item) => item.id === route.query.plan,
    );
    if (plan) seleccionarPlan(plan, false);
  }
});

function precio(plan: PlanEmpresarial) {
  if (plan.precioMensual === null) return null;
  return facturacionAnual.value
    ? Math.round(plan.precioMensual * 0.85)
    : plan.precioMensual;
}

const ahorroAnual = computed(() =>
  facturacionAnual.value ? "Ahorra 15% con facturación anual" : "",
);

async function seleccionarPlan(plan: PlanEmpresarial, desplazar = true) {
  planSeleccionado.value = plan;
  solicitudEnviada.value = false;
  await router.replace({ query: { ...route.query, plan: plan.id } });
  if (desplazar) {
    await nextTick();
    document
      .querySelector("#solicitud-plan")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function enviarSolicitud() {
  if (
    !planSeleccionado.value ||
    !solicitud.organizacion.trim() ||
    !solicitud.contacto.trim() ||
    !solicitud.correo.trim()
  ) {
    return;
  }
  solicitudEnviada.value = true;
}

function irA(destino: string) {
  if (destino.startsWith("/")) {
    router.push(destino);
    return;
  }
  router.push({ path: "/", hash: destino });
}
</script>

<template>
  <div class="bg-white text-[#07152B]">
    <HeaderPublico @ir-a="irA" />

    <main>
      <section
        id="inicio"
        class="relative overflow-hidden bg-[#07152B] pb-24 pt-40 text-white"
      >
        <img
          src="/img/portada-planes-empresariales.png"
          alt=""
          width="1927"
          height="816"
          class="absolute inset-0 h-full w-full object-cover object-center"
          aria-hidden="true"
        />
        <div
          class="pointer-events-none absolute inset-0 bg-linear-to-r from-[#020817]/50 via-[#07152B]/30 to-[#07152B]/45"
        />
        <div
          class="pointer-events-none absolute inset-0 opacity-20"
          style="
            background-image:
              linear-gradient(rgba(255, 255, 255, 0.06) 1px, transparent 1px),
              linear-gradient(
                90deg,
                rgba(255, 255, 255, 0.06) 1px,
                transparent 1px
              );
            background-size: 80px 80px;
          "
        />
        <div
          class="relative mx-auto grid max-w-360 gap-10 px-5 lg:grid-cols-[1.15fr_.85fr] lg:items-end lg:px-8"
        >
          <div>
            <p
              class="text-sm font-black uppercase tracking-[.25em] text-[#F5B400]"
            >
              Tukuy para organizaciones
            </p>
            <h1
              class="mt-5 max-w-4xl text-5xl font-black leading-[.98] sm:text-7xl"
            >
              CAPACITACIÓN QUE<br />CRECE CON TU EMPRESA
            </h1>
            <p class="mt-7 max-w-2xl text-lg leading-8 text-blue-100">
              Selecciona el plan que se adapta a tu equipo y gestiona usuarios,
              cursos, rutas, certificados y resultados desde una sola
              plataforma.
            </p>
          </div>
          <div
            class="border-l-4 border-[#F5B400] bg-white/8 p-6 backdrop-blur-sm"
          >
            <p
              class="text-xs font-black uppercase tracking-[.18em] text-blue-200"
            >
              Todos los planes incluyen
            </p>
            <div class="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <p
                v-for="item in [
                  'Portal empresarial independiente',
                  'Bolsa Tukuy y comunidad',
                  'Certificados verificables',
                  'Soporte de implementación',
                ]"
                :key="item"
                class="flex items-center gap-3 text-sm font-semibold"
              >
                <Check class="h-4 w-4 text-[#F5B400]" /> {{ item }}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section class="bg-[#F5F8FC] py-20">
        <div class="mx-auto max-w-360 px-5 lg:px-8">
          <div class="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p
                class="text-sm font-black uppercase tracking-[.22em] text-[#0B3A78]"
              >
                Planes empresariales
              </p>
              <h2 class="mt-3 text-4xl font-black sm:text-5xl">
                ELIGE CÓMO QUIERES CRECER
              </h2>
            </div>
            <label
              class="flex items-center gap-3 border border-[#D7E0EC] bg-white p-4"
            >
              <span
                :class="[
                  'text-sm font-bold',
                  !facturacionAnual ? 'text-[#07152B]' : 'text-[#64748B]',
                ]"
                >Mensual</span
              >
              <ToggleSwitch v-model="facturacionAnual" />
              <span
                :class="[
                  'text-sm font-bold',
                  facturacionAnual ? 'text-[#07152B]' : 'text-[#64748B]',
                ]"
                >Anual</span
              >
            </label>
          </div>
          <p v-if="ahorroAnual" class="mt-4 text-sm font-bold text-teal-700">
            {{ ahorroAnual }}
          </p>

          <div v-if="cargando" class="mt-10 grid gap-5 lg:grid-cols-3">
            <Skeleton v-for="item in 3" :key="item" class="h-[620px] w-full" />
          </div>
          <div v-else class="mt-10 grid items-stretch gap-5 lg:grid-cols-3">
            <article
              v-for="plan in planesEmpresariales"
              :key="plan.id"
              class="relative flex flex-col border bg-white transition duration-300 hover:-translate-y-1 hover:shadow-[0_26px_60px_-38px_rgba(7,31,82,.75)]"
              :class="
                plan.recomendado
                  ? 'border-[#0B3A78] ring-2 ring-[#0B3A78]'
                  : 'border-[#D7E0EC]'
              "
            >
              <div
                v-if="plan.recomendado"
                class="bg-[#0B3A78] px-5 py-2 text-center text-xs font-black uppercase tracking-[.18em] text-white"
              >
                Recomendado para crecer
              </div>
              <div class="flex flex-1 flex-col p-7 sm:p-8">
                <p
                  class="text-xs font-black uppercase tracking-[.18em] text-[#0B3A78]"
                >
                  Licencia empresarial
                </p>
                <h3 class="mt-3 text-3xl font-black">{{ plan.nombre }}</h3>
                <p class="mt-4 min-h-20 leading-7 text-[#64748B]">
                  {{ plan.descripcion }}
                </p>

                <div class="mt-6 border-y border-[#E8EDF5] py-6">
                  <template v-if="precio(plan) !== null">
                    <div class="flex items-end gap-2">
                      <strong class="text-4xl font-black"
                        >S/ {{ precio(plan)?.toLocaleString("es-PE") }}</strong
                      >
                      <span class="pb-1 text-sm text-[#64748B]">/mes</span>
                    </div>
                    <p class="mt-2 text-xs text-[#64748B]">
                      Sin IGV · facturación
                      {{ facturacionAnual ? "anual" : "mensual" }}
                    </p>
                  </template>
                  <template v-else>
                    <strong class="text-4xl font-black">A medida</strong>
                    <p class="mt-2 text-xs text-[#64748B]">
                      Diseñamos capacidad, integración y soporte contigo.
                    </p>
                  </template>
                </div>

                <div class="mt-6 grid grid-cols-2 gap-3 text-sm">
                  <p class="flex items-center gap-2">
                    <UsersRound class="h-4 w-4 text-[#0B3A78]" />
                    {{ plan.usuarios }}
                  </p>
                  <p class="flex items-center gap-2">
                    <GraduationCap class="h-4 w-4 text-[#0B3A78]" />
                    {{ plan.docentes }}
                  </p>
                  <p class="flex items-center gap-2">
                    <ShieldCheck class="h-4 w-4 text-[#0B3A78]" />
                    {{ plan.cursos }}
                  </p>
                  <p class="flex items-center gap-2">
                    <Database class="h-4 w-4 text-[#0B3A78]" />
                    {{ plan.almacenamiento }}
                  </p>
                </div>

                <div class="mt-7 space-y-3">
                  <p
                    v-for="caracteristica in plan.caracteristicas"
                    :key="caracteristica"
                    class="flex items-start gap-3 text-sm leading-6"
                  >
                    <CheckCircle2 class="mt-1 h-4 w-4 shrink-0 text-teal-600" />
                    {{ caracteristica }}
                  </p>
                </div>

                <Button
                  class="mt-8 h-12 w-full rounded-none"
                  :class="
                    plan.recomendado
                      ? 'bg-[#0B3A78] text-white hover:bg-[#072D5E]'
                      : ''
                  "
                  :variant="plan.recomendado ? 'default' : 'outline'"
                  @click="seleccionarPlan(plan)"
                >
                  {{
                    plan.precioMensual === null
                      ? "Solicitar propuesta"
                      : "Elegir este plan"
                  }}
                  <ArrowRight class="h-4 w-4" />
                </Button>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section id="solicitud-plan" class="scroll-mt-24 bg-white py-20">
        <div
          class="mx-auto grid max-w-360 gap-10 px-5 lg:grid-cols-[.8fr_1.2fr] lg:px-8"
        >
          <div class="bg-[#07152B] p-8 text-white sm:p-10">
            <Building2 class="h-10 w-10 text-[#F5B400]" />
            <p
              class="mt-8 text-xs font-black uppercase tracking-[.2em] text-blue-200"
            >
              Solicitud empresarial
            </p>
            <h2 class="mt-3 text-4xl font-black">
              {{ planSeleccionado ? planSeleccionado.nombre : "Elige un plan" }}
            </h2>
            <p class="mt-5 leading-7 text-blue-100">
              Cuéntanos sobre tu organización. Nuestro equipo validará el
              alcance y preparará el acceso o la propuesta correspondiente.
            </p>
            <div class="mt-8 border-l-4 border-[#F5B400] bg-white/8 p-5">
              <p class="text-sm font-bold">No necesitas iniciar sesión.</p>
              <p class="mt-2 text-xs leading-5 text-blue-100">
                Esta solicitud es pública y no crea cargos automáticamente.
              </p>
            </div>
          </div>

          <div class="border border-[#D7E0EC] p-7 sm:p-10">
            <div
              v-if="solicitudEnviada"
              class="grid min-h-[440px] place-items-center text-center"
            >
              <div>
                <CheckCircle2 class="mx-auto h-14 w-14 text-teal-600" />
                <h3 class="mt-5 text-3xl font-black">Solicitud registrada</h3>
                <p class="mx-auto mt-4 max-w-lg leading-7 text-[#64748B]">
                  Recibimos la solicitud de {{ solicitud.organizacion }} para el
                  plan {{ planSeleccionado?.nombre }}. El equipo Tukuy se pondrá
                  en contacto con {{ solicitud.contacto }}.
                </p>
                <Button
                  class="mt-7 rounded-none"
                  variant="outline"
                  @click="solicitudEnviada = false"
                >
                  Editar información
                </Button>
              </div>
            </div>
            <form
              v-else
              class="grid gap-5 sm:grid-cols-2"
              @submit.prevent="enviarSolicitud"
            >
              <div class="sm:col-span-2">
                <h3 class="text-2xl font-black">Datos de la organización</h3>
                <p class="mt-2 text-sm text-[#64748B]">
                  Selecciona primero un plan y completa los datos de contacto.
                </p>
              </div>
              <label class="sm:col-span-2">
                <span
                  class="mb-2 block text-xs font-black uppercase tracking-wide text-[#52657A]"
                  >Organización *</span
                >
                <InputText
                  v-model="solicitud.organizacion"
                  class="w-full"
                  placeholder="Razón social o nombre comercial"
                />
              </label>
              <label>
                <span
                  class="mb-2 block text-xs font-black uppercase tracking-wide text-[#52657A]"
                  >RUC</span
                >
                <InputText
                  v-model="solicitud.ruc"
                  class="w-full"
                  maxlength="11"
                  placeholder="20123456789"
                />
              </label>
              <label>
                <span
                  class="mb-2 block text-xs font-black uppercase tracking-wide text-[#52657A]"
                  >Tipo de organización</span
                >
                <Select
                  v-model="solicitud.tipo"
                  :options="tiposOrganizacion"
                  class="w-full"
                />
              </label>
              <label>
                <span
                  class="mb-2 block text-xs font-black uppercase tracking-wide text-[#52657A]"
                  >Cantidad de colaboradores</span
                >
                <Select
                  v-model="solicitud.colaboradores"
                  :options="rangosColaboradores"
                  class="w-full"
                />
              </label>
              <label>
                <span
                  class="mb-2 block text-xs font-black uppercase tracking-wide text-[#52657A]"
                  >Persona de contacto *</span
                >
                <InputText
                  v-model="solicitud.contacto"
                  class="w-full"
                  placeholder="Nombres y apellidos"
                />
              </label>
              <label>
                <span
                  class="mb-2 block text-xs font-black uppercase tracking-wide text-[#52657A]"
                  >Correo corporativo *</span
                >
                <InputText
                  v-model="solicitud.correo"
                  type="email"
                  class="w-full"
                  placeholder="contacto@empresa.pe"
                />
              </label>
              <label>
                <span
                  class="mb-2 block text-xs font-black uppercase tracking-wide text-[#52657A]"
                  >Teléfono</span
                >
                <InputText
                  v-model="solicitud.telefono"
                  class="w-full"
                  placeholder="+51 999 999 999"
                />
              </label>
              <div class="sm:col-span-2">
                <Button
                  class="h-13 w-full rounded-none bg-[#F5B400] text-[#07152B] hover:bg-amber-400"
                  type="submit"
                  :disabled="
                    !planSeleccionado ||
                    !solicitud.organizacion ||
                    !solicitud.contacto ||
                    !solicitud.correo
                  "
                >
                  Enviar solicitud del plan
                  <ArrowRight class="h-4 w-4" />
                </Button>
              </div>
            </form>
          </div>
        </div>
      </section>
    </main>

    <SiteFooter variant="dark" />
  </div>
</template>
