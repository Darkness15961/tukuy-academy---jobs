<script setup lang="ts">
import { ArrowLeft } from "lucide-vue-next";
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/composables/useAuth";

const router = useRouter();
const route = useRoute();
const { login, loginConGoogle, solicitarRecuperacionClave, loading, error } =
  useAuth();

const correo = ref("");
const password = ref("");
const remember = ref(false);
const mensajeInfo = ref<string | null>(null);

const destinoContinuar = computed(() =>
  typeof route.query.continuar === "string" ? route.query.continuar : undefined,
);

async function handleSubmit() {
  mensajeInfo.value = null;
  try {
    await login(correo.value, password.value, destinoContinuar.value);
  } catch {
    // error handled in composable
  }
}

async function handleGoogle() {
  mensajeInfo.value = null;
  try {
    await loginConGoogle(destinoContinuar.value);
  } catch {
    // error handled in composable
  }
}

async function handleOlvidoClave() {
  mensajeInfo.value = null;
  try {
    await solicitarRecuperacionClave(correo.value);
    mensajeInfo.value =
      "Si el correo existe, te enviamos un enlace para restablecer tu clave.";
  } catch {
    // error handled in composable
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
          @click="router.push('/')"
        >
          <ArrowLeft class="h-4 w-4" />
          Ir Inicio
        </Button>

        <div class="grid gap-7">
          <div class="grid justify-items-center gap-3 text-center">
            <img
              class="h-12 w-auto object-contain"
              src="/img/iconoTukuyAcademy.png"
              alt="Tukuy Academy"
            />
            <div>
              <h1 class="text-3xl font-black tracking-normal">
                Bienvenido de nuevo
              </h1>
              <p class="mt-3 text-sm text-slate-400">
                Ingresa tu correo y clave para continuar
              </p>
            </div>
          </div>

          <form class="grid gap-5" @submit.prevent="handleSubmit">
            <div class="grid gap-2">
              <Label class="text-slate-400" for="correo">Correo</Label>
              <Input
                id="correo"
                v-model="correo"
                class="border-white/15 bg-black/30 text-white placeholder:text-slate-500 focus-visible:ring-blue-500"
                placeholder="correo@empresa.com"
                type="email"
                inputmode="email"
                autocomplete="username"
                required
              />
            </div>

            <div class="grid gap-2">
              <Label class="text-slate-400" for="password">Clave</Label>
              <Input
                id="password"
                v-model="password"
                class="border-white/15 bg-black/30 text-white placeholder:text-slate-500 focus-visible:ring-blue-500"
                placeholder="Contraseña"
                type="password"
                autocomplete="current-password"
                required
              />
            </div>

            <div class="flex items-center justify-between text-xs">
              <label class="flex items-center gap-2 text-slate-300">
                <Checkbox
                  id="remember"
                  v-model="remember"
                  class="border-white/30 data-[state=checked]:bg-blue-600"
                />
                <Label
                  class="cursor-pointer font-normal text-slate-300"
                  for="remember"
                  >Recuérdame</Label
                >
              </label>
              <Button
                class="h-auto p-0 text-blue-400 hover:text-blue-300"
                variant="link"
                type="button"
                :disabled="loading"
                @click="handleOlvidoClave"
              >
                ¿Olvidaste tu clave?
              </Button>
            </div>

            <p v-if="error" class="text-sm text-red-400">{{ error }}</p>
            <p v-else-if="mensajeInfo" class="text-sm text-emerald-400">
              {{ mensajeInfo }}
            </p>

            <Button
              class="h-11 bg-blue-600 text-white hover:bg-blue-700"
              type="submit"
              :disabled="loading"
            >
              {{ loading ? "Ingresando..." : "Iniciar Sesión" }}
            </Button>

            <div class="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
              <Separator class="bg-white/10" />
              <span class="text-xs text-slate-500">O</span>
              <Separator class="bg-white/10" />
            </div>

            <Button
              class="border-white/20 bg-white text-slate-800 hover:bg-slate-100"
              variant="outline"
              type="button"
              :disabled="loading"
              @click="handleGoogle"
            >
              <!-- Logo G oficial Google Identity (viewBox 48×48) -->
              <svg
                class="h-5 w-5 shrink-0"
                viewBox="0 0 48 48"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  fill="#EA4335"
                  d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                />
                <path
                  fill="#4285F4"
                  d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                />
                <path
                  fill="#FBBC05"
                  d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                />
                <path
                  fill="#34A853"
                  d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                />
              </svg>
              Iniciar con Google
            </Button>
          </form>

          <p class="text-center text-sm text-slate-400">
            ¿No tienes cuenta?
            <button
              class="font-bold text-blue-400 hover:text-blue-300"
              type="button"
              @click="
                router.push({
                  path: '/registro',
                  query: destinoContinuar
                    ? { continuar: destinoContinuar }
                    : undefined,
                })
              "
            >
              Regístrate
            </button>
          </p>

          <div class="grid gap-1 text-center text-xs text-slate-500">
            <span>© Tukuy Academy · Ver. 07.06</span>
            <span>Soporte: 910104133 · 930132386 · 974977988 · 930804475</span>
          </div>
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
