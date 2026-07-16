<script setup lang="ts">
import {
  ArrowRight,
  CalendarDays,
  ImagePlus,
  LoaderCircle,
  MessageSquareText,
  PenLine,
  UsersRound,
} from "lucide-vue-next";
import { ref } from "vue";
import { useRouter } from "vue-router";

import { Button } from "@/components/ui/button";
import { useContextoSesion } from "@/composables/useContextoSesion";
import EsqueletoComunidad from "../components/EsqueletoComunidad.vue";
import TarjetaPublicacion from "../components/TarjetaPublicacion.vue";
import { useComunidad } from "../composables/useComunidad";
import type { TipoPublicacion } from "../types/comunidad.types";

const router = useRouter();
const { contextoActivo } = useContextoSesion();
const {
  publicacionesFiltradas,
  grupos,
  eventos,
  cargando,
  publicando,
  error,
  filtro,
  publicar,
  reaccionar,
  comentar,
} = useComunidad();

const contenido = ref("");
const tipo = ref<TipoPublicacion>("experiencia");

const filtros: { valor: TipoPublicacion | "todas"; etiqueta: string }[] = [
  { valor: "todas", etiqueta: "Todo" },
  { valor: "pregunta", etiqueta: "Preguntas" },
  { valor: "experiencia", etiqueta: "Experiencias" },
  { valor: "recurso", etiqueta: "Recursos" },
  { valor: "oportunidad", etiqueta: "Oportunidades" },
];

async function enviarPublicacion() {
  const texto = contenido.value.trim();
  if (!texto) return;
  await publicar(texto, tipo.value);
  contenido.value = "";
}
</script>

<template>
  <main>
    <section class="bg-[#07152B] text-white">
      <div class="mx-auto grid max-w-360 gap-10 px-5 py-12 lg:grid-cols-[1fr_420px] lg:px-8 lg:py-16">
        <div>
          <p class="text-xs font-black uppercase tracking-[.25em] text-accent">
            Comunidad profesional
          </p>
          <h1 class="mt-4 max-w-4xl text-4xl font-black leading-tight sm:text-6xl">
            Experiencia que circula, conecta y transforma
          </h1>
          <p class="mt-5 max-w-2xl text-base leading-7 text-blue-100">
            Estudiantes, docentes, especialistas y organizaciones conversan sobre
            problemas reales, conocimientos aplicables y oportunidades del sector.
          </p>
        </div>
        <div class="grid grid-cols-2 gap-px self-end bg-card/15">
          <div class="bg-primary p-5">
            <strong class="text-3xl font-black text-accent">2.9K</strong>
            <p class="mt-1 text-sm text-white/65">Miembros activos</p>
          </div>
          <div class="bg-primary p-5">
            <strong class="text-3xl font-black text-accent">86</strong>
            <p class="mt-1 text-sm text-white/65">Especialistas</p>
          </div>
        </div>
      </div>
    </section>

    <div class="mx-auto grid max-w-360 gap-7 px-5 py-10 lg:grid-cols-[minmax(0,1fr)_350px] lg:px-8 lg:py-14">
      <section>
        <form class="border border-border bg-card" @submit.prevent="enviarPublicacion">
          <div class="flex items-start gap-4 p-5 sm:p-6">
            <span class="grid h-11 w-11 shrink-0 place-items-center bg-primary font-black text-primary-foreground">
              CQ
            </span>
            <div class="flex-1">
              <p class="text-xs font-black uppercase tracking-wide text-primary">
                Publicando como {{ contextoActivo?.portal ?? "perfil personal" }}
              </p>
              <textarea
                v-model="contenido"
                class="mt-3 min-h-28 w-full resize-y border-0 bg-transparent text-base leading-7 outline-none placeholder:text-muted-foreground"
                placeholder="Comparte una pregunta, experiencia o recurso útil para el sector..."
              />
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-3 border-t border-border px-5 py-3">
            <select
              v-model="tipo"
              class="h-9 border border-border bg-card px-3 text-xs font-bold"
            >
              <option value="experiencia">Experiencia</option>
              <option value="pregunta">Pregunta</option>
              <option value="recurso">Recurso</option>
              <option value="oportunidad">Oportunidad</option>
              <option value="logro">Logro</option>
            </select>
            <Button variant="ghost" size="sm" disabled>
              <ImagePlus class="h-4 w-4" />
              Imagen
            </Button>
            <Button class="ml-auto bg-primary text-white" :disabled="!contenido.trim() || publicando">
              <LoaderCircle v-if="publicando" class="h-4 w-4 animate-spin" />
              <PenLine v-else class="h-4 w-4" />
              Publicar
            </Button>
          </div>
        </form>

        <div class="mt-6 flex gap-2 overflow-x-auto border-b border-border pb-3">
          <button
            v-for="item in filtros"
            :key="item.valor"
            type="button"
            class="shrink-0 border px-4 py-2 text-xs font-black transition"
            :class="
              filtro === item.valor
                ? 'border-primary bg-primary text-white'
                : 'border-border bg-card text-muted-foreground'
            "
            @click="filtro = item.valor"
          >
            {{ item.etiqueta }}
          </button>
        </div>

        <EsqueletoComunidad v-if="cargando" class="mt-6" />
        <div v-else-if="error" class="mt-6 border border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/30 p-5 text-red-800 dark:text-red-300">
          {{ error }}
        </div>
        <div v-else class="mt-6 grid gap-5">
          <TarjetaPublicacion
            v-for="publicacion in publicacionesFiltradas"
            :key="publicacion.id"
            :publicacion="publicacion"
            @reaccionar="reaccionar"
            @comentar="comentar"
            @abrir="router.push(`/comunidad/publicaciones/${$event}`)"
          />
        </div>
      </section>

      <aside class="grid content-start gap-5">
        <section class="border-t-4 border-accent bg-card p-6">
          <div class="flex items-center justify-between">
            <h2 class="flex items-center gap-2 font-black">
              <UsersRound class="h-5 w-5 text-primary" />
              Grupos para ti
            </h2>
            <button class="text-xs font-black text-primary" @click="router.push('/comunidad/grupos')">
              Ver todos
            </button>
          </div>
          <div class="mt-5 grid gap-4">
            <button
              v-for="grupo in grupos.slice(0, 3)"
              :key="grupo.id"
              type="button"
              class="flex items-center gap-3 text-left"
              @click="router.push('/comunidad/grupos')"
            >
              <img :src="grupo.imagen" :alt="grupo.nombre" class="h-12 w-12 object-cover" />
              <span class="min-w-0">
                <strong class="block truncate text-sm">{{ grupo.nombre }}</strong>
                <span class="text-xs text-muted-foreground">{{ grupo.integrantes }} miembros</span>
              </span>
            </button>
          </div>
        </section>

        <section class="bg-primary p-6 text-white">
          <h2 class="flex items-center gap-2 font-black">
            <CalendarDays class="h-5 w-5 text-accent" />
            Próximos encuentros
          </h2>
          <article v-if="eventos[0]" class="mt-5">
            <img :src="eventos[0].imagen" :alt="eventos[0].titulo" class="aspect-video w-full object-cover" />
            <p class="mt-4 text-xs font-black uppercase tracking-wide text-accent">
              {{ eventos[0].fecha }} · {{ eventos[0].hora }}
            </p>
            <h3 class="mt-2 text-lg font-black leading-6">{{ eventos[0].titulo }}</h3>
          </article>
          <Button class="mt-5 w-full bg-card text-primary" @click="router.push('/comunidad/eventos')">
            Ver eventos
            <ArrowRight class="h-4 w-4" />
          </Button>
        </section>

        <section class="border border-border bg-card p-6">
          <MessageSquareText class="h-6 w-6 text-primary" />
          <h2 class="mt-4 font-black">Una comunidad útil se cuida</h2>
          <p class="mt-2 text-sm leading-6 text-muted-foreground">
            Comparte experiencia comprobable, protege los datos de terceros y reporta contenido inapropiado.
          </p>
        </section>
      </aside>
    </div>
  </main>
</template>

