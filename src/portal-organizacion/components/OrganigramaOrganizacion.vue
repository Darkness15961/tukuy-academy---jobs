<script setup lang="ts">
import { nextTick, ref } from "vue";
import {
  Building2,
  Maximize2,
  Minus,
  Plus,
  Scan,
} from "lucide-vue-next";

import NodoOrganigrama from "./NodoOrganigrama.vue";
import type { NodoOrganigramaEntidad } from "./NodoOrganigrama.vue";

withDefaults(
  defineProps<{
    nombreEntidad: string;
    logoEntidad?: string;
    nodos: NodoOrganigramaEntidad[];
  }>(),
  {
    logoEntidad: "",
  },
);

const emit = defineEmits<{
  seleccionar: [nodo: NodoOrganigramaEntidad];
  agregarSubnivel: [nodo: NodoOrganigramaEntidad];
  agregarMismoNivel: [
    nodo: NodoOrganigramaEntidad,
    lado: "IZQUIERDA" | "DERECHA",
  ];
}>();

const viewport = ref<HTMLElement | null>(null);
const lienzo = ref<HTMLElement | null>(null);
const escala = ref(1);

const ESCALA_MINIMA = 0.45;
const ESCALA_MAXIMA = 1.4;
const PASO_ESCALA = 0.1;

function limitarEscala(valor: number) {
  return Math.min(ESCALA_MAXIMA, Math.max(ESCALA_MINIMA, valor));
}

function cambiarEscala(incremento: number) {
  escala.value = limitarEscala(
    Number((escala.value + incremento).toFixed(2)),
  );
}

function restablecerEscala() {
  escala.value = 1;
  nextTick(() => viewport.value?.scrollTo({ left: 0, behavior: "smooth" }));
}

async function ajustarAlDiagrama() {
  escala.value = 1;
  await nextTick();

  if (!viewport.value || !lienzo.value) return;

  const anchoDisponible = Math.max(viewport.value.clientWidth - 16, 1);
  const anchoDiagrama = Math.max(lienzo.value.scrollWidth, 1);
  escala.value = limitarEscala(
    Number(Math.min(1, anchoDisponible / anchoDiagrama).toFixed(2)),
  );

  await nextTick();
  viewport.value.scrollTo({ left: 0, behavior: "smooth" });
}
</script>

<template>
  <div class="organigrama-contenedor">
    <div class="organigrama-aviso">
      <span>
        <Maximize2 class="h-4 w-4" />Desplázate horizontalmente para explorar
        toda la estructura
      </span>
      <div
        class="organigrama-controles"
        aria-label="Controles de escala del organigrama"
      >
        <button
          type="button"
          aria-label="Alejar organigrama"
          title="Alejar"
          :disabled="escala <= ESCALA_MINIMA"
          @click="cambiarEscala(-PASO_ESCALA)"
        >
          <Minus class="h-4 w-4" />
        </button>
        <output :aria-label="`Escala ${Math.round(escala * 100)} por ciento`">
          {{ Math.round(escala * 100) }}%
        </output>
        <button
          type="button"
          aria-label="Acercar organigrama"
          title="Acercar"
          :disabled="escala >= ESCALA_MAXIMA"
          @click="cambiarEscala(PASO_ESCALA)"
        >
          <Plus class="h-4 w-4" />
        </button>
        <button
          type="button"
          class="control-ajustar"
          aria-label="Ajustar el organigrama al espacio disponible"
          title="Ajustar al diagrama"
          @click="ajustarAlDiagrama"
        >
          <Scan class="h-4 w-4" />
          Ajustar
        </button>
        <button
          type="button"
          class="control-restablecer"
          title="Restablecer al 100%"
          @click="restablecerEscala"
        >
          100%
        </button>
      </div>
    </div>

    <div ref="viewport" class="organigrama-viewport">
      <div ref="lienzo" class="organigrama-lienzo" :style="{ zoom: escala }">
        <div class="entidad-raiz">
          <span class="entidad-marca">
            <img
              v-if="logoEntidad"
              :src="logoEntidad"
              :alt="nombreEntidad"
              class="entidad-logo"
            />
            <Building2 v-else class="h-5 w-5" />
          </span>
          <div>
            <small>Entidad</small>
            <strong>{{ nombreEntidad || "Organización" }}</strong>
          </div>
        </div>

        <ul v-if="nodos.length" class="organigrama-raices">
          <NodoOrganigrama
            v-for="nodo in nodos"
            :key="nodo.id"
            :nodo="nodo"
            @seleccionar="emit('seleccionar', $event)"
            @agregar-subnivel="emit('agregarSubnivel', $event)"
            @agregar-mismo-nivel="
              (nodoHermano, lado) =>
                emit('agregarMismoNivel', nodoHermano, lado)
            "
          />
        </ul>
        <p v-else class="py-10 text-center text-sm text-muted-foreground">
          Agrega la primera unidad para generar el organigrama.
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.organigrama-contenedor {
  min-width: 0;
  overflow: hidden;
  background:
    linear-gradient(
      color-mix(in srgb, var(--color-primary) 6%, transparent) 1px,
      transparent 1px
    ),
    linear-gradient(
      90deg,
      color-mix(in srgb, var(--color-primary) 6%, transparent) 1px,
      transparent 1px
    ),
    var(--color-background);
  background-size: 28px 28px;
}

.organigrama-aviso {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 0.75rem 1.25rem;
  border-bottom: 1px solid var(--color-border);
  background: color-mix(in srgb, var(--color-card) 92%, transparent);
  padding: 0.65rem 1rem;
}

.organigrama-controles {
  display: flex;
  align-items: center;
  border: 1px solid var(--color-border);
  background: var(--color-background);
}

.organigrama-controles button,
.organigrama-controles output {
  display: grid;
  min-width: 2.25rem;
  height: 2.25rem;
  place-items: center;
  border-right: 1px solid var(--color-border);
  color: var(--color-foreground);
  font-size: 0.7rem;
  font-weight: 800;
}

.organigrama-controles button {
  transition: background-color 160ms ease, color 160ms ease;
}

.organigrama-controles button:hover:not(:disabled),
.organigrama-controles button:focus-visible {
  background: var(--color-primary);
  color: var(--color-primary-foreground);
  outline: none;
}

.organigrama-controles button:disabled {
  cursor: not-allowed;
  opacity: 0.35;
}

.organigrama-controles .control-ajustar {
  display: flex;
  min-width: auto;
  gap: 0.4rem;
  padding: 0 0.75rem;
}

.organigrama-controles .control-restablecer {
  border-right: 0;
  padding: 0 0.6rem;
}

.organigrama-aviso span {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  color: var(--color-muted-foreground);
  font-size: 0.68rem;
  font-weight: 700;
}

.organigrama-viewport {
  width: 100%;
  min-width: 0;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-color: var(--color-primary)
    color-mix(in srgb, var(--color-muted) 80%, transparent);
  scrollbar-width: auto;
}

.organigrama-viewport::-webkit-scrollbar {
  height: 14px;
}

.organigrama-viewport::-webkit-scrollbar-track {
  background: color-mix(in srgb, var(--color-muted) 80%, transparent);
}

.organigrama-viewport::-webkit-scrollbar-thumb {
  border: 3px solid color-mix(in srgb, var(--color-muted) 80%, transparent);
  border-radius: 0;
  background: var(--color-primary);
}

.organigrama-lienzo {
  width: max-content;
  min-width: max-content;
  padding: 2rem 2.5rem 3rem;
}

.entidad-raiz {
  display: flex;
  width: min(22rem, 80vw);
  margin: 0 auto;
  align-items: center;
  gap: 0.85rem;
  border-top: 4px solid var(--color-accent);
  background: var(--color-primary);
  padding: 1rem 1.15rem;
  color: var(--color-primary-foreground);
  text-align: left;
  box-shadow: 0 18px 35px rgb(3 36 78 / 18%);
}

.entidad-marca {
  display: grid;
  width: 2.75rem;
  height: 2.75rem;
  flex: none;
  place-items: center;
  overflow: hidden;
  background: var(--color-accent);
  color: #082f66;
}

.entidad-logo {
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #fff;
  padding: 0.2rem;
}

.entidad-raiz small,
.entidad-raiz strong {
  display: block;
}

.entidad-raiz small {
  color: rgb(255 255 255 / 70%);
  font-size: 0.62rem;
  font-weight: 900;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.entidad-raiz strong {
  margin-top: 0.2rem;
  font-size: 0.88rem;
  line-height: 1.25;
  font-weight: 900;
}

.organigrama-raices {
  position: relative;
  display: flex;
  justify-content: center;
  margin: 0;
  list-style: none;
  padding: 2rem 0 0;
}

.organigrama-raices::before {
  position: absolute;
  top: 0;
  left: 50%;
  width: 0;
  height: 2rem;
  border-left: 2px solid color-mix(in srgb, var(--color-primary) 55%, #94a3b8);
  content: "";
  transform: translateX(-50%);
}
</style>
