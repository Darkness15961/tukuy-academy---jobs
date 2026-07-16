<script setup lang="ts">
import { ArrowLeft, Mail } from "lucide-vue-next";
import { ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/composables/useAuth";
import { env } from "@/lib/env";

const router = useRouter();
const route = useRoute();
const { login, loading, error } = useAuth();

const dni = ref("");
const password = ref("");
const remember = ref(false);

async function handleSubmit() {
  try {
    const continuar =
      typeof route.query.continuar === "string"
        ? route.query.continuar
        : undefined;
    await login(dni.value, password.value, continuar);
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
                Ingresa tu usuario y clave para continuar
              </p>
            </div>
          </div>

          <form class="grid gap-5" @submit.prevent="handleSubmit">
            <div class="grid gap-2">
              <Label class="text-slate-400" for="dni">Usuario</Label>
              <Input
                id="dni"
                v-model="dni"
                class="border-white/15 bg-black/30 text-white placeholder:text-slate-500 focus-visible:ring-blue-500"
                placeholder="admin"
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
            >
              <Mail class="h-4 w-4" />
              Iniciar con Google
            </Button>
          </form>

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
