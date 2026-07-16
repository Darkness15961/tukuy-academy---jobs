<script setup lang="ts">
import {
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  Search,
  SlidersHorizontal,
  Sparkles,
} from "lucide-vue-next";
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useContextoSesion } from "@/composables/useContextoSesion";
import EsqueletoBolsaTukuy from "../components/EsqueletoBolsaTukuy.vue";
import TarjetaVacante from "../components/TarjetaVacante.vue";
import { useVacantes } from "../composables/useVacantes";
import { vacantesService } from "../services/vacantes.service";

const router = useRouter();
const { contextoActivo, tienePermiso } = useContextoSesion();
const {
  filtradas,
  recomendadas,
  cargando,
  error,
  busqueda,
  modalidad,
  soloCompatibles,
  recargar,
} = useVacantes();

const postuladas = ref(new Set<string>());
const postulando = ref<string | null>(null);

onMounted(async () => {
  const lista = await vacantesService.obtenerPostulaciones();
  postuladas.value = new Set(lista.map((item) => item.vacanteId));
});

async function postular(vacanteId: string) {
  postulando.value = vacanteId;
  try {
    await vacantesService.postular(vacanteId);
    postuladas.value = new Set([...postuladas.value, vacanteId]);
  } finally {
    postulando.value = null;
  }
}
</script>

<template>
  <main>
    <section class="relative overflow-hidden bg-[#07152B] text-white">
      <img
        src="https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&w=1920&q=88"
        alt=""
        class="absolute inset-0 h-full w-full object-cover"
        aria-hidden="true"
      />
      <div
        class="absolute inset-0 bg-linear-to-r from-[#07152B]/95 via-[#07152B]/78 to-[#0B3A78]/45"
      />
      <div
        class="absolute inset-0 bg-linear-to-t from-[#020817]/80 via-transparent to-[#07152B]/35"
      />
      <div class="relative mx-auto max-w-360 px-5 py-14 lg:px-8 lg:py-20">
        <div class="grid items-end gap-10 lg:grid-cols-[1fr_auto]">
          <div>
            <p class="text-xs font-black uppercase tracking-[.25em] text-accent">
              Empleabilidad conectada
            </p>
            <h1 class="mt-4 max-w-4xl text-4xl font-black leading-tight sm:text-6xl">
              Tu experiencia puede abrir la siguiente oportunidad
            </h1>
            <p class="mt-5 max-w-2xl text-base leading-7 text-white/80">
              Cursos, certificados y trayectoria profesional se convierten en una
              compatibilidad clara con vacantes reales del sector.
            </p>
          </div>
          <div class="flex flex-wrap gap-3">
            <Button
              class="bg-accent text-foreground hover:bg-amber-400"
              @click="router.push('/bolsa-tukuy/mis-postulaciones')"
            >
              Mis postulaciones
              <ArrowRight class="h-4 w-4" />
            </Button>
            <Button
              v-if="tienePermiso('vacantes.gestionar')"
              class="border-white/30 bg-transparent text-white hover:bg-card/10"
              variant="outline"
              @click="router.push('/bolsa-tukuy/gestion')"
            >
              Gestionar vacantes
            </Button>
          </div>
        </div>

        <div class="mt-10 grid max-w-5xl gap-px bg-white/10 sm:grid-cols-3">
          <div class="bg-[#07152B]/75 p-5 backdrop-blur-sm">
            <strong class="text-3xl font-black text-accent">{{ filtradas.length }}</strong>
            <p class="mt-1 text-sm text-white/65">Vacantes disponibles</p>
          </div>
          <div class="bg-[#07152B]/75 p-5 backdrop-blur-sm">
            <strong class="text-3xl font-black text-accent">{{ recomendadas.length }}</strong>
            <p class="mt-1 text-sm text-white/65">Altamente compatibles</p>
          </div>
          <div class="bg-[#07152B]/75 p-5 backdrop-blur-sm">
            <strong class="text-lg font-black capitalize text-white">
              {{ contextoActivo?.portal ?? "personal" }}
            </strong>
            <p class="mt-1 text-sm text-white/65">Perfil usado para comparar</p>
          </div>
        </div>
      </div>
    </section>

    <EsqueletoBolsaTukuy v-if="cargando" />

    <section v-else class="mx-auto max-w-360 px-5 py-12 lg:px-8 lg:py-16">
      <div
        class="grid gap-4 border border-border bg-card p-5 lg:grid-cols-[minmax(0,1fr)_220px_auto]"
      >
        <label class="relative block">
          <Search class="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            v-model="busqueda"
            class="h-12 pl-11"
            placeholder="Cargo, empresa, ubicación o competencia"
          />
        </label>
        <label class="relative">
          <SlidersHorizontal class="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <select
            v-model="modalidad"
            class="h-12 w-full appearance-none border border-border bg-card pl-11 pr-4 text-sm font-semibold"
          >
            <option value="todas">Todas las modalidades</option>
            <option value="Presencial">Presencial</option>
            <option value="Híbrido">Híbrido</option>
            <option value="Remoto">Remoto</option>
          </select>
        </label>
        <button
          type="button"
          class="flex h-12 items-center gap-2 border px-5 text-sm font-black transition"
          :class="
            soloCompatibles
              ? 'border-primary bg-primary text-white'
              : 'border-border text-muted-foreground'
          "
          @click="soloCompatibles = !soloCompatibles"
        >
          <Sparkles class="h-4 w-4" />
          Hechas para mí
        </button>
      </div>

      <div v-if="error" class="mt-6 border border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/30 p-5 text-red-800 dark:text-red-300">
        <p class="font-black">{{ error }}</p>
        <Button class="mt-3" variant="outline" @click="recargar">Reintentar</Button>
      </div>

      <div class="mt-10 flex items-end justify-between gap-5">
        <div>
          <p class="text-xs font-black uppercase tracking-[.2em] text-primary">
            Oportunidades activas
          </p>
          <h2 class="mt-2 text-3xl font-black">Vacantes para explorar</h2>
        </div>
        <span class="text-sm font-bold text-muted-foreground">
          {{ filtradas.length }} resultados
        </span>
      </div>

      <div v-if="filtradas.length" class="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <TarjetaVacante
          v-for="vacante in filtradas"
          :key="vacante.id"
          :vacante="vacante"
          :postulada="postuladas.has(vacante.id) || postulando === vacante.id"
          @ver="router.push(`/bolsa-tukuy/vacantes/${$event}`)"
          @postular="postular"
        />
      </div>

      <div v-else class="mt-7 border border-border bg-card p-12 text-center">
        <BriefcaseBusiness class="mx-auto h-10 w-10 text-primary" />
        <h3 class="mt-5 text-2xl font-black">No encontramos coincidencias</h3>
        <p class="mt-2 text-muted-foreground">Prueba con otro término o elimina un filtro.</p>
      </div>

      <div class="mt-14 grid gap-4 bg-primary p-7 text-white md:grid-cols-[auto_1fr_auto] md:items-center">
        <span class="grid h-12 w-12 place-items-center bg-accent text-foreground">
          <CheckCircle2 class="h-6 w-6" />
        </span>
        <div>
          <h3 class="text-xl font-black">Mejora tu compatibilidad profesional</h3>
          <p class="mt-1 text-sm text-blue-100">
            Completa tu perfil, incorpora certificados y registra experiencia verificable.
          </p>
        </div>
        <Button class="bg-card text-primary" @click="router.push('/tukuy-academy/perfil')">
          Revisar mi perfil
        </Button>
      </div>
    </section>
  </main>
</template>

