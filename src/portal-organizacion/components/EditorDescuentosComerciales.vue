<script setup lang="ts">
import {
  Copy,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  Ticket,
  Trash2,
} from "lucide-vue-next";
import Dialog from "primevue/dialog";
import InputNumber from "primevue/inputnumber";
import InputText from "primevue/inputtext";
import MultiSelect from "primevue/multiselect";
import Select from "primevue/select";
import { computed, ref, watch } from "vue";

import {
  organizacionService,
  type UsuarioOrganizacion,
} from "@/api/services/organizacion.service";
import IconoAyuda from "@/components/shared/IconoAyuda.vue";
import { Button } from "@/components/ui/button";
import {
  calcularPrecioConReglas,
  generarCodigoDescuento,
} from "@/lib/precio-curso";
import type {
  PoliticaCombinacionDescuentos,
  ReglaDescuentoCurso,
} from "@/types/comercializacion-curso.types";

const props = defineProps<{
  descuentos: ReglaDescuentoCurso[];
  politica: PoliticaCombinacionDescuentos;
  precioBase: number;
  nodos: Array<{ label: string; value: string }>;
  /** Nodos del alcance interno (si aplica). */
  nodoIdsAlcance?: string[];
}>();

const emit = defineEmits<{
  "update:descuentos": [valor: ReglaDescuentoCurso[]];
  "update:politica": [valor: PoliticaCombinacionDescuentos];
}>();

const puedeEditar = computed(() => props.precioBase > 0);
const modalAvanzado = ref(false);
const codigoSimulacion = ref("");
const codigoCopiadoId = ref("");
const personas = ref<UsuarioOrganizacion[]>([]);
const busquedaPersona = ref("");
const cargandoPersonas = ref(false);

const opcionesPolitica = [
  {
    value: "SOLO_MEJOR" as const,
    titulo: "Solo un descuento",
    detalle: "Si varias reglas aplican, queda la que más rebaja.",
  },
  {
    value: "ACUMULABLES" as const,
    titulo: "Acumulables",
    detalle: "Pueden sumarse las marcadas como acumulables.",
  },
  {
    value: "POR_PRIORIDAD" as const,
    titulo: "Por prioridad",
    detalle: "Se aplica la de mayor prioridad (número más bajo).",
  },
];

const reglas = computed({
  get: () => props.descuentos,
  set: (valor) => emit("update:descuentos", valor),
});

const politicaLocal = computed({
  get: () => props.politica,
  set: (valor) => emit("update:politica", valor),
});

const codigos = computed(() =>
  reglas.value.filter((regla) => (regla.modo ?? "AUTOMATICO") === "CODIGO"),
);
const automaticosBasicos = computed(() =>
  reglas.value.filter(
    (regla) =>
      (regla.modo ?? "AUTOMATICO") === "AUTOMATICO" &&
      (regla.beneficiario === "TODOS" ||
        regla.beneficiario === "INTERNOS" ||
        regla.beneficiario === "EXTERNOS"),
  ),
);
const reglasAvanzadas = computed(() =>
  reglas.value.filter(
    (regla) =>
      (regla.modo ?? "AUTOMATICO") === "AUTOMATICO" &&
      (regla.beneficiario === "NODOS" || regla.beneficiario === "PERSONAS"),
  ),
);
const reglasPorNodo = computed(() =>
  reglasAvanzadas.value.filter((regla) => regla.beneficiario === "NODOS"),
);
const reglasPorPersona = computed(() =>
  reglasAvanzadas.value.filter((regla) => regla.beneficiario === "PERSONAS"),
);

const puedeDescuentoPorNodo = computed(
  () => (props.nodoIdsAlcance?.length ?? 0) > 0 || props.nodos.length > 0,
);

const resumenAvanzado = computed(() => {
  const partes: string[] = [];
  if (reglasAvanzadas.value.length) {
    partes.push(
      `${reglasAvanzadas.value.length} regla${reglasAvanzadas.value.length === 1 ? "" : "s"}`,
    );
  }
  if (politicaLocal.value !== "SOLO_MEJOR") {
    partes.push(
      opcionesPolitica.find((item) => item.value === politicaLocal.value)
        ?.titulo ?? politicaLocal.value,
    );
  }
  return partes.join(" · ");
});

const personasFiltradas = computed(() => {
  const termino = busquedaPersona.value.trim().toLowerCase();
  if (!termino) return personas.value.slice(0, 20);
  return personas.value
    .filter((item) =>
      [item.nombre, item.dni, item.correo].some((valor) =>
        String(valor ?? "")
          .toLowerCase()
          .includes(termino),
      ),
    )
    .slice(0, 20);
});

watch(
  () => props.precioBase,
  (precio) => {
    if (precio > 0) return;
    if (reglas.value.length) emit("update:descuentos", []);
  },
);

function crearBase(modo: ReglaDescuentoCurso["modo"]): ReglaDescuentoCurso {
  return {
    id: `regla-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    nombre: modo === "CODIGO" ? "Cupón" : "Descuento automático",
    modo,
    codigo: modo === "CODIGO" ? generarCodigoDescuento() : undefined,
    aplicaSobre: "CURSO_COMPLETO",
    moduloIds: [],
    beneficiario: modo === "CODIGO" ? "TODOS" : "INTERNOS",
    nodoIds: [],
    usuarioIds: [],
    tipo: "PORCENTAJE",
    valor: 10,
    acumulable: politicaLocal.value === "ACUMULABLES",
    prioridad: reglas.value.length + 1,
    activa: true,
  };
}

function actualizarLista(mutar: (lista: ReglaDescuentoCurso[]) => void) {
  const lista = reglas.value.map((regla) => ({ ...regla }));
  mutar(lista);
  emit("update:descuentos", lista);
}

function agregarAutomatico() {
  if (!puedeEditar.value) return;
  actualizarLista((lista) => lista.push(crearBase("AUTOMATICO")));
}

function agregarCodigo() {
  if (!puedeEditar.value) return;
  actualizarLista((lista) => lista.push(crearBase("CODIGO")));
}

function agregarPorNodo() {
  if (!puedeEditar.value || !puedeDescuentoPorNodo.value) return;
  const regla = crearBase("AUTOMATICO");
  regla.nombre = "Descuento por nodo";
  regla.beneficiario = "NODOS";
  regla.nodoIds = props.nodoIdsAlcance?.length
    ? [...props.nodoIdsAlcance]
    : props.nodos[0]
      ? [props.nodos[0].value]
      : [];
  actualizarLista((lista) => lista.push(regla));
}

function agregarPorPersona(persona: UsuarioOrganizacion) {
  if (!puedeEditar.value) return;
  const yaExiste = reglas.value.some(
    (regla) =>
      regla.beneficiario === "PERSONAS" &&
      regla.usuarioIds.includes(String(persona.id)),
  );
  if (yaExiste) return;
  const regla = crearBase("AUTOMATICO");
  regla.nombre = `Descuento · ${persona.nombre}`;
  regla.beneficiario = "PERSONAS";
  regla.usuarioIds = [String(persona.id)];
  actualizarLista((lista) => lista.push(regla));
  busquedaPersona.value = "";
}

function quitar(id: string) {
  actualizarLista((lista) => {
    const indice = lista.findIndex((item) => item.id === id);
    if (indice >= 0) lista.splice(indice, 1);
  });
}

function patchRegla(id: string, cambios: Partial<ReglaDescuentoCurso>) {
  actualizarLista((lista) => {
    const regla = lista.find((item) => item.id === id);
    if (regla) Object.assign(regla, cambios);
  });
}

async function abrirAvanzado() {
  modalAvanzado.value = true;
  if (personas.value.length) return;
  cargandoPersonas.value = true;
  try {
    personas.value = await organizacionService.usuarios.listar();
  } finally {
    cargandoPersonas.value = false;
  }
}

function regenerarCodigo(regla: ReglaDescuentoCurso) {
  patchRegla(regla.id, { codigo: generarCodigoDescuento() });
}

async function copiarCodigo(regla: ReglaDescuentoCurso) {
  if (!regla.codigo || !navigator.clipboard?.writeText) return;
  await navigator.clipboard.writeText(regla.codigo);
  codigoCopiadoId.value = regla.id;
  window.setTimeout(() => {
    if (codigoCopiadoId.value === regla.id) codigoCopiadoId.value = "";
  }, 1500);
}

function nombrePersona(id: string) {
  return (
    personas.value.find((item) => String(item.id) === id)?.nombre ??
    `Persona ${id}`
  );
}

function nombreNodo(id: string) {
  return props.nodos.find((item) => item.value === id)?.label ?? id;
}

function resumenRegla(regla: ReglaDescuentoCurso) {
  const monto =
    regla.tipo === "PORCENTAJE"
      ? `${regla.valor}%`
      : `S/ ${regla.valor.toFixed(2)}`;
  if ((regla.modo ?? "AUTOMATICO") === "CODIGO") {
    return `${monto} sobre precio de la ruta`;
  }
  if (regla.beneficiario === "NODOS") {
    const nodos = regla.nodoIds.map(nombreNodo).slice(0, 2).join(", ");
    return `${monto} · nodos: ${nodos || "sin nodo"}`;
  }
  if (regla.beneficiario === "PERSONAS") {
    const nombres = regla.usuarioIds.map(nombrePersona).slice(0, 2).join(", ");
    return `${monto} · ${nombres || "persona"}`;
  }
  const quien =
    regla.beneficiario === "EXTERNOS"
      ? "externos"
      : regla.beneficiario === "TODOS"
        ? "todos"
        : "internos";
  return `${monto} · ${quien}`;
}

function simulacion(condicion: "INTERNO" | "EXTERNO") {
  return calcularPrecioConReglas({
    precioBase: Math.max(0, props.precioBase),
    reglas: reglas.value,
    politica: politicaLocal.value,
    perfil: {
      condicion,
      nodoIds:
        condicion === "INTERNO"
          ? props.nodoIdsAlcance?.length
            ? props.nodoIdsAlcance
            : props.nodos.slice(0, 1).map((n) => n.value)
          : [],
    },
    aplicaSobre: "CURSO_COMPLETO",
    codigo: codigoSimulacion.value || undefined,
  });
}
</script>

<template>
  <div class="grid gap-4 border border-border border-l-4 border-l-accent p-4">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="flex items-center gap-2">
        <p class="filtro-label mb-0">Descuentos de la ruta</p>
        <IconoAyuda
          texto="Igual que en la aprobación de cursos: automáticos, códigos y opciones avanzadas (nodo, persona, política)."
        />
      </div>
      <div class="flex flex-wrap gap-2">
        <Button size="sm" :disabled="!puedeEditar" @click="agregarAutomatico">
          <Plus class="h-4 w-4" />
          Automático
        </Button>
        <Button
          size="sm"
          variant="outline"
          :disabled="!puedeEditar"
          @click="agregarCodigo"
        >
          <Ticket class="h-4 w-4" />
          Código
        </Button>
        <Button
          size="sm"
          variant="outline"
          :disabled="!puedeEditar"
          @click="abrirAvanzado"
        >
          <Settings2 class="h-4 w-4" />
          Avanzado
          <span
            v-if="resumenAvanzado"
            class="ml-1 text-[10px] font-black uppercase tracking-wide text-primary"
          >
            · {{ resumenAvanzado }}
          </span>
        </Button>
      </div>
    </div>

    <div
      v-if="!puedeEditar"
      class="border border-border bg-muted/20 p-3 text-sm text-muted-foreground"
    >
      Define un precio mayor a 0 para configurar descuentos.
    </div>

    <template v-else>
      <div v-if="automaticosBasicos.length" class="grid gap-3">
        <p class="filtro-label mb-0">Automáticos</p>
        <article
          v-for="regla in automaticosBasicos"
          :key="regla.id"
          class="grid gap-3 border border-border border-t-4 border-t-primary p-3"
        >
          <div class="flex items-start justify-between gap-2">
            <InputText
              :model-value="regla.nombre"
              class="filtro-control flex-1"
              placeholder="Ej. Precio colaborador"
              @update:model-value="
                patchRegla(regla.id, { nombre: String($event ?? '') })
              "
            />
            <Button
              size="icon"
              variant="ghost"
              aria-label="Eliminar"
              @click="quitar(regla.id)"
            >
              <Trash2 class="h-4 w-4 text-red-600" />
            </Button>
          </div>
          <div class="grid gap-3 sm:grid-cols-3">
            <label class="grid gap-2">
              <span class="filtro-label">Para</span>
              <Select
                :model-value="regla.beneficiario"
                class="filtro-control w-full"
                :options="[
                  { label: 'Internos', value: 'INTERNOS' },
                  { label: 'Externos', value: 'EXTERNOS' },
                  { label: 'Todos', value: 'TODOS' },
                ]"
                option-label="label"
                option-value="value"
                panel-class="tukuy-filtro-panel"
                fluid
                @update:model-value="
                  patchRegla(regla.id, {
                    beneficiario: $event as ReglaDescuentoCurso['beneficiario'],
                  })
                "
              />
            </label>
            <div class="grid gap-2">
              <span class="filtro-label">Tipo</span>
              <div class="flex border border-border">
                <button
                  type="button"
                  class="flex-1 px-3 py-2 text-sm font-black"
                  :class="
                    regla.tipo === 'PORCENTAJE'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background'
                  "
                  @click="patchRegla(regla.id, { tipo: 'PORCENTAJE' })"
                >
                  %
                </button>
                <button
                  type="button"
                  class="flex-1 px-3 py-2 text-sm font-black"
                  :class="
                    regla.tipo === 'MONTO_FIJO'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background'
                  "
                  @click="patchRegla(regla.id, { tipo: 'MONTO_FIJO' })"
                >
                  S/
                </button>
              </div>
            </div>
            <label class="grid gap-2">
              <span class="filtro-label">Valor</span>
              <InputNumber
                :model-value="regla.valor"
                class="filtro-control w-full"
                :suffix="regla.tipo === 'PORCENTAJE' ? '%' : undefined"
                :mode="regla.tipo === 'MONTO_FIJO' ? 'currency' : undefined"
                :currency="regla.tipo === 'MONTO_FIJO' ? 'PEN' : undefined"
                :locale="regla.tipo === 'MONTO_FIJO' ? 'es-PE' : undefined"
                :min="0"
                :max="regla.tipo === 'PORCENTAJE' ? 100 : undefined"
                fluid
                @update:model-value="
                  patchRegla(regla.id, { valor: Number($event ?? 0) })
                "
              />
            </label>
          </div>
          <p class="text-xs text-muted-foreground">{{ resumenRegla(regla) }}</p>
        </article>
      </div>

      <div v-if="codigos.length" class="grid gap-3">
        <p class="filtro-label mb-0">Códigos</p>
        <article
          v-for="regla in codigos"
          :key="regla.id"
          class="grid gap-3 border border-border border-t-4 border-t-accent p-3"
        >
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              <InputText
                :model-value="regla.codigo"
                class="filtro-control max-w-56 font-black tracking-wider uppercase"
                @update:model-value="
                  patchRegla(regla.id, {
                    codigo: String($event ?? '')
                      .toUpperCase()
                      .replace(/\s+/g, ''),
                  })
                "
              />
              <Button size="sm" variant="outline" @click="copiarCodigo(regla)">
                <Copy class="h-4 w-4" />
                {{ codigoCopiadoId === regla.id ? "Copiado" : "Copiar" }}
              </Button>
              <Button size="sm" variant="ghost" @click="regenerarCodigo(regla)">
                <RefreshCw class="h-4 w-4" />
                Nuevo
              </Button>
            </div>
            <Button
              size="icon"
              variant="ghost"
              aria-label="Eliminar código"
              @click="quitar(regla.id)"
            >
              <Trash2 class="h-4 w-4 text-red-600" />
            </Button>
          </div>
          <div class="grid gap-3 sm:grid-cols-2">
            <div class="grid gap-2">
              <span class="filtro-label">Tipo</span>
              <div class="flex border border-border">
                <button
                  type="button"
                  class="flex-1 px-3 py-2 text-sm font-black"
                  :class="
                    regla.tipo === 'PORCENTAJE'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background'
                  "
                  @click="patchRegla(regla.id, { tipo: 'PORCENTAJE' })"
                >
                  %
                </button>
                <button
                  type="button"
                  class="flex-1 px-3 py-2 text-sm font-black"
                  :class="
                    regla.tipo === 'MONTO_FIJO'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background'
                  "
                  @click="patchRegla(regla.id, { tipo: 'MONTO_FIJO' })"
                >
                  S/
                </button>
              </div>
            </div>
            <label class="grid gap-2">
              <span class="filtro-label">Valor</span>
              <InputNumber
                :model-value="regla.valor"
                class="filtro-control w-full"
                :suffix="regla.tipo === 'PORCENTAJE' ? '%' : undefined"
                :mode="regla.tipo === 'MONTO_FIJO' ? 'currency' : undefined"
                :currency="regla.tipo === 'MONTO_FIJO' ? 'PEN' : undefined"
                :locale="regla.tipo === 'MONTO_FIJO' ? 'es-PE' : undefined"
                :min="0"
                :max="regla.tipo === 'PORCENTAJE' ? 100 : undefined"
                fluid
                @update:model-value="
                  patchRegla(regla.id, { valor: Number($event ?? 0) })
                "
              />
            </label>
          </div>
          <p class="text-xs text-muted-foreground">{{ resumenRegla(regla) }}</p>
        </article>
      </div>

      <p
        v-if="!automaticosBasicos.length && !codigos.length && !reglasAvanzadas.length"
        class="text-xs text-muted-foreground"
      >
        Sin descuentos. Agrega un automático, un código o configura Avanzado.
      </p>

      <div class="grid gap-3 border border-border bg-muted/10 p-3 md:grid-cols-2">
        <label v-if="codigos.length" class="grid gap-2 md:col-span-2">
          <span class="filtro-label">Probar código</span>
          <InputText
            v-model="codigoSimulacion"
            class="filtro-control w-full uppercase"
            placeholder="Ej. TUKUY-AB12CD"
            @update:model-value="
              codigoSimulacion = String($event ?? '')
                .toUpperCase()
                .replace(/\s+/g, '')
            "
          />
        </label>
        <article
          v-for="condicion in (['INTERNO', 'EXTERNO'] as const)"
          :key="condicion"
          class="border border-border bg-card p-3"
        >
          <h4 class="text-sm font-black">
            Alumno {{ condicion === "INTERNO" ? "interno" : "externo" }}
          </h4>
          <p class="mt-2 text-lg font-black">
            S/ {{ simulacion(condicion).precioFinal.toFixed(2) }}
          </p>
          <p class="mt-1 text-xs text-muted-foreground">
            {{ simulacion(condicion).reglasAplicadas.length }} regla(s)
            <template v-if="simulacion(condicion).reglasAplicadas.length">
              ·
              {{
                simulacion(condicion)
                  .reglasAplicadas.map((r) => r.nombre || r.codigo)
                  .join(", ")
              }}
            </template>
          </p>
        </article>
      </div>
    </template>

    <Dialog
      v-model:visible="modalAvanzado"
      modal
      header="Descuentos avanzados"
      :style="{ width: 'min(40rem, 96vw)' }"
      :pt="{
        root: { class: 'rounded-none' },
        header: { class: 'rounded-none border-b border-border' },
        content: { class: 'rounded-none' },
      }"
    >
      <div class="grid gap-5">
        <div class="grid gap-2">
          <p class="filtro-label mb-0">Combinación de descuentos</p>
          <div class="grid gap-2 sm:grid-cols-3">
            <label
              v-for="opcion in opcionesPolitica"
              :key="opcion.value"
              class="flex cursor-pointer items-start gap-2 border border-border px-3 py-3 text-sm"
              :class="
                politicaLocal === opcion.value
                  ? 'border-primary bg-primary/5'
                  : 'hover:bg-muted/40'
              "
            >
              <input
                v-model="politicaLocal"
                type="radio"
                class="mt-1"
                :value="opcion.value"
              />
              <span>
                <b class="block">{{ opcion.titulo }}</b>
                <small class="text-muted-foreground">{{ opcion.detalle }}</small>
              </span>
            </label>
          </div>
        </div>

        <div class="grid gap-3">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <p class="filtro-label mb-0">Por nodo</p>
            <Button
              size="sm"
              variant="outline"
              :disabled="!puedeDescuentoPorNodo"
              @click="agregarPorNodo"
            >
              <Plus class="h-4 w-4" />
              Agregar
            </Button>
          </div>
          <article
            v-for="regla in reglasPorNodo"
            :key="regla.id"
            class="grid gap-3 border border-border p-3"
          >
            <div class="flex justify-between gap-2">
              <InputText
                :model-value="regla.nombre"
                class="filtro-control flex-1"
                @update:model-value="
                  patchRegla(regla.id, { nombre: String($event ?? '') })
                "
              />
              <Button size="icon" variant="ghost" @click="quitar(regla.id)">
                <Trash2 class="h-4 w-4 text-red-600" />
              </Button>
            </div>
            <label class="grid gap-2">
              <span class="filtro-label">Nodos</span>
              <MultiSelect
                :model-value="regla.nodoIds"
                class="filtro-control w-full"
                :options="nodos"
                option-label="label"
                option-value="value"
                display="chip"
                panel-class="tukuy-filtro-panel"
                fluid
                @update:model-value="
                  patchRegla(regla.id, {
                    nodoIds: ($event as string[]) ?? [],
                  })
                "
              />
            </label>
            <label class="grid gap-2">
              <span class="filtro-label">Valor %</span>
              <InputNumber
                :model-value="regla.valor"
                class="filtro-control w-full"
                suffix="%"
                :min="1"
                :max="100"
                fluid
                @update:model-value="
                  patchRegla(regla.id, {
                    valor: Number($event ?? 0),
                    tipo: 'PORCENTAJE',
                  })
                "
              />
            </label>
          </article>
        </div>

        <div class="grid gap-3">
          <p class="filtro-label mb-0">Por persona</p>
          <label class="grid gap-2">
            <span class="filtro-label">Buscar persona</span>
            <span class="relative block">
              <Search
                class="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              />
              <InputText
                v-model="busquedaPersona"
                class="filtro-control w-full pl-10"
                placeholder="Nombre, DNI o correo"
              />
            </span>
          </label>
          <p v-if="cargandoPersonas" class="text-xs text-muted-foreground">
            Cargando personas…
          </p>
          <div
            v-else
            class="grid max-h-40 gap-1 overflow-y-auto border border-border"
          >
            <button
              v-for="persona in personasFiltradas"
              :key="persona.id"
              type="button"
              class="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted/50"
              @click="agregarPorPersona(persona)"
            >
              <span>
                <b class="block">{{ persona.nombre }}</b>
                <small class="text-muted-foreground">{{ persona.dni }}</small>
              </span>
              <Plus class="h-4 w-4 text-primary" />
            </button>
          </div>
          <article
            v-for="regla in reglasPorPersona"
            :key="regla.id"
            class="flex items-center justify-between gap-2 border border-border p-3 text-sm"
          >
            <div>
              <p class="font-black">{{ regla.nombre }}</p>
              <p class="text-xs text-muted-foreground">
                {{ resumenRegla(regla) }}
              </p>
            </div>
            <div class="flex items-center gap-2">
              <InputNumber
                :model-value="regla.valor"
                class="filtro-control w-24"
                suffix="%"
                :min="1"
                :max="100"
                fluid
                @update:model-value="
                  patchRegla(regla.id, { valor: Number($event ?? 0) })
                "
              />
              <Button size="icon" variant="ghost" @click="quitar(regla.id)">
                <Trash2 class="h-4 w-4 text-red-600" />
              </Button>
            </div>
          </article>
        </div>
      </div>
    </Dialog>
  </div>
</template>
