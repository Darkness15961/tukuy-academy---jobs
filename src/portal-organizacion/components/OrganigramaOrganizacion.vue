<script setup lang="ts">
import { nextTick, onMounted, ref } from "vue";
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
    nombreEstructura?: string;
    logoEntidad?: string;
    nodos: NodoOrganigramaEntidad[];
    niveles?: { id: string; nombre: string; orden: number }[];
  }>(),
  {
    logoEntidad: "",
    nombreEstructura: "",
    niveles: () => [],
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
// Escala que equivale a "100%" para el usuario (se fija al ajustar)
const escalaBase = ref(1);

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
  // Vuelve a la escala ajustada (que es el "100%" del usuario)
  escala.value = escalaBase.value;
  nextTick(() => viewport.value?.scrollTo({ left: 0, behavior: "smooth" }));
}

async function ajustarAlDiagrama() {
  if (!viewport.value || !lienzo.value) return;

  // Medir el ancho natural del lienzo compensando el zoom CSS actual.
  const rectLienzo = lienzo.value.getBoundingClientRect();
  const anchoNatural = Math.max(rectLienzo.width / escala.value, 1);

  // El ancho disponible en el viewport (clientWidth ya excluye el scrollbar)
  const anchoDisponible = Math.max(viewport.value.clientWidth, 1);

  const escalaObjetivo = limitarEscala(
    Number((anchoDisponible / anchoNatural).toFixed(2)),
  );

  escala.value = escalaObjetivo;
  // Actualizar la base: este ajuste es el nuevo "100%"
  escalaBase.value = escalaObjetivo;

  // Esperar dos frames para que el browser complete el reflow del zoom CSS
  await new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );

  viewport.value?.scrollTo({ left: 0, behavior: "smooth" });
}

// Al montar, auto-ajustar para que el organigrama llene el espacio disponible.
// Usamos doble rAF para garantizar que el DOM del lienzo ya tiene dimensiones.
onMounted(async () => {
  await new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );
  await ajustarAlDiagrama();
});
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
        <output :aria-label="`Escala ${Math.round((escala / escalaBase) * 100)} por ciento`">
          {{ Math.round((escala / escalaBase) * 100) }}%
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
        <div class="guias-niveles" aria-hidden="true">
          <div
            v-for="nivel in niveles"
            :key="nivel.id"
            class="guia-nivel"
            :style="{ '--indice-nivel': nivel.orden - 1 }"
          >
            <div class="guia-nivel-etiqueta">
              <span>{{ nivel.nombre }}</span>
              <em>{{ nivel.orden }}</em>
            </div>
            <div class="guia-nivel-banda" />
          </div>
        </div>
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
          <div class="entidad-contenido">
            <div class="entidad-identidad">
              <small>Entidad</small>
              <strong>{{ nombreEntidad || "Organización" }}</strong>
            </div>
            <span v-if="nombreEstructura" class="entidad-estructura">
              {{ nombreEstructura }}
            </span>
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
  position: relative;
  width: max-content;
  min-width: max-content;
  padding: 2rem 3.75rem 3rem 4.25rem;
}

/* ── Guías de nivel ── */
.guias-niveles {
  position: absolute;
  z-index: 0;
  /* El primer nivel de nodos empieza en ~9.55rem desde el tope del lienzo */
  top: 9.55rem;
  right: 0;
  bottom: 0;
  left: 0;
  /* sin overflow:hidden para que se extienda al ancho real del contenido */
  min-width: 100%;
  pointer-events: none;
}

.guia-nivel {
  position: absolute;
  top: calc(var(--indice-nivel) * 14.25rem);
  /* Ocupar todo el ancho del lienzo, no solo el del viewport */
  left: 0;
  right: 0;
  width: 100%;
  display: flex;
  height: 14.25rem;
  align-items: stretch;
  /* Líneas horizontales entrecortadas, color suave */
  border-top: 1px dashed color-mix(in srgb, var(--color-primary) 18%, var(--color-border));
  border-bottom: 1px dashed color-mix(in srgb, var(--color-primary) 18%, var(--color-border));
}

/* Etiqueta vertical a la izquierda con el nombre del nivel */
.guia-nivel-etiqueta {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 2.5rem;
  height: 100%;
  gap: 0.3rem;
  border-right: 1px dashed color-mix(in srgb, var(--color-primary) 18%, var(--color-border));
  background: color-mix(in srgb, var(--color-background) 97%, var(--color-primary));
}

/* Número del nivel */
.guia-nivel-etiqueta em {
  display: block;
  font-style: normal;
  font-size: 0.7rem;
  font-weight: 900;
  color: var(--color-primary);
  opacity: 0.55;
  line-height: 1;
}

/* Nombre del nivel en escritura vertical */
.guia-nivel-etiqueta span {
  display: block;
  color: var(--color-primary);
  font-size: 0.57rem;
  font-weight: 900;
  letter-spacing: 0.07em;
  line-height: 1;
  text-transform: uppercase;
  white-space: nowrap;
  writing-mode: vertical-rl;
  transform: rotate(180deg);
  max-height: 12rem;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Fondo semitransparente de la banda */
.guia-nivel-banda {
  flex: 1;
  background: color-mix(in srgb, var(--color-primary) 3%, transparent);
}

.entidad-raiz {
  display: flex;
  position: relative;
  z-index: 1;
  width: min(32rem, calc(100vw - 3rem));
  margin: 0 auto;
  align-items: center;
  gap: 0.75rem;
  border-top: 4px solid var(--color-accent);
  background: var(--color-primary);
  padding: 0.8rem 1rem;
  color: var(--color-primary-foreground);
  text-align: left;
  box-shadow: 0 18px 35px rgb(3 36 78 / 18%);
}

.entidad-marca {
  display: grid;
  width: 2.6rem;
  height: 2.6rem;
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

.entidad-contenido {
  min-width: 0;
  flex: 1;
}

.entidad-identidad {
  display: flex;
  min-width: 0;
  align-items: baseline;
  gap: 0.6rem;
}

.entidad-raiz small {
  flex: none;
  color: rgb(255 255 255 / 70%);
  font-size: 0.62rem;
  font-weight: 900;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.entidad-raiz strong {
  min-width: 0;
  font-size: 0.9rem;
  line-height: 1.25;
  font-weight: 900;
}

.entidad-estructura {
  display: block;
  margin-top: 0.15rem;
  color: rgb(255 255 255 / 65%);
  font-size: 0.65rem;
  font-weight: 700;
  line-height: 1.2;
}

@media (max-width: 520px) {
  .entidad-identidad {
    display: grid;
    gap: 0.15rem;
  }
}

.organigrama-raices {
  position: relative;
  z-index: 1;
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
