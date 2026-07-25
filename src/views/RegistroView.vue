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
const { registrar, loginConGoogle, loading, error } = useAuth();

const nombre = ref("");
const apellidos = ref("");
const correo = ref("");
const telefono = ref("");
const password = ref("");
const confirmar = ref("");
const aceptaTerminos = ref(false);
const errorLocal = ref<string | null>(null);

const destinoContinuar = computed(() =>
  typeof route.query.continuar === "string" ? route.query.continuar : undefined,
);

const mensajeError = computed(() => errorLocal.value ?? error.value);

async function handleSubmit() {
  errorLocal.value = null;
  if (!aceptaTerminos.value) {
    errorLocal.value = "Debes aceptar los términos para continuar";
    return;
  }
  if (password.value !== confirmar.value) {
    errorLocal.value = "Las claves no coinciden";
    return;
  }
  try {
    await registrar(
      {
        nombre: nombre.value,
        apellidos: apellidos.value,
        correo: correo.value,
        password: password.value,
        telefono: telefono.value || undefined,
      },
      destinoContinuar.value,
    );
  } catch {
    // error en composable
  }
}

async function handleGoogle() {
  errorLocal.value = null;
  try {
    await loginConGoogle(destinoContinuar.value);
  } catch {
    // error en composable
  }
}
</script>

<template>
  <main class="grid min-h-screen bg-[#111317] text-white lg:grid-cols-2">
    <section class="grid place-items-center px-6 py-10">
      <div class="w-full max-w-md">
        <Button
          class="mb-8 border-white/10 bg-transparent text-white hover:bg-white/8"
          variant="outline"
          @click="router.push('/')"
        >
          <ArrowLeft class="h-4 w-4" />
          Ir Inicio
        </Button>

        <div class="grid gap-6">
          <div class="grid justify-items-center gap-3 text-center">
            <img
              class="h-12 w-auto object-contain"
              src="/img/iconoTukuyAcademy.png"
              alt="Tukuy Academy"
            />
            <div>
              <h1 class="text-3xl font-black tracking-normal">Crear cuenta</h1>
              <p class="mt-3 text-sm text-slate-400">
                Regístrate para aprender, postular y unirte a la comunidad
              </p>
            </div>
          </div>

          <form class="grid gap-4" @submit.prevent="handleSubmit">
            <div class="grid gap-4 sm:grid-cols-2">
              <div class="grid gap-2">
                <Label class="text-slate-400" for="nombre">Nombre</Label>
                <Input
                  id="nombre"
                  v-model="nombre"
                  class="border-white/15 bg-black/30 text-white placeholder:text-slate-500 focus-visible:ring-blue-500"
                  placeholder="María"
                  autocomplete="given-name"
                  required
                />
              </div>
              <div class="grid gap-2">
                <Label class="text-slate-400" for="apellidos">Apellidos</Label>
                <Input
                  id="apellidos"
                  v-model="apellidos"
                  class="border-white/15 bg-black/30 text-white placeholder:text-slate-500 focus-visible:ring-blue-500"
                  placeholder="Quispe Rojas"
                  autocomplete="family-name"
                  required
                />
              </div>
            </div>

            <div class="grid gap-2">
              <Label class="text-slate-400" for="correo">Correo</Label>
              <Input
                id="correo"
                v-model="correo"
                type="email"
                class="border-white/15 bg-black/30 text-white placeholder:text-slate-500 focus-visible:ring-blue-500"
                placeholder="maria@correo.com"
                autocomplete="email"
                required
              />
            </div>

            <div class="grid gap-2">
              <Label class="text-slate-400" for="telefono">Teléfono</Label>
              <Input
                id="telefono"
                v-model="telefono"
                class="border-white/15 bg-black/30 text-white placeholder:text-slate-500 focus-visible:ring-blue-500"
                placeholder="999 000 000"
                autocomplete="tel"
              />
            </div>

            <div class="grid gap-4 sm:grid-cols-2">
              <div class="grid gap-2">
                <Label class="text-slate-400" for="password">Clave</Label>
                <Input
                  id="password"
                  v-model="password"
                  type="password"
                  class="border-white/15 bg-black/30 text-white placeholder:text-slate-500 focus-visible:ring-blue-500"
                  placeholder="Mínimo 6 caracteres"
                  autocomplete="new-password"
                  required
                />
              </div>
              <div class="grid gap-2">
                <Label class="text-slate-400" for="confirmar">Confirmar</Label>
                <Input
                  id="confirmar"
                  v-model="confirmar"
                  type="password"
                  class="border-white/15 bg-black/30 text-white placeholder:text-slate-500 focus-visible:ring-blue-500"
                  placeholder="Repite tu clave"
                  autocomplete="new-password"
                  required
                />
              </div>
            </div>

            <label class="flex items-start gap-2 text-xs text-slate-300">
              <Checkbox
                id="terminos"
                v-model="aceptaTerminos"
                class="mt-0.5 border-white/30 data-[state=checked]:bg-blue-600"
              />
              <span>
                Acepto los términos de uso y la política de privacidad de Tukuy
                Academy (demo).
              </span>
            </label>

            <p v-if="mensajeError" class="text-sm text-red-400">
              {{ mensajeError }}
            </p>

            <Button
              class="h-11 bg-blue-600 text-white hover:bg-blue-700"
              type="submit"
              :disabled="loading"
            >
              {{ loading ? "Creando cuenta..." : "Registrarme" }}
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
              Continuar con Google
            </Button>
          </form>

          <p class="text-center text-sm text-slate-400">
            ¿Ya tienes cuenta?
            <button
              class="font-bold text-blue-400 hover:text-blue-300"
              type="button"
              @click="
                router.push({
                  path: '/login',
                  query: destinoContinuar
                    ? { continuar: destinoContinuar }
                    : undefined,
                })
              "
            >
              Acceder
            </button>
          </p>

          <div class="grid gap-1 text-center text-xs text-slate-500">
            <span>Demo · la cuenta se guarda en tu navegador (localStorage)</span>
            <span>© Tukuy Academy</span>
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
