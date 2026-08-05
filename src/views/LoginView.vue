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
import {
  CLAVE_DEMO_COMUN,
  RESUMEN_CUENTAS_DEMO,
} from "@/data/cuentas-demo.mock";
import { env } from "@/lib/env";

const router = useRouter();
const route = useRoute();
const { login, loginConGoogle, loading, error } = useAuth();

const dni = ref("");
const password = ref("");
const remember = ref(false);
const mostrarCuentasDemo = ref(false);

const destinoContinuar = computed(() =>
  typeof route.query.continuar === "string" ? route.query.continuar : undefined,
);

function usarCuentaDemo(alias: string) {
  dni.value = alias;
  password.value = CLAVE_DEMO_COMUN;
}

async function handleSubmit() {
  try {
    await login(dni.value, password.value, destinoContinuar.value);
  } catch {
    // error handled in composable
  }
}

async function handleGoogle() {
  try {
    await loginConGoogle(destinoContinuar.value);
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
              <Label class="text-slate-400" for="dni">Correo</Label>
              <Input
                id="dni"
                v-model="dni"
                class="border-white/15 bg-black/30 text-white placeholder:text-slate-500 focus-visible:ring-blue-500"
                placeholder="correo o alias (ej. alumno)"
                autocomplete="username"
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
              >
                ¿Olvidaste tu clave?
              </Button>
            </div>

            <p v-if="error" class="text-sm text-red-400">{{ error }}</p>

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
              class="border-white/15 bg-transparent text-slate-200 hover:bg-white/8"
              variant="outline"
              type="button"
              :disabled="loading"
              @click="handleGoogle"
            >
              <svg class="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#EA4335"
                  d="M12 10.2v3.6h5.1c-.2 1.2-.9 2.2-1.9 2.9l3.1 2.4c1.8-1.7 2.9-4.1 2.9-7 0-.7-.1-1.3-.2-1.9H12z"
                />
                <path
                  fill="#34A853"
                  d="M6.6 14.3l-.7.5-2.4 1.9C5.1 19.5 8.3 21.5 12 21.5c2.7 0 4.9-.9 6.5-2.4l-3.1-2.4c-.9.6-2 1-3.4 1-2.6 0-4.8-1.7-5.6-4.1z"
                />
                <path
                  fill="#4A90E2"
                  d="M3.5 7.3C2.9 8.5 2.5 9.9 2.5 11.5s.4 3 1 4.2l3.1-2.4c-.2-.6-.3-1.2-.3-1.8 0-.6.1-1.2.3-1.8L3.5 7.3z"
                />
                <path
                  fill="#FBBC05"
                  d="M12 5.3c1.5 0 2.8.5 3.8 1.5l2.8-2.8C17 2.4 14.7 1.5 12 1.5 8.3 1.5 5.1 3.5 3.5 7.3l3.1 2.4C7.2 7 9.4 5.3 12 5.3z"
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

          <div
            v-if="env.useMock"
            class="grid gap-2 rounded-lg border border-white/10 bg-black/20 p-3 text-left text-xs text-slate-400"
          >
            <div class="flex items-center justify-between gap-2">
              <p class="font-medium text-slate-300">
                Cuentas demo · clave {{ CLAVE_DEMO_COMUN }}
              </p>
              <button
                class="shrink-0 text-blue-400 hover:text-blue-300"
                type="button"
                @click="mostrarCuentasDemo = !mostrarCuentasDemo"
              >
                {{ mostrarCuentasDemo ? "Ocultar" : "Ver lista" }}
              </button>
            </div>
            <ul
              v-if="mostrarCuentasDemo"
              class="grid max-h-48 gap-1.5 overflow-y-auto pr-1"
            >
              <li v-for="cuenta in RESUMEN_CUENTAS_DEMO" :key="cuenta.alias">
                <button
                  class="w-full rounded-md px-2 py-1.5 text-left transition hover:bg-white/8"
                  type="button"
                  @click="usarCuentaDemo(cuenta.alias)"
                >
                  <span class="font-mono text-blue-300">{{ cuenta.alias }}</span>
                  <span class="mt-0.5 block text-[11px] leading-snug text-slate-500">
                    {{ cuenta.etiqueta }}
                  </span>
                </button>
              </li>
            </ul>
            <p v-else class="text-[11px] leading-snug text-slate-500">
              Ej.: admin, tukuy, direccion, docente, alumno, alumnocip…
            </p>
          </div>

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
