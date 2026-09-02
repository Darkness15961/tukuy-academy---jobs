<script setup lang="ts">
import { ChevronRight, LoaderCircle } from "lucide-vue-next";
import { onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { datosCertificadoService } from "@/api/services/datos-certificado.service";
import { onboardingAprendizajeService } from "@/api/services/onboarding-aprendizaje.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  guardarCertificadoPendiente,
  peekCertificadoPendiente,
} from "@/lib/solicitud-certificado";
import { toast } from "@/lib/toast";

const route = useRoute();
const router = useRouter();

const cargando = ref(true);
const guardando = ref(false);
const errorLocal = ref("");

const nombreCompleto = ref("");
const profesion = ref("");
const especialidad = ref("");
const telefono = ref("");
const ubicacion = ref("");
const fechaNacimiento = ref("");
const dni = ref("");

const cursoId = ref("");

onMounted(async () => {
  cursoId.value =
    String(route.query.cursoId ?? peekCertificadoPendiente() ?? "").trim();
  if (cursoId.value) {
    guardarCertificadoPendiente(cursoId.value);
  }

  try {
    const requiere = await datosCertificadoService.requiereCompletar();
    if (!requiere) {
      await continuarFlujoCertificado();
      return;
    }
    const datos = await datosCertificadoService.obtener();
    nombreCompleto.value = datos.nombreCompleto;
    profesion.value = datos.profesion;
    especialidad.value = datos.especialidad;
    telefono.value = datos.telefono;
    ubicacion.value = datos.ubicacion;
    fechaNacimiento.value = datos.fechaNacimiento;
    dni.value = datos.dni;
  } catch (causa) {
    errorLocal.value =
      causa instanceof Error
        ? causa.message
        : "No se pudo cargar tus datos.";
  } finally {
    cargando.value = false;
  }
});

async function continuarFlujoCertificado() {
  const id =
    cursoId.value ||
    String(route.query.cursoId ?? peekCertificadoPendiente() ?? "").trim();
  if (id) guardarCertificadoPendiente(id);

  const requiereEncuesta = await onboardingAprendizajeService.requiereOnboarding();
  if (requiereEncuesta && id) {
    await router.replace({
      name: "onboarding-aprendizaje",
      query: { motivo: "certificado", cursoId: id },
    });
    return;
  }

  if (id) {
    await router.replace({
      path: "/tukuy-academy/mi-aprendizaje",
      query: { certificado: id },
    });
    return;
  }

  await router.replace("/tukuy-academy/mi-aprendizaje");
}

async function guardarYContinuar() {
  errorLocal.value = "";
  guardando.value = true;
  try {
    await datosCertificadoService.guardar({
      nombreCompleto: nombreCompleto.value,
      profesion: profesion.value,
      especialidad: especialidad.value,
      telefono: telefono.value,
      ubicacion: ubicacion.value,
      fechaNacimiento: fechaNacimiento.value,
      dni: dni.value,
    });
    toast.success("Datos guardados. Continuamos con tu certificado…");
    await continuarFlujoCertificado();
  } catch (causa) {
    errorLocal.value =
      causa instanceof Error
        ? causa.message
        : "No se pudieron guardar tus datos.";
  } finally {
    guardando.value = false;
  }
}
</script>

<template>
  <main class="grid min-h-screen bg-[#111317] text-white lg:grid-cols-[1.05fr_0.95fr]">
    <section
      class="relative hidden overflow-hidden border-r border-white/10 lg:block"
    >
      <img
        src="/img/portal-estudiante.png"
        alt=""
        class="absolute inset-0 h-full w-full object-cover opacity-55"
      />
      <div
        class="absolute inset-0 bg-linear-to-t from-[#111317] via-[#111317]/70 to-[#111317]/30"
      />
      <div class="relative flex h-full flex-col justify-end p-10 xl:p-14">
        <p class="text-xs font-black uppercase tracking-[0.22em] text-[#F5B400]">
          Tu certificado
        </p>
        <h1 class="mt-3 max-w-md text-4xl font-black leading-tight xl:text-5xl">
          Confirma tus datos
        </h1>
        <p class="mt-4 max-w-md text-sm leading-6 text-white/70">
          El certificado se emitirá con tu nombre y profesión tal como los
          indiques aquí. Revísalos antes de continuar.
        </p>
      </div>
    </section>

    <section class="grid place-items-center px-5 py-10 sm:px-8">
      <div class="w-full max-w-xl">
        <div class="mb-8 flex items-center gap-3">
          <img
            class="h-10 w-auto"
            src="/img/iconoTukuyAcademy.png"
            alt="Tukuy Academy"
          />
          <div>
            <p class="text-xs font-bold uppercase tracking-[0.16em] text-white/50">
              Tukuy Academy
            </p>
            <p class="text-sm font-semibold text-white/80 lg:hidden">
              Confirma tus datos
            </p>
          </div>
        </div>

        <div
          v-if="cargando"
          class="grid place-items-center gap-3 py-24 text-white/70"
        >
          <LoaderCircle class="h-8 w-8 animate-spin text-[#F5B400]" />
          Un momento…
        </div>

        <form
          v-else
          class="grid gap-6"
          @submit.prevent="guardarYContinuar"
        >
          <div>
            <h2 class="text-3xl font-black leading-tight sm:text-4xl">
              Datos para tu certificado
            </h2>
            <p class="mt-3 text-base leading-7 text-white/65">
              Necesitamos tus datos reales para emitir el certificado: nombre,
              profesión, fecha de nacimiento y DNI. Los demás campos son
              opcionales pero ayudan a completar tu perfil.
            </p>
          </div>

          <label class="grid gap-2 text-sm font-semibold text-white/80">
            Nombre completo *
            <Input
              v-model="nombreCompleto"
              autocomplete="name"
              class="h-12 border-white/15 bg-white/5 text-white placeholder:text-white/35"
              placeholder="Ej. María Elena Quispe Flores"
              required
            />
            <span class="text-xs font-normal text-white/45">
              Nombre y apellidos, como deben aparecer en el certificado.
            </span>
          </label>

          <label class="grid gap-2 text-sm font-semibold text-white/80">
            Profesión u oficio *
            <Input
              v-model="profesion"
              autocomplete="organization-title"
              class="h-12 border-white/15 bg-white/5 text-white placeholder:text-white/35"
              placeholder="Ej. Ingeniero civil, técnico en obra, administrador"
              required
            />
          </label>

          <div class="grid gap-4 sm:grid-cols-2">
            <label class="grid gap-2 text-sm font-semibold text-white/80">
              DNI *
              <Input
                v-model="dni"
                inputmode="numeric"
                maxlength="8"
                autocomplete="off"
                class="h-12 border-white/15 bg-white/5 text-white placeholder:text-white/35"
                placeholder="8 dígitos"
                required
              />
            </label>
            <label class="grid gap-2 text-sm font-semibold text-white/80">
              Fecha de nacimiento *
              <Input
                v-model="fechaNacimiento"
                type="date"
                autocomplete="bday"
                class="h-12 border-white/15 bg-white/5 text-white placeholder:text-white/35 [color-scheme:dark]"
                required
              />
            </label>
          </div>

          <label class="grid gap-2 text-sm font-semibold text-white/80">
            Especialidad
            <Input
              v-model="especialidad"
              class="h-12 border-white/15 bg-white/5 text-white placeholder:text-white/35"
              placeholder="Ej. Gestión de obras, costos, almacén"
            />
          </label>

          <div class="grid gap-4 sm:grid-cols-2">
            <label class="grid gap-2 text-sm font-semibold text-white/80">
              Teléfono
              <Input
                v-model="telefono"
                autocomplete="tel"
                class="h-12 border-white/15 bg-white/5 text-white placeholder:text-white/35"
                placeholder="Ej. 987 654 321"
              />
            </label>
            <label class="grid gap-2 text-sm font-semibold text-white/80">
              Ciudad / ubicación
              <Input
                v-model="ubicacion"
                autocomplete="address-level2"
                class="h-12 border-white/15 bg-white/5 text-white placeholder:text-white/35"
                placeholder="Ej. Lima, Arequipa"
              />
            </label>
          </div>

          <p
            v-if="errorLocal"
            class="border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200"
            role="alert"
          >
            {{ errorLocal }}
          </p>

          <Button
            type="submit"
            class="h-12 w-full bg-[#F5B400] font-black text-[#111317] hover:bg-amber-300"
            :disabled="guardando"
          >
            {{ guardando ? "Guardando…" : "Continuar con mi certificado" }}
            <ChevronRight v-if="!guardando" class="h-4 w-4" />
          </Button>
        </form>
      </div>
    </section>
  </main>
</template>
