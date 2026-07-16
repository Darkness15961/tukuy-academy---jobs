<script setup lang="ts">
import {
  Archive,
  Award,
  ChevronDown,
  ChevronUp,
  Plus,
  Route,
  Trash2,
  UsersRound,
} from "lucide-vue-next";
import Dialog from "primevue/dialog";
import InputNumber from "primevue/inputnumber";
import Select from "primevue/select";
import ToggleSwitch from "primevue/toggleswitch";
import { computed, onMounted, reactive, ref, watch } from "vue";

import {
  calcularPrecioConDescuento,
  etiquetaAlcanceCorto,
  etiquetaDescuentoAplicaA,
  organizacionService,
  type AlcanceCursoOrganizacion,
  type CursoEnRutaOrganizacion,
  type DestinatarioDescuento,
  type PropuestaCursoOrganizacion,
  type RutaOrganizacion,
} from "@/api/services/organizacion.service";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

const cargando = ref(true);
const guardando = ref(false);
const rutas = ref<RutaOrganizacion[]>([]);
const catalogo = ref<PropuestaCursoOrganizacion[]>([]);
const areasInternas = ref<Array<{ label: string; value: string }>>([]);
const modal = ref(false);
const editandoId = ref<string | null>(null);
const mensaje = ref("");
const busquedaCursos = ref("");

const formulario = reactive({
  nombre: "",
  descripcion: "",
  usuarios: 0,
  certificado: false,
  precio: 0,
  alcance: "TODOS" as AlcanceCursoOrganizacion,
  destinoArea: "",
  descuentoAplicaA: "NINGUNO" as DestinatarioDescuento,
  descuentoArea: "",
  descuentoInterno: 0,
  cursosSeleccionados: [] as CursoEnRutaOrganizacion[],
});

const opcionesAlcance = [
  { label: "Todo el público", value: "TODOS" as const },
  { label: "Toda la organización", value: "ORGANIZACION" as const },
  { label: "Solo un área", value: "AREA" as const },
  { label: "Público externo", value: "EXTERNO" as const },
];

const opcionesDescuento = [
  { label: "Sin descuento", value: "NINGUNO" as const },
  { label: "Todos los colaboradores", value: "ORGANIZACION" as const },
  { label: "Solo un área", value: "AREA" as const },
  { label: "Público externo", value: "EXTERNO" as const },
];

const precioConDescuento = computed(() =>
  calcularPrecioConDescuento(
    formulario.precio,
    formulario.descuentoInterno,
    formulario.descuentoAplicaA,
  ),
);

const cursosDisponibles = computed(() =>
  catalogo.value.filter(
    (curso) => curso.estado === "APROBADO" || curso.estado === "PUBLICADO",
  ),
);

const cursosFiltrados = computed(() => {
  const termino = busquedaCursos.value.trim().toLowerCase();
  return cursosDisponibles.value.filter((curso) => {
    if (formulario.cursosSeleccionados.some((item) => item.id === curso.id)) {
      return false;
    }
    if (!termino) return true;
    return [curso.titulo, curso.docente, curso.categoria].some((valor) =>
      valor.toLowerCase().includes(termino),
    );
  });
});

const sumaPreciosCursos = computed(() =>
  formulario.cursosSeleccionados.reduce((total, item) => {
    const curso = catalogo.value.find((c) => c.id === item.id);
    if (!curso || (curso.precio ?? 0) <= 0) return total;
    return total + (curso.precio ?? 0);
  }, 0),
);

watch(
  () => formulario.alcance,
  (alcance) => {
    if (alcance !== "AREA") {
      formulario.destinoArea = "";
    } else if (!formulario.destinoArea && areasInternas.value[0]) {
      formulario.destinoArea = areasInternas.value[0].value;
    }
  },
);

watch(
  () => formulario.descuentoAplicaA,
  (aplicaA) => {
    if (aplicaA === "NINGUNO") {
      formulario.descuentoInterno = 0;
      formulario.descuentoArea = "";
    } else if (aplicaA === "AREA" && !formulario.descuentoArea) {
      formulario.descuentoArea =
        formulario.destinoArea || areasInternas.value[0]?.value || "";
    }
  },
);

onMounted(cargar);

async function cargar() {
  cargando.value = true;
  try {
    const [listaRutas, listaCatalogo, listaAreas] = await Promise.all([
      organizacionService.rutas.listar(),
      organizacionService.catalogoCursos.listar(),
      organizacionService.areas.listar(),
    ]);
    rutas.value = listaRutas;
    catalogo.value = listaCatalogo;
    areasInternas.value = listaAreas.map((area) => ({
      label: `Área ${area.nombre}`,
      value: area.nombre,
    }));
  } finally {
    cargando.value = false;
  }
}

function textoPrecioRuta(ruta: RutaOrganizacion) {
  const aplicaA = ruta.descuentoAplicaA ?? "NINGUNO";
  const dto = ruta.descuentoInterno ?? 0;
  const conDto = calcularPrecioConDescuento(ruta.precio ?? 0, dto, aplicaA);
  const base = ruta.precio ?? 0;
  if (aplicaA === "NINGUNO" || dto <= 0) {
    return base <= 0 ? "Gratuita" : `S/ ${base.toFixed(2)}`;
  }
  if (conDto <= 0) {
    return `Gratis · ${etiquetaDescuentoAplicaA(aplicaA, ruta.descuentoArea)}`;
  }
  return `S/ ${conDto.toFixed(2)} · ${etiquetaDescuentoAplicaA(aplicaA, ruta.descuentoArea)} (-${dto}%)`;
}

function abrir(ruta?: RutaOrganizacion) {
  editandoId.value = ruta?.id ?? null;
  busquedaCursos.value = "";
  Object.assign(formulario, {
    nombre: ruta?.nombre ?? "",
    descripcion: ruta?.descripcion ?? "",
    usuarios: ruta?.usuarios ?? 0,
    certificado: ruta?.certificado ?? false,
    precio: Math.max(ruta?.precio ?? 0, 0) || (ruta ? 0 : 100),
    alcance: ruta?.alcance ?? "TODOS",
    destinoArea: ruta?.destinoArea ?? areasInternas.value[0]?.value ?? "",
    descuentoAplicaA: ruta?.descuentoAplicaA ?? "NINGUNO",
    descuentoArea:
      ruta?.descuentoArea ??
      ruta?.destinoArea ??
      areasInternas.value[0]?.value ??
      "",
    descuentoInterno: ruta?.descuentoInterno ?? 0,
    cursosSeleccionados: [...(ruta?.cursosSeleccionados ?? [])].sort(
      (a, b) => a.orden - b.orden,
    ),
  });
  modal.value = true;
}

function estaSeleccionado(id: string) {
  return formulario.cursosSeleccionados.some((item) => item.id === id);
}

function agregarCurso(curso: PropuestaCursoOrganizacion) {
  if (estaSeleccionado(curso.id)) return;
  formulario.cursosSeleccionados.push({
    id: curso.id,
    titulo: curso.titulo,
    docente: curso.docente,
    orden: formulario.cursosSeleccionados.length + 1,
  });
}

function quitarCurso(id: string) {
  formulario.cursosSeleccionados = formulario.cursosSeleccionados
    .filter((item) => item.id !== id)
    .map((item, indice) => ({ ...item, orden: indice + 1 }));
}

function moverCurso(indice: number, direccion: -1 | 1) {
  const destino = indice + direccion;
  if (destino < 0 || destino >= formulario.cursosSeleccionados.length) return;
  const copia = [...formulario.cursosSeleccionados];
  const actual = copia[indice]!;
  copia[indice] = copia[destino]!;
  copia[destino] = actual;
  formulario.cursosSeleccionados = copia.map((item, i) => ({
    ...item,
    orden: i + 1,
  }));
}

function usarSugerido() {
  formulario.precio = Math.max(sumaPreciosCursos.value, 1);
  if (formulario.descuentoAplicaA === "NINGUNO") {
    formulario.descuentoAplicaA = "ORGANIZACION";
  }
  formulario.descuentoInterno = 15;
}

function formularioValido() {
  if (!formulario.nombre.trim()) return false;
  if (!formulario.cursosSeleccionados.length) return false;
  if (formulario.precio < 0) return false;
  if (formulario.alcance === "AREA" && !formulario.destinoArea) return false;
  if (
    formulario.descuentoAplicaA !== "NINGUNO" &&
    formulario.descuentoInterno <= 0
  ) {
    return false;
  }
  if (formulario.descuentoAplicaA === "AREA" && !formulario.descuentoArea) {
    return false;
  }
  return true;
}

async function guardar() {
  if (!formularioValido()) return;
  guardando.value = true;
  try {
    const precioConDto = calcularPrecioConDescuento(
      formulario.precio,
      formulario.descuentoInterno,
      formulario.descuentoAplicaA,
    );
    const datos = {
      nombre: formulario.nombre.trim(),
      descripcion: formulario.descripcion.trim(),
      cursos: formulario.cursosSeleccionados.length,
      cursosSeleccionados: formulario.cursosSeleccionados.map((item, i) => ({
        ...item,
        orden: i + 1,
      })),
      usuarios: formulario.usuarios,
      certificado: formulario.certificado,
      gratuito:
        precioConDto <= 0 && formulario.descuentoAplicaA !== "NINGUNO",
      precio: formulario.precio,
      moneda: "PEN" as const,
      alcance: formulario.alcance,
      destinoArea:
        formulario.alcance === "AREA" ? formulario.destinoArea : null,
      descuentoInterno:
        formulario.descuentoAplicaA === "NINGUNO"
          ? 0
          : formulario.descuentoInterno,
      descuentoAplicaA: formulario.descuentoAplicaA,
      descuentoArea:
        formulario.descuentoAplicaA === "AREA"
          ? formulario.descuentoArea
          : null,
    };
    if (editandoId.value) {
      await organizacionService.rutas.actualizar(editandoId.value, datos);
      mensaje.value = "Ruta actualizada con cursos y precio.";
    } else {
      await organizacionService.rutas.crear({
        id: `ruta-${Date.now()}`,
        ...datos,
        progreso: 0,
        estado: "BORRADOR",
      });
      mensaje.value = "Ruta creada como borrador.";
    }
    modal.value = false;
    await cargar();
  } finally {
    guardando.value = false;
  }
}

async function archivar(ruta: RutaOrganizacion) {
  await organizacionService.rutas.actualizar(ruta.id, { estado: "ARCHIVADA" });
  await cargar();
}

async function eliminar(ruta: RutaOrganizacion) {
  await organizacionService.rutas.eliminar(ruta.id);
  await cargar();
}
</script>

<template>
  <section class="mx-auto grid max-w-375 gap-6">
    <div class="flex flex-wrap justify-between gap-4">
      <div>
        <h1 class="text-2xl font-black">Rutas de aprendizaje</h1>
        <p class="mt-1 text-sm text-muted-foreground">
          Agrupa cursos aprobados en itinerarios, define el orden y el precio de
          la ruta completa.
        </p>
      </div>
      <Button @click="abrir()">
        <Plus class="h-4 w-4" />
        Crear ruta
      </Button>
    </div>

    <p
      v-if="mensaje"
      class="border-l-4 border-emerald-600 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-400"
    >
      {{ mensaje }}
    </p>

    <div v-if="cargando" class="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      <Skeleton v-for="item in 3" :key="item" class="h-72 w-full" />
    </div>

    <div
      v-else-if="rutas.length"
      class="grid gap-5 md:grid-cols-2 xl:grid-cols-3"
    >
      <Card v-for="ruta in rutas" :key="ruta.id" class="border-border bg-card">
        <CardContent class="p-5">
          <div class="flex justify-between">
            <div
              class="grid h-12 w-12 place-items-center bg-violet-500/10 text-violet-700 dark:text-violet-400"
            >
              <Route class="h-6 w-6" />
            </div>
            <div class="flex flex-wrap items-center justify-end gap-2">
              <Badge variant="outline">{{ ruta.estado ?? "PUBLICADA" }}</Badge>
              <Badge
                v-if="ruta.certificado"
                class="bg-amber-500/10 text-amber-700 dark:text-amber-400"
              >
                <Award class="mr-1 h-3 w-3" />
                Certificable
              </Badge>
            </div>
          </div>
          <h2 class="mt-5 text-lg font-black">{{ ruta.nombre }}</h2>
          <p class="mt-2 min-h-10 text-xs leading-5 text-muted-foreground">
            {{
              ruta.descripcion ||
              "Ruta empresarial configurada para el equipo."
            }}
          </p>
          <div class="mt-4 grid gap-1 text-xs text-muted-foreground">
            <span>
              {{ ruta.cursosSeleccionados?.length ?? ruta.cursos }} cursos ·
              Precio:
              <strong class="text-foreground">{{ textoPrecioRuta(ruta) }}</strong>
            </span>
            <span class="flex gap-1">
              <UsersRound class="h-4 w-4" />
              {{ ruta.usuarios }} usuarios
            </span>
          </div>
          <ul
            v-if="ruta.cursosSeleccionados?.length"
            class="mt-3 grid gap-1 border border-border bg-muted/20 p-2 text-[11px] text-muted-foreground"
          >
            <li
              v-for="curso in ruta.cursosSeleccionados.slice(0, 3)"
              :key="curso.id"
            >
              {{ curso.orden }}. {{ curso.titulo }}
            </li>
            <li v-if="ruta.cursosSeleccionados.length > 3">
              +{{ ruta.cursosSeleccionados.length - 3 }} más
            </li>
          </ul>
          <div class="mt-5 flex justify-between text-xs">
            <span>Progreso general</span>
            <b>{{ ruta.progreso }}%</b>
          </div>
          <Progress :model-value="ruta.progreso" class="mt-2" />
          <div class="mt-5 grid grid-cols-[1fr_auto_auto] gap-2">
            <Button variant="outline" @click="abrir(ruta)">
              Gestionar
            </Button>
            <Button
              variant="ghost"
              size="icon"
              title="Archivar"
              @click="archivar(ruta)"
            >
              <Archive class="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              class="text-red-600"
              title="Eliminar"
              @click="eliminar(ruta)"
            >
              <Trash2 class="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>

    <div
      v-else
      class="border border-dashed border-border p-10 text-center text-sm text-muted-foreground"
    >
      Aún no hay rutas. Crea la primera para organizar el aprendizaje del equipo.
    </div>

    <Dialog
      v-model:visible="modal"
      modal
      :header="editandoId ? 'Gestionar ruta' : 'Nueva ruta'"
      :style="{ width: 'min(96vw, 720px)' }"
    >
      <div class="grid max-h-[70vh] gap-4 overflow-y-auto pr-1">
        <label class="grid gap-2 text-sm font-bold">
          Nombre
          <Input
            v-model="formulario.nombre"
            placeholder="Ej. Liderazgo de obra"
          />
        </label>
        <label class="grid gap-2 text-sm font-bold">
          Descripción
          <textarea
            v-model="formulario.descripcion"
            class="min-h-20 border border-input bg-background p-3 font-normal"
          />
        </label>

        <div class="grid gap-3 border border-border p-3">
          <div class="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p class="text-sm font-black">Cursos de la ruta</p>
              <p class="text-xs text-muted-foreground">
                Solo cursos aprobados o publicados del catálogo.
              </p>
            </div>
            <Badge variant="outline">
              {{ formulario.cursosSeleccionados.length }} seleccionados
            </Badge>
          </div>

          <div
            v-if="formulario.cursosSeleccionados.length"
            class="grid gap-2"
          >
            <div
              v-for="(curso, indice) in formulario.cursosSeleccionados"
              :key="curso.id"
              class="flex items-center gap-2 border border-border bg-card p-2"
            >
              <span
                class="grid h-7 w-7 shrink-0 place-items-center bg-primary text-xs font-black text-primary-foreground"
              >
                {{ curso.orden }}
              </span>
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-bold">{{ curso.titulo }}</p>
                <p class="truncate text-[11px] text-muted-foreground">
                  {{ curso.docente || "Docente" }}
                </p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                :disabled="indice === 0"
                @click="moverCurso(indice, -1)"
              >
                <ChevronUp class="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                :disabled="indice === formulario.cursosSeleccionados.length - 1"
                @click="moverCurso(indice, 1)"
              >
                <ChevronDown class="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                class="text-red-600"
                @click="quitarCurso(curso.id)"
              >
                <Trash2 class="h-4 w-4" />
              </Button>
            </div>
          </div>
          <p
            v-else
            class="border border-dashed border-border p-3 text-xs text-muted-foreground"
          >
            Aún no agregaste cursos. Selecciónalos abajo.
          </p>

          <Input
            v-model="busquedaCursos"
            placeholder="Buscar cursos del catálogo..."
          />
          <div class="max-h-44 overflow-y-auto border border-border">
            <button
              v-for="curso in cursosFiltrados"
              :key="curso.id"
              type="button"
              class="flex w-full items-start justify-between gap-3 border-b border-border px-3 py-2 text-left last:border-b-0 hover:bg-muted/50"
              @click="agregarCurso(curso)"
            >
              <span>
                <span class="block text-sm font-bold">{{ curso.titulo }}</span>
                <span class="block text-[11px] text-muted-foreground">
                  {{ curso.docente }} ·
                  {{
                    (curso.precio ?? 0) <= 0
                      ? "Sin precio"
                      : `S/ ${(curso.precio ?? 0).toFixed(2)}`
                  }}
                </span>
              </span>
              <Plus class="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            </button>
            <p
              v-if="!cursosFiltrados.length"
              class="p-3 text-xs text-muted-foreground"
            >
              No hay más cursos disponibles para agregar.
            </p>
          </div>
        </div>

        <div class="grid gap-3 border border-border p-3">
          <p class="text-sm font-black">Precio de la ruta</p>
          <p class="text-xs text-muted-foreground">
            Suma referencial de cursos:
            <strong class="text-foreground">
              {{
                sumaPreciosCursos <= 0
                  ? "S/ 0.00"
                  : `S/ ${sumaPreciosCursos.toFixed(2)}`
              }}
            </strong>
          </p>
          <div class="grid gap-2 sm:grid-cols-[1fr_auto]">
            <label class="grid gap-2 text-sm font-bold">
              Precio base (S/)
              <InputNumber
                v-model="formulario.precio"
                :min="0"
                :max-fraction-digits="2"
                mode="currency"
                currency="PEN"
                locale="es-PE"
                fluid
              />
            </label>
            <Button
              variant="outline"
              class="self-end"
              :disabled="sumaPreciosCursos <= 0"
              @click="usarSugerido"
            >
              Sugerir −15%
            </Button>
          </div>
        </div>

        <div class="grid gap-3 border border-border p-3">
          <p class="text-sm font-black">1. ¿Quién puede acceder?</p>
          <label class="grid gap-2 text-sm font-bold">
            Alcance
            <Select
              v-model="formulario.alcance"
              :options="opcionesAlcance"
              option-label="label"
              option-value="value"
              fluid
            />
          </label>
          <label
            v-if="formulario.alcance === 'AREA'"
            class="grid gap-2 text-sm font-bold"
          >
            Área con acceso
            <Select
              v-model="formulario.destinoArea"
              :options="areasInternas"
              option-label="label"
              option-value="value"
              fluid
            />
          </label>
        </div>

        <div class="grid gap-3 border border-border p-3">
          <p class="text-sm font-black">2. ¿A quién le das descuento?</p>
          <label class="grid gap-2 text-sm font-bold">
            Beneficiarios
            <Select
              v-model="formulario.descuentoAplicaA"
              :options="opcionesDescuento"
              option-label="label"
              option-value="value"
              fluid
            />
          </label>
          <label
            v-if="formulario.descuentoAplicaA === 'AREA'"
            class="grid gap-2 text-sm font-bold"
          >
            Área con descuento
            <Select
              v-model="formulario.descuentoArea"
              :options="areasInternas"
              option-label="label"
              option-value="value"
              fluid
            />
          </label>
          <label
            v-if="formulario.descuentoAplicaA !== 'NINGUNO'"
            class="grid gap-2 text-sm font-bold"
          >
            Descuento (%)
            <InputNumber
              v-model="formulario.descuentoInterno"
              :min="1"
              :max="100"
              suffix="%"
              fluid
            />
          </label>
          <p
            v-if="formulario.descuentoAplicaA !== 'NINGUNO' && formulario.descuentoInterno > 0"
            class="border border-emerald-500/30 bg-emerald-500/10 p-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300"
          >
            {{
              etiquetaDescuentoAplicaA(
                formulario.descuentoAplicaA,
                formulario.descuentoArea,
              )
            }}:
            S/ {{ precioConDescuento.toFixed(2) }} · el resto paga S/
            {{ formulario.precio.toFixed(2) }}
          </p>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <label class="grid gap-2 text-sm font-bold">
            Usuarios asignados
            <InputNumber v-model="formulario.usuarios" :min="0" fluid />
          </label>
          <label
            class="flex items-center justify-between border border-border p-3 text-sm font-bold"
          >
            Emitir certificado
            <ToggleSwitch v-model="formulario.certificado" />
          </label>
        </div>
      </div>
      <template #footer>
        <Button variant="outline" @click="modal = false">Cancelar</Button>
        <Button
          :disabled="guardando || !formularioValido()"
          @click="guardar"
        >
          {{ guardando ? "Guardando…" : "Guardar ruta" }}
        </Button>
      </template>
    </Dialog>
  </section>
</template>
