<script setup lang="ts">
import { ArrowLeft, Eye, EyeOff, LoaderCircle } from "lucide-vue-next";
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";

import { authService } from "@/api/services/auth.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/composables/useAuth";
import {
  detectarYMarcarRecuperacionClave,
  limpiarRecuperacionClave,
  marcarRecuperacionClave,
} from "@/lib/recuperacion-clave";
import { toast } from "@/lib/toast";

const router = useRouter();
const { restablecerClave, loading } = useAuth();

const password = ref("");
const confirmar = ref("");
const mostrarClave = ref(false);
const mostrarConfirmar = ref(false);
const listo = ref(false);
const enlaceInvalido = ref(false);

onMounted(async () => {
  detectarYMarcarRecuperacionClave();
  try {
    await authService.capturarSesionDesdeUrl();
    marcarRecuperacionClave();
    listo.value = true;
  } catch {
    limpiarRecuperacionClave();
    enlaceInvalido.value = true;
    toast.error("Enlace inválido o expirado.");
  }
});

async function irAlLogin() {
  limpiarRecuperacionClave();
  try {
    await authService.logout();
  } catch {
    // Si no hay sesión, igual volvemos al login.
  }
  await router.replace({ name: "login" });
}

async function handleSubmit() {
  if (password.value.trim().length < 8) {
    toast.error("La clave debe tener al menos 8 caracteres.");
    return;
  }
  if (password.value !== confirmar.value) {
    toast.error("Las claves no coinciden.");
    return;
  }
  try {
    await restablecerClave(password.value);
    toast.success("Clave actualizada.");
  } catch (causa) {
    toast.error(
      causa instanceof Error ? causa.message : "No se pudo actualizar la clave.",
    );
  }
}
</script>

<template>
  <main class="grid min-h-screen bg-[#111317] text-white lg:grid-cols-2">
    <section class="grid place-items-center px-6 py-10">
      <div class="w-full max-w-sm">
        <Button
          class="mb-8 border-white/10 bg-transparent text-white hover:bg-white/8"
          variant="outline"
          @click="irAlLogin"
        >
          <ArrowLeft class="h-4 w-4" />
          Ir al inicio de sesión
        </Button>

        <div class="grid gap-7">
          <div class="grid justify-items-center gap-3 text-center">
            <img
              class="h-12 w-auto object-contain"
              src="/img/iconoTukuyAcademy.png"
              alt="Tukuy Academy"
            />
            <div>
              <h1 class="text-3xl font-black tracking-normal">Nueva clave</h1>
              <p class="mt-3 text-sm text-slate-400">
                Elige una clave nueva para tu cuenta de Tukuy Academy
              </p>
            </div>
          </div>

          <div v-if="enlaceInvalido" class="grid gap-4 text-center">
            <p class="text-sm text-slate-400">
              Solicita un enlace nuevo desde el inicio de sesión.
            </p>
            <Button
              class="h-11 bg-blue-600 text-white hover:bg-blue-700"
              @click="irAlLogin"
            >
              Volver al inicio de sesión
            </Button>
          </div>

          <div
            v-else-if="!listo"
            class="grid justify-items-center gap-3 text-slate-400"
          >
            <LoaderCircle class="h-8 w-8 animate-spin text-blue-400" />
            <p class="text-sm">Validando el enlace de recuperación…</p>
          </div>

          <form v-else class="grid gap-5" @submit.prevent="handleSubmit">
            <div class="grid gap-2">
              <Label class="text-slate-400" for="password">Nueva clave</Label>
              <div class="relative">
                <Input
                  id="password"
                  v-model="password"
                  class="border-white/15 bg-black/30 pr-10 text-white placeholder:text-slate-500 focus-visible:ring-blue-500"
                  placeholder="Mínimo 8 caracteres"
                  :type="mostrarClave ? 'text' : 'password'"
                  autocomplete="new-password"
                  required
                />
                <button
                  type="button"
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  :aria-label="mostrarClave ? 'Ocultar clave' : 'Mostrar clave'"
                  @click="mostrarClave = !mostrarClave"
                >
                  <Eye v-if="!mostrarClave" class="h-4 w-4" />
                  <EyeOff v-else class="h-4 w-4" />
                </button>
              </div>
            </div>

            <div class="grid gap-2">
              <Label class="text-slate-400" for="confirmar">Confirmar clave</Label>
              <div class="relative">
                <Input
                  id="confirmar"
                  v-model="confirmar"
                  class="border-white/15 bg-black/30 pr-10 text-white placeholder:text-slate-500 focus-visible:ring-blue-500"
                  placeholder="Repite la clave"
                  :type="mostrarConfirmar ? 'text' : 'password'"
                  autocomplete="new-password"
                  required
                />
                <button
                  type="button"
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  :aria-label="
                    mostrarConfirmar ? 'Ocultar confirmación' : 'Mostrar confirmación'
                  "
                  @click="mostrarConfirmar = !mostrarConfirmar"
                >
                  <Eye v-if="!mostrarConfirmar" class="h-4 w-4" />
                  <EyeOff v-else class="h-4 w-4" />
                </button>
              </div>
            </div>

            <Button
              class="h-11 bg-blue-600 text-white hover:bg-blue-700"
              type="submit"
              :disabled="loading"
            >
              {{ loading ? "Guardando..." : "Guardar clave nueva" }}
            </Button>
          </form>
        </div>
      </div>
    </section>

    <section class="relative hidden min-h-screen overflow-hidden lg:block">
      <img
        class="absolute inset-0 h-full w-full object-cover object-left"
        src="/img/tukuyAcademyLogin.png"
        alt="Profesional de Tukuy Academy en su espacio de trabajo"
      />
      <img
        class="absolute left-8 top-8 z-10 h-auto w-44 object-contain sm:w-52 lg:left-10 lg:top-0 lg:w-80"
        src="/img/logotukuyAcademyF.png"
        alt="Tukuy Academy"
      />
    </section>
  </main>
</template>
