<script setup lang="ts">
import {
  BookOpenCheck,
  ChevronLeft,
  ChevronRight,
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
import ToggleSwitch from "primevue/toggleswitch";
import { computed, onMounted, reactive, ref, toRaw, watch } from "vue";

import {
  organizacionService,
  type PropuestaCursoOrganizacion,
  type UsuarioOrganizacion,
} from "@/api/services/organizacion.service";
import { Button } from "@/components/ui/button";
import IconoAyuda from "@/components/shared/IconoAyuda.vue";
import {
  calcularPrecioConReglas,
  generarCodigoDescuento,
} from "@/lib/precio-curso";
import type { CategoriaCursoEntidad } from "@/modulos/comunidad/types/entidad-publica.types";
import { categoriasCursosService } from "@/portal-organizacion/services/categorias-cursos.service";
import type { RevisionAcademicaCurso } from "@/portal-organizacion/types/revision-curso.types";
import type {
  ConfiguracionPublicacionCurso,
  ReglaDescuentoCurso,
} from "@/types/comercializacion-curso.types";

const props = defineProps<{
  curso: PropuestaCursoOrganizacion;
  revision: RevisionAcademicaCurso;
  nodos: Array<{ label: string; value: string; usuarios: number }>;
  procesando: boolean;
}>();

const emit = defineEmits<{
  cancelar: [];
  confirmar: [configuracion: ConfiguracionPublicacionCurso];
  "aprobar-sin-publicar": [configuracion: ConfiguracionPublicacionCurso];
}>();

const paso = ref(1);
const categorias = ref<CategoriaCursoEntidad[]>([]);

const config = reactive<ConfiguracionPublicacionCurso>({
  categoriaPrincipalId: "",
  categoriaSecundariaIds: [],
  recomendarPorIntereses: true,
  alcance: "PUBLICO",
  nodoIds: [],
  incluirDescendientes: true,
  modalidadMatricula: "LIBRE",
  visibleParaExternos: true,
  precio: {
    modalidad: "CURSO_COMPLETO",
    moneda: "PEN",
    precioCompleto: props.curso.precio ?? 100,
    modulos: [],
  },
  certificacion: {
    habilitada: props.revision.certificadoPropuesto,
    incluidaConCurso: false,
    compraOpcional: true,
    precio: 40,
    moneda: "PEN",
    notaMinima: props.revision.notaMinimaPropuesta,
    porcentajeMinimoAvance: 100,
    requiereCompletarActividades: true,
  },
  politicaDescuentos: "SOLO_MEJOR",
  descuentos: [],
  obligatorio: false,
  fechaLimite: "",
});

const pasos = [
  "Clasificación",
  "Acceso",
  "Precio y certificado",
  "Descuentos",
  "Resumen",
];

const opcionesAlcance = [
  { label: "Público (internos y externos)", value: "PUBLICO" },
  { label: "Solo internos", value: "INTERNO" },
];

onMounted(async () => {
  categorias.value = (await categoriasCursosService.listar()).filter(
    (item) => item.estado === "ACTIVA",
  );
  const guardada = props.curso.configuracionPublicacion;
  if (guardada) {
    Object.assign(config, JSON.parse(JSON.stringify(guardada)));
  }
  if (!config.categoriaPrincipalId) {
    config.categoriaPrincipalId =
      categorias.value.find(
        (item) =>
          item.nombre.toLowerCase() === props.curso.categoria.toLowerCase(),
      )?.id ??
      categorias.value[0]?.id ??
      "";
  }
});

const categoriasAdicionales = computed(() =>
  categorias.value.filter((item) => item.id !== config.categoriaPrincipalId),
);

/** Curso gratuito ↔ de pago (sin venta por módulos). */
const cursoGratuito = computed({
  get: () => config.precio.modalidad === "GRATUITO",
  set: (gratuito: boolean) => {
    if (gratuito) {
      config.precio.modalidad = "GRATUITO";
      config.precio.precioCompleto = 0;
      return;
    }
    config.precio.modalidad = "CURSO_COMPLETO";
    if (config.precio.precioCompleto <= 0) {
      config.precio.precioCompleto = 100;
    }
  },
});

type ModeloCertificado = "NINGUNO" | "INCLUIDO" | "DE_PAGO";

const modeloCertificado = computed({
  get: (): ModeloCertificado => {
    if (!config.certificacion.habilitada) return "NINGUNO";
    if (config.certificacion.incluidaConCurso) return "INCLUIDO";
    return "DE_PAGO";
  },
  set: (modelo: ModeloCertificado) => {
    if (modelo === "NINGUNO") {
      config.certificacion.habilitada = false;
      config.certificacion.incluidaConCurso = false;
      config.certificacion.compraOpcional = false;
      config.certificacion.precio = 0;
      return;
    }
    config.certificacion.habilitada = true;
    if (modelo === "INCLUIDO") {
      config.certificacion.incluidaConCurso = true;
      config.certificacion.compraOpcional = false;
      config.certificacion.precio = 0;
      return;
    }
    config.certificacion.incluidaConCurso = false;
    config.certificacion.compraOpcional = true;
    if (config.certificacion.precio <= 0) {
      config.certificacion.precio = 40;
    }
  },
});

const opcionesAplicaSobre = computed(() => {
  const opciones: Array<{
    value: "CURSO_COMPLETO" | "CERTIFICADO";
    titulo: string;
    detalle: string;
  }> = [];
  if (!cursoGratuito.value) {
    opciones.push({
      value: "CURSO_COMPLETO",
      titulo: "Curso",
      detalle: "Rebaja el precio del contenido.",
    });
  }
  if (modeloCertificado.value === "DE_PAGO") {
    opciones.push({
      value: "CERTIFICADO",
      titulo: "Certificado",
      detalle: "Rebaja el precio del certificado al culminar.",
    });
  }
  return opciones;
});

const puedeConfigurarDescuentos = computed(
  () => opcionesAplicaSobre.value.length > 0,
);

const dirigidoANodos = computed({
  get: () => config.alcance === "INTERNO" || config.nodoIds.length > 0,
  set: (activo: boolean) => {
    if (activo) {
      config.alcance = "INTERNO";
      return;
    }
    config.alcance = "PUBLICO";
    config.nodoIds = [];
    config.obligatorio = false;
    config.modalidadMatricula = "LIBRE";
  },
});

function alternarCategoriaAdicional(id: string) {
  const indice = config.categoriaSecundariaIds.indexOf(id);
  if (indice >= 0) {
    config.categoriaSecundariaIds.splice(indice, 1);
    return;
  }
  config.categoriaSecundariaIds.push(id);
}

watch(
  () => config.categoriaPrincipalId,
  (principalId) => {
    config.categoriaSecundariaIds = config.categoriaSecundariaIds.filter(
      (id) => id !== principalId,
    );
  },
);

const pasoValido = computed(() => {
  if (paso.value === 1) {
    if (!config.categoriaPrincipalId) return false;
    if (dirigidoANodos.value && config.nodoIds.length === 0) return false;
    return true;
  }
  if (paso.value === 2) {
    return config.alcance === "PUBLICO" || config.nodoIds.length > 0;
  }
  if (paso.value === 3) {
    if (
      config.precio.modalidad === "CURSO_COMPLETO" &&
      config.precio.precioCompleto <= 0
    ) {
      return false;
    }
    if (
      config.certificacion.habilitada &&
      !config.certificacion.incluidaConCurso &&
      config.certificacion.precio <= 0
    ) {
      return false;
    }
  }
  return true;
});

watch(
  opcionesAplicaSobre,
  (opciones) => {
    const valores = new Set(opciones.map((item) => item.value));
    for (const regla of config.descuentos) {
      if (!valores.has(regla.aplicaSobre as "CURSO_COMPLETO" | "CERTIFICADO")) {
        regla.aplicaSobre = opciones[0]?.value ?? "CURSO_COMPLETO";
      }
    }
  },
  { deep: true },
);

const codigos = computed(() =>
  config.descuentos.filter((regla) => (regla.modo ?? "AUTOMATICO") === "CODIGO"),
);
const automaticosBasicos = computed(() =>
  config.descuentos.filter(
    (regla) =>
      (regla.modo ?? "AUTOMATICO") === "AUTOMATICO" &&
      (regla.beneficiario === "TODOS" ||
        regla.beneficiario === "INTERNOS" ||
        regla.beneficiario === "EXTERNOS"),
  ),
);
const reglasAvanzadas = computed(() =>
  config.descuentos.filter(
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

const codigoSimulacion = ref("");
const personaSimulacionId = ref("");
const codigoCopiadoId = ref("");
const modalAvanzado = ref(false);
const personas = ref<UsuarioOrganizacion[]>([]);
const busquedaPersona = ref("");
const cargandoPersonas = ref(false);

const opcionesPoliticaAvanzada = [
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
    detalle: "Aplica la de menor número de prioridad.",
  },
];

const puedeDescuentoPorNodo = computed(
  () => config.alcance === "INTERNO" && config.nodoIds.length > 0,
);

const nodosDisponiblesDescuento = computed(() =>
  props.nodos.filter((nodo) => config.nodoIds.includes(nodo.value)),
);

const personasFiltradas = computed(() => {
  const termino = busquedaPersona.value.trim().toLowerCase();
  if (!termino) return personas.value.slice(0, 8);
  return personas.value
    .filter((persona) =>
      [persona.nombre, persona.correo, persona.dni ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(termino),
    )
    .slice(0, 12);
});

const resumenAvanzado = computed(() => {
  const partes: string[] = [];
  if (reglasAvanzadas.value.length) {
    partes.push(
      `${reglasAvanzadas.value.length} regla${reglasAvanzadas.value.length === 1 ? "" : "s"}`,
    );
  }
  if (config.politicaDescuentos !== "SOLO_MEJOR") {
    partes.push(
      opcionesPoliticaAvanzada.find(
        (item) => item.value === config.politicaDescuentos,
      )?.titulo ?? config.politicaDescuentos,
    );
  }
  return partes.join(" · ");
});

function crearDescuentoBase(
  modo: ReglaDescuentoCurso["modo"],
): ReglaDescuentoCurso {
  const aplicaSobre = opcionesAplicaSobre.value[0]?.value ?? "CURSO_COMPLETO";
  return {
    id: `regla-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    nombre: modo === "CODIGO" ? "Cupón" : "Descuento automático",
    modo,
    codigo: modo === "CODIGO" ? generarCodigoDescuento() : undefined,
    aplicaSobre,
    moduloIds: [],
    beneficiario: modo === "CODIGO" ? "TODOS" : "INTERNOS",
    nodoIds: [],
    usuarioIds: [],
    tipo: "PORCENTAJE",
    valor: 10,
    acumulable: config.politicaDescuentos === "ACUMULABLES",
    prioridad: config.descuentos.length + 1,
    activa: true,
  };
}

function agregarCodigo() {
  if (!puedeConfigurarDescuentos.value) return;
  config.descuentos.push(crearDescuentoBase("CODIGO"));
}

function agregarAutomatico() {
  if (!puedeConfigurarDescuentos.value) return;
  config.descuentos.push(crearDescuentoBase("AUTOMATICO"));
}

function agregarDescuentoPorNodo() {
  if (!puedeConfigurarDescuentos.value || !puedeDescuentoPorNodo.value) return;
  const regla = crearDescuentoBase("AUTOMATICO");
  regla.nombre = "Descuento por nodo";
  regla.beneficiario = "NODOS";
  regla.nodoIds = [...config.nodoIds];
  config.descuentos.push(regla);
}

function agregarDescuentoPorPersona(persona: UsuarioOrganizacion) {
  if (!puedeConfigurarDescuentos.value) return;
  const yaExiste = config.descuentos.some(
    (regla) =>
      regla.beneficiario === "PERSONAS" &&
      regla.usuarioIds.includes(String(persona.id)),
  );
  if (yaExiste) return;
  const regla = crearDescuentoBase("AUTOMATICO");
  regla.nombre = `Descuento · ${persona.nombre}`;
  regla.beneficiario = "PERSONAS";
  regla.usuarioIds = [String(persona.id)];
  config.descuentos.push(regla);
  busquedaPersona.value = "";
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
  regla.codigo = generarCodigoDescuento();
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
  const sobre =
    regla.aplicaSobre === "CERTIFICADO" ? "certificado" : "curso";
  const monto =
    regla.tipo === "PORCENTAJE"
      ? `${regla.valor}%`
      : `S/ ${regla.valor.toFixed(2)}`;
  if ((regla.modo ?? "AUTOMATICO") === "CODIGO") {
    return `${monto} sobre ${sobre}`;
  }
  if (regla.beneficiario === "NODOS") {
    const nodos = regla.nodoIds.map(nombreNodo).slice(0, 2).join(", ");
    const extra =
      regla.nodoIds.length > 2 ? ` +${regla.nodoIds.length - 2}` : "";
    return `${monto} sobre ${sobre} · nodos: ${nodos}${extra}`;
  }
  if (regla.beneficiario === "PERSONAS") {
    const nombres = regla.usuarioIds.map(nombrePersona).slice(0, 2).join(", ");
    return `${monto} sobre ${sobre} · ${nombres || "persona"}`;
  }
  const quien =
    regla.beneficiario === "EXTERNOS"
      ? "externos"
      : regla.beneficiario === "TODOS"
        ? "todos"
        : "internos";
  return `${monto} sobre ${sobre} · ${quien}`;
}

function quitarDescuento(id: string) {
  config.descuentos = config.descuentos.filter((item) => item.id !== id);
}

function nombreCategoria(id: string) {
  return categorias.value.find((item) => item.id === id)?.nombre ?? "Sin categoría";
}

function precioBaseCurso() {
  return config.precio.modalidad === "GRATUITO" ? 0 : config.precio.precioCompleto;
}

function nodosParaSimulacionInterna() {
  if (config.nodoIds.length) return config.nodoIds;
  return reglasPorNodo.value.flatMap((regla) => regla.nodoIds);
}

const opcionesPersonaSimulacion = computed(() => {
  const ids = [
    ...new Set(reglasPorPersona.value.flatMap((regla) => regla.usuarioIds)),
  ];
  return ids.map((id) => ({
    label: nombrePersona(id),
    value: id,
  }));
});

watch(
  opcionesPersonaSimulacion,
  (opciones) => {
    if (
      personaSimulacionId.value &&
      !opciones.some((item) => item.value === personaSimulacionId.value)
    ) {
      personaSimulacionId.value = "";
    }
  },
  { deep: true },
);

function simulacion(
  condicion: "INTERNO" | "EXTERNO",
  componente: "CURSO_COMPLETO" | "CERTIFICADO",
) {
  return calcularPrecioConReglas({
    precioBase:
      componente === "CERTIFICADO"
        ? config.certificacion.precio
        : precioBaseCurso(),
    reglas: config.descuentos,
    politica: config.politicaDescuentos,
    perfil: {
      condicion,
      nodoIds: condicion === "INTERNO" ? nodosParaSimulacionInterna() : [],
      usuarioId: personaSimulacionId.value || undefined,
    },
    aplicaSobre: componente,
    codigo: codigoSimulacion.value || undefined,
  });
}

function etiquetaTipoRegla(regla: ReglaDescuentoCurso) {
  if ((regla.modo ?? "AUTOMATICO") === "CODIGO") return "Código";
  if (regla.beneficiario === "PERSONAS") return "Por persona";
  if (regla.beneficiario === "NODOS") return "Por nodo";
  return "Automático";
}

function tituloRegla(regla: ReglaDescuentoCurso) {
  if ((regla.modo ?? "AUTOMATICO") === "CODIGO") {
    return regla.codigo ? `Código ${regla.codigo}` : "Cupón";
  }
  return regla.nombre || "Descuento automático";
}

function siguiente() {
  if (pasoValido.value && paso.value < pasos.length) paso.value += 1;
}

function anterior() {
  if (paso.value > 1) paso.value -= 1;
}

/** Clona sin Proxy reactivo (structuredClone falla con reactive). */
function clonarConfiguracion(): ConfiguracionPublicacionCurso {
  return JSON.parse(JSON.stringify(toRaw(config))) as ConfiguracionPublicacionCurso;
}

function emitirAprobar(publicar: boolean) {
  const copia = clonarConfiguracion();
  if (publicar) emit("confirmar", copia);
  else emit("aprobar-sin-publicar", copia);
}

const descuentosActivos = computed(() =>
  config.descuentos.filter((regla) => regla.activa !== false),
);

function etiquetaPolitica() {
  return (
    opcionesPoliticaAvanzada.find(
      (item) => item.value === config.politicaDescuentos,
    )?.titulo ?? config.politicaDescuentos
  );
}

function nombresReglasAplicadas(
  condicion: "INTERNO" | "EXTERNO",
  componente: "CURSO_COMPLETO" | "CERTIFICADO",
) {
  return simulacion(condicion, componente)
    .reglasAplicadas.map(
      (regla) =>
        regla.nombre ||
        regla.codigo ||
        resumenRegla(regla),
    )
    .join(", ");
}

watch(paso, (actual) => {
  if (actual !== 4 || !puedeConfigurarDescuentos.value) return;
  if (automaticosBasicos.value.length === 0) {
    agregarAutomatico();
  }
});
</script>

<template>
  <div class="grid gap-6">
    <nav
      class="overflow-x-auto border border-border border-t-4 border-t-primary bg-card px-4 py-4"
      aria-label="Pasos de configuración comercial"
    >
      <ol class="flex min-w-max items-center gap-2">
        <li
          v-for="(nombre, indice) in pasos"
          :key="nombre"
          class="flex items-center gap-2"
        >
          <button
            type="button"
            class="flex items-center gap-2 px-2 py-1 text-xs font-black transition"
            :class="
              paso === indice + 1
                ? 'text-primary'
                : paso > indice + 1
                  ? 'text-emerald-600'
                  : 'text-muted-foreground'
            "
            :disabled="paso < indice + 1"
            @click="paso > indice + 1 && (paso = indice + 1)"
          >
            <span
              class="grid h-7 w-7 place-items-center rounded-full border text-[11px]"
              :class="
                paso >= indice + 1
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background'
              "
            >
              {{ paso > indice + 1 ? "✓" : indice + 1 }}
            </span>
            {{ nombre }}
          </button>
          <span
            v-if="indice < pasos.length - 1"
            class="h-px w-8 bg-border"
            aria-hidden="true"
          />
        </li>
      </ol>
    </nav>

    <!-- Paso 1: Clasificación -->
    <section v-if="paso === 1" class="grid gap-5 border border-border bg-card p-5">
      <div class="flex items-center gap-2">
        <h3 class="text-lg font-black">Clasificación</h3>
        <IconoAyuda
          texto="Las categorías ordenan y recomiendan el curso. Si lo diriges a nodos, el acceso interno se prepara aquí y se detalla en Acceso."
        />
      </div>

      <label class="grid max-w-xl gap-2">
        <span class="filtro-label filtro-label--principal">
          <span class="inline-flex items-center gap-1.5">
            Categoría principal
            <IconoAyuda
              texto="Categoría principal del curso en el catálogo de la entidad."
              lado="derecha"
            />
          </span>
        </span>
        <div class="flex items-center gap-2">
          <span
            class="h-10 w-1.5 shrink-0 bg-primary"
            aria-hidden="true"
          />
          <Select
            v-model="config.categoriaPrincipalId"
            class="filtro-control w-full"
            :options="categorias"
            option-label="nombre"
            option-value="id"
            panel-class="tukuy-filtro-panel"
            fluid
          />
        </div>
      </label>

      <div class="grid gap-3">
        <div>
          <p class="filtro-label filtro-label--adicional">
            <span class="inline-flex items-center gap-1.5">
              Categorías adicionales
              <IconoAyuda
                texto="Selección múltiple opcional. Ayuda a recomendaciones y reportes."
                lado="derecha"
              />
            </span>
          </p>
        </div>
        <div
          v-if="categoriasAdicionales.length"
          class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3"
        >
          <label
            v-for="categoria in categoriasAdicionales"
            :key="categoria.id"
            class="flex cursor-pointer items-center gap-3 border border-border bg-background px-3 py-3 text-sm font-bold transition hover:bg-muted/40"
            :class="
              config.categoriaSecundariaIds.includes(categoria.id)
                ? 'border-accent bg-accent/10'
                : ''
            "
          >
            <input
              type="checkbox"
              class="h-4 w-4 accent-[var(--color-accent)]"
              :checked="config.categoriaSecundariaIds.includes(categoria.id)"
              @change="alternarCategoriaAdicional(categoria.id)"
            />
            <span
              class="h-3 w-3 shrink-0"
              :style="{ backgroundColor: categoria.color }"
            />
            {{ categoria.nombre }}
          </label>
        </div>
        <p v-else class="text-xs text-muted-foreground">
          No hay más categorías activas para añadir.
        </p>
      </div>

      <label
        class="flex items-start gap-3 border border-border bg-muted/20 p-4"
      >
        <ToggleSwitch v-model="config.recomendarPorIntereses" />
        <span>
          <b class="block text-sm">Recomendar por intereses</b>
          <small class="text-muted-foreground">
            Aparecerá a alumnos con intereses alineados a estas categorías.
          </small>
        </span>
      </label>

      <div class="grid gap-4 border border-border border-t-4 border-t-accent p-4">
        <label class="flex items-start gap-3">
          <ToggleSwitch v-model="dirigidoANodos" />
          <span>
            <b class="block text-sm">Dirigido a nodos específicos</b>
            <small class="text-muted-foreground">
              Actívalo si el curso es para capítulos/áreas internas. El alcance
              pasa a interno; en Acceso eliges los nodos. La inscripción sigue
              siendo libre según precio/gratuidad.
            </small>
          </span>
        </label>
        <label v-if="dirigidoANodos" class="grid gap-2">
          <span class="filtro-label">Nodos destinatarios</span>
          <MultiSelect
            v-model="config.nodoIds"
            class="filtro-control w-full"
            :options="nodos"
            option-label="label"
            option-value="value"
            display="chip"
            filter
            placeholder="Selecciona uno o más nodos"
            panel-class="tukuy-filtro-panel"
            fluid
          />
        </label>
        <label
          v-if="dirigidoANodos"
          class="flex items-center gap-2 text-sm font-bold"
        >
          <ToggleSwitch v-model="config.incluirDescendientes" />
          Incluir nodos descendientes
        </label>
      </div>
    </section>

    <!-- Paso 2: Acceso -->
    <section
      v-else-if="paso === 2"
      class="grid gap-5 border border-border bg-card p-5"
    >
      <div class="flex items-center gap-2">
        <h3 class="text-lg font-black">Público y acceso</h3>
        <IconoAyuda
          texto="Quién puede ver e inscribirse. El cobro del curso y del certificado se define en el paso de precios."
        />
      </div>

      <label class="grid max-w-xl gap-2">
        <span class="filtro-label">Alcance</span>
        <Select
          v-model="config.alcance"
          class="filtro-control w-full"
          :options="opcionesAlcance"
          option-label="label"
          option-value="value"
          panel-class="tukuy-filtro-panel"
          fluid
        />
      </label>

      <div
        v-if="config.alcance === 'PUBLICO'"
        class="grid gap-2 border border-border border-l-4 border-l-primary bg-muted/20 p-4 text-sm"
      >
        <p class="font-black">Curso público</p>
        <p class="text-muted-foreground">
          Cualquier persona puede inscribirse según el precio del siguiente paso:
          si el curso es gratuito, entra directo; si tiene precio, se inscribe al
          pagar. El certificado puede cobrarse aparte solo cuando culmine el
          curso (también se configura en precios).
        </p>
        <p class="text-xs text-muted-foreground">
          No hace falta “modalidad de matrícula” ni “curso obligatorio” en oferta
          pública: no son un filtro de inscripción.
        </p>
      </div>

      <template v-else>
        <div
          class="grid gap-2 border border-border border-l-4 border-l-accent bg-muted/20 p-4 text-sm"
        >
          <p class="font-black">Curso interno</p>
          <p class="text-muted-foreground">
            Solo quienes tienen vinculación activa a los nodos habilitados pueden
            inscribirse. Si cumplen ese requisito, la inscripción es libre
            según el precio del siguiente paso: gratuito entra directo; con
            precio, al pagar. No hay aprobación adicional.
          </p>
        </div>

        <label class="grid gap-2">
          <span class="filtro-label">
            <span class="inline-flex items-center gap-1.5">
              Nodos habilitados
              <IconoAyuda
                texto="Única restricción de acceso: quien no pertenece a estos nodos no se inscribe; quien sí, sigue el precio o la gratuidad."
                lado="derecha"
              />
            </span>
          </span>
          <MultiSelect
            v-model="config.nodoIds"
            class="filtro-control w-full"
            :options="nodos"
            option-label="label"
            option-value="value"
            display="chip"
            panel-class="tukuy-filtro-panel"
            fluid
          />
        </label>

        <div class="flex flex-wrap gap-6 border border-border bg-muted/20 p-4">
          <label class="flex items-center gap-2 text-sm font-bold">
            <ToggleSwitch v-model="config.incluirDescendientes" />
            Incluir nodos descendientes
          </label>
          <label class="flex items-center gap-2 text-sm font-bold">
            <ToggleSwitch v-model="config.visibleParaExternos" />
            Mostrar bloqueado a externos
          </label>
        </div>

        <label
          class="flex items-start gap-3 border border-border bg-muted/20 p-4"
        >
          <ToggleSwitch v-model="config.obligatorio" class="mt-0.5" />
          <span>
            <b class="block text-sm">Marcar como formación obligatoria</b>
            <small class="text-muted-foreground">
              No cambia cómo se inscriben: solo marca el curso como pendiente
              obligatorio (compliance) para quienes están en los nodos.
            </small>
          </span>
        </label>
      </template>
    </section>

    <!-- Paso 3: Precio y certificado -->
    <section
      v-else-if="paso === 3"
      class="grid gap-5 border border-border bg-card p-5"
    >
      <div class="flex items-center gap-2">
        <h3 class="text-lg font-black">Precio del curso y certificación</h3>
        <IconoAyuda
          texto="Curso y certificado se cobran por separado. Ejemplo válido: curso gratis + certificado de pago solo al culminar."
        />
      </div>

      <div class="grid gap-4 lg:grid-cols-2">
        <!-- Bloque Curso -->
        <article class="grid gap-4 border border-border border-t-4 border-t-primary p-4">
          <div class="flex items-center gap-2">
            <h4 class="font-black">Curso</h4>
            <IconoAyuda
              texto="Define si el acceso al contenido es gratuito o de pago. Se vende el curso completo."
              lado="derecha"
            />
          </div>

          <label class="flex items-start gap-3 border border-border bg-muted/20 p-3">
            <ToggleSwitch v-model="cursoGratuito" class="mt-0.5" />
            <span>
              <b class="block text-sm">Curso gratuito</b>
              <small class="text-muted-foreground">
                Quien cumple el acceso se inscribe sin pagar el contenido.
              </small>
            </span>
          </label>

          <label v-if="!cursoGratuito" class="grid gap-2">
            <span class="filtro-label">Precio del curso</span>
            <InputNumber
              v-model="config.precio.precioCompleto"
              class="filtro-control w-full"
              mode="currency"
              currency="PEN"
              locale="es-PE"
              :min="0"
              fluid
            />
          </label>
          <p v-else class="text-sm font-bold text-emerald-700 dark:text-emerald-300">
            Acceso al contenido: S/ 0.00
          </p>
        </article>

        <!-- Bloque Certificado -->
        <article class="grid gap-4 border border-border border-t-4 border-t-accent p-4">
          <div class="flex items-center gap-2">
            <h4 class="font-black">Certificado</h4>
            <IconoAyuda
              texto="Independiente del curso. Puede no ofrecerse, ir incluido, o cobrarse al culminar."
              lado="derecha"
            />
          </div>

          <div class="grid gap-2">
            <label
              v-for="opcion in [
                {
                  valor: 'NINGUNO' as const,
                  titulo: 'Sin certificado',
                  detalle: 'Solo acceso al contenido.',
                },
                {
                  valor: 'INCLUIDO' as const,
                  titulo: 'Incluido en el curso',
                  detalle: 'Sin cargo extra al cumplir requisitos.',
                },
                {
                  valor: 'DE_PAGO' as const,
                  titulo: 'De pago al culminar',
                  detalle: 'El alumno lo compra cuando ya terminó.',
                },
              ]"
              :key="opcion.valor"
              class="flex cursor-pointer items-start gap-3 border border-border bg-background px-3 py-3 transition hover:bg-muted/40"
              :class="
                modeloCertificado === opcion.valor
                  ? 'border-accent bg-accent/10'
                  : ''
              "
            >
              <input
                v-model="modeloCertificado"
                type="radio"
                class="mt-1 h-4 w-4 accent-[var(--color-accent)]"
                :value="opcion.valor"
              />
              <span>
                <b class="block text-sm">{{ opcion.titulo }}</b>
                <small class="text-muted-foreground">{{ opcion.detalle }}</small>
              </span>
            </label>
          </div>

          <label
            v-if="modeloCertificado === 'DE_PAGO'"
            class="grid gap-2"
          >
            <span class="filtro-label">Precio del certificado</span>
            <InputNumber
              v-model="config.certificacion.precio"
              class="filtro-control w-full"
              mode="currency"
              currency="PEN"
              locale="es-PE"
              :min="0"
              fluid
            />
          </label>
        </article>
      </div>

      <div
        v-if="modeloCertificado !== 'NINGUNO'"
        class="grid gap-4 border border-border p-4"
      >
        <div class="flex items-center gap-2">
          <h4 class="text-sm font-black">Requisitos para emitir el certificado</h4>
          <IconoAyuda
            texto="Se evalúan al finalizar. Sin cumplirlos no se emite ni se ofrece la compra del certificado."
            lado="derecha"
          />
        </div>
        <div class="grid gap-4 md:grid-cols-3">
          <label class="grid gap-2">
            <span class="filtro-label">Nota mínima</span>
            <InputNumber
              v-model="config.certificacion.notaMinima"
              class="filtro-control w-full"
              :min="0"
              :max="20"
              fluid
            />
          </label>
          <label class="grid gap-2">
            <span class="filtro-label">Avance mínimo</span>
            <InputNumber
              v-model="config.certificacion.porcentajeMinimoAvance"
              class="filtro-control w-full"
              suffix="%"
              :min="1"
              :max="100"
              fluid
            />
          </label>
          <label class="flex items-end gap-2 pb-2 text-sm font-bold">
            <ToggleSwitch
              v-model="config.certificacion.requiereCompletarActividades"
            />
            Actividades completas
          </label>
        </div>
      </div>
    </section>

    <!-- Paso 4: Descuentos -->
    <section
      v-else-if="paso === 4"
      class="grid gap-5 border border-border bg-card p-5"
    >
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="flex items-center gap-2">
          <h3 class="text-lg font-black">Descuentos</h3>
          <IconoAyuda
            texto="Lo básico: códigos y descuentos por internos/externos/todos. En Avanzado: nodos, personas y cómo se combinan."
          />
        </div>
        <div class="flex flex-wrap gap-2">
          <Button
            size="sm"
            :disabled="!puedeConfigurarDescuentos"
            @click="agregarAutomatico"
          >
            <Plus class="h-4 w-4" />
            Automático
          </Button>
          <Button
            size="sm"
            variant="outline"
            :disabled="!puedeConfigurarDescuentos"
            @click="agregarCodigo"
          >
            <Ticket class="h-4 w-4" />
            Generar código
          </Button>
          <Button
            size="sm"
            variant="outline"
            :disabled="!puedeConfigurarDescuentos"
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
        v-if="!puedeConfigurarDescuentos"
        class="border border-border border-l-4 border-l-accent bg-muted/20 p-4 text-sm"
      >
        <p class="font-black">No hay precios que descontar</p>
        <p class="mt-1 text-muted-foreground">
          El curso es gratuito y el certificado no se cobra aparte.
        </p>
      </div>

      <template v-else>
        <div v-if="automaticosBasicos.length" class="grid gap-3">
          <p class="filtro-label mb-0">Descuentos automáticos</p>
          <article
            v-for="regla in automaticosBasicos"
            :key="regla.id"
            class="grid gap-4 border border-border border-t-4 border-t-primary p-4"
          >
            <div class="flex items-start justify-between gap-3">
              <InputText
                v-model="regla.nombre"
                class="filtro-control flex-1"
                placeholder="Ej. Precio colaborador"
              />
              <Button
                size="icon"
                variant="ghost"
                aria-label="Eliminar descuento"
                @click="quitarDescuento(regla.id)"
              >
                <Trash2 class="h-4 w-4 text-red-600" />
              </Button>
            </div>
            <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label class="grid gap-2">
                <span class="filtro-label">Para</span>
                <Select
                  v-model="regla.beneficiario"
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
                    @click="regla.tipo = 'PORCENTAJE'"
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
                    @click="regla.tipo = 'MONTO_FIJO'"
                  >
                    S/
                  </button>
                </div>
              </div>
              <label class="grid gap-2">
                <span class="filtro-label">Valor</span>
                <InputNumber
                  v-model="regla.valor"
                  class="filtro-control w-full"
                  :suffix="regla.tipo === 'PORCENTAJE' ? '%' : undefined"
                  :mode="regla.tipo === 'MONTO_FIJO' ? 'currency' : undefined"
                  :currency="regla.tipo === 'MONTO_FIJO' ? 'PEN' : undefined"
                  :locale="regla.tipo === 'MONTO_FIJO' ? 'es-PE' : undefined"
                  :min="0"
                  :max="regla.tipo === 'PORCENTAJE' ? 100 : undefined"
                  fluid
                />
              </label>
              <label class="grid gap-2">
                <span class="filtro-label">Aplica a</span>
                <Select
                  v-model="regla.aplicaSobre"
                  class="filtro-control w-full"
                  :options="opcionesAplicaSobre"
                  option-label="titulo"
                  option-value="value"
                  panel-class="tukuy-filtro-panel"
                  fluid
                />
              </label>
            </div>
            <p class="text-xs text-muted-foreground">{{ resumenRegla(regla) }}</p>
          </article>
        </div>        <div v-if="codigos.length" class="grid gap-3">
          <p class="filtro-label mb-0">Códigos de descuento</p>
          <article
            v-for="regla in codigos"
            :key="regla.id"
            class="grid gap-4 border border-border border-t-4 border-t-accent p-4"
          >
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div class="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                <InputText
                  v-model="regla.codigo"
                  class="filtro-control max-w-56 font-black tracking-wider uppercase"
                  @update:model-value="
                    regla.codigo = String($event ?? '')
                      .toUpperCase()
                      .replace(/\s+/g, '')
                  "
                />
                <Button size="sm" variant="outline" @click="copiarCodigo(regla)">
                  <Copy class="h-4 w-4" />
                  {{ codigoCopiadoId === regla.id ? 'Copiado' : 'Copiar' }}
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
                @click="quitarDescuento(regla.id)"
              >
                <Trash2 class="h-4 w-4 text-red-600" />
              </Button>
            </div>
            <div class="grid gap-3 sm:grid-cols-3">
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
                    @click="regla.tipo = 'PORCENTAJE'"
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
                    @click="regla.tipo = 'MONTO_FIJO'"
                  >
                    S/
                  </button>
                </div>
              </div>
              <label class="grid gap-2">
                <span class="filtro-label">Valor</span>
                <InputNumber
                  v-model="regla.valor"
                  class="filtro-control w-full"
                  :suffix="regla.tipo === 'PORCENTAJE' ? '%' : undefined"
                  :mode="regla.tipo === 'MONTO_FIJO' ? 'currency' : undefined"
                  :currency="regla.tipo === 'MONTO_FIJO' ? 'PEN' : undefined"
                  :locale="regla.tipo === 'MONTO_FIJO' ? 'es-PE' : undefined"
                  :min="0"
                  :max="regla.tipo === 'PORCENTAJE' ? 100 : undefined"
                  fluid
                />
              </label>
              <label class="grid gap-2">
                <span class="filtro-label">Aplica a</span>
                <Select
                  v-model="regla.aplicaSobre"
                  class="filtro-control w-full"
                  :options="opcionesAplicaSobre"
                  option-label="titulo"
                  option-value="value"
                  panel-class="tukuy-filtro-panel"
                  fluid
                />
              </label>
            </div>
            <p class="text-xs text-muted-foreground">{{ resumenRegla(regla) }}</p>
          </article>
        </div>


      </template>

      <p
        v-if="puedeConfigurarDescuentos && resumenAvanzado"
        class="text-xs text-muted-foreground"
      >
        Configuración avanzada activa:
        <button
          type="button"
          class="font-bold text-primary underline-offset-2 hover:underline"
          @click="abrirAvanzado"
        >
          {{ resumenAvanzado }}
        </button>
      </p>
    </section>

    <!-- Paso 5: Resumen -->
    <section
      v-else-if="paso === 5"
      class="grid gap-5 border border-border bg-card p-5"
    >
      <div class="flex items-center gap-2">
        <h3 class="text-lg font-black">Resumen antes de publicar</h3>
        <IconoAyuda
          texto="Simulación de precios según el perfil del alumno (interno o externo)."
        />
      </div>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div class="border border-border p-4">
          <small class="font-black uppercase tracking-wide text-primary">
            Clasificación
          </small>
          <p class="mt-2 font-black">
            {{ nombreCategoria(config.categoriaPrincipalId) }}
          </p>
          <p class="mt-1 text-xs text-muted-foreground">
            {{
              config.recomendarPorIntereses
                ? "Genera recomendaciones"
                : "Solo clasificación"
            }}
          </p>
        </div>
        <div class="border border-border p-4">
          <small class="font-black uppercase tracking-wide text-primary">
            Curso
          </small>
          <p class="mt-2 font-black">
            {{
              cursoGratuito
                ? "Gratuito"
                : `S/ ${config.precio.precioCompleto.toFixed(2)}`
            }}
          </p>
        </div>
        <div class="border border-border p-4">
          <small class="font-black uppercase tracking-wide text-primary">
            Acceso
          </small>
          <p class="mt-2 font-black">
            {{
              config.alcance === "PUBLICO"
                ? "Público"
                : `${config.nodoIds.length} nodos internos`
            }}
          </p>
          <p class="mt-1 text-xs text-muted-foreground">
            Inscripción según
            {{
              config.alcance === "PUBLICO"
                ? "precio / gratuidad"
                : "nodo habilitado + precio / gratuidad"
            }}
          </p>
        </div>
        <div class="border border-border p-4">
          <small class="font-black uppercase tracking-wide text-primary">
            Certificado
          </small>
          <p class="mt-2 font-black">
            {{
              modeloCertificado === "NINGUNO"
                ? "No disponible"
                : modeloCertificado === "INCLUIDO"
                  ? "Incluido"
                  : `Al culminar · S/ ${config.certificacion.precio.toFixed(2)}`
            }}
          </p>
        </div>
      </div>

      <div class="border border-border p-4">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <small class="font-black uppercase tracking-wide text-primary">
            Descuentos configurados ({{ descuentosActivos.length }})
          </small>
          <span class="text-xs text-muted-foreground">
            Política: {{ etiquetaPolitica() }}
          </span>
        </div>
        <p
          v-if="descuentosActivos.length > 1 && config.politicaDescuentos === 'SOLO_MEJOR'"
          class="mt-2 text-xs text-muted-foreground"
        >
          Con “Solo un descuento”, en la simulación solo se aplica la regla que
          más rebaja al perfil evaluado. Todas las reglas listadas sí quedan
          guardadas.
        </p>
        <ul
          v-if="descuentosActivos.length"
          class="mt-3 grid gap-2"
        >
          <li
            v-for="regla in descuentosActivos"
            :key="regla.id"
            class="flex flex-wrap items-start justify-between gap-2 border border-border px-3 py-2 text-sm"
          >
            <div class="min-w-0">
              <p class="font-black">
                {{ tituloRegla(regla) }}
              </p>
              <p class="text-xs text-muted-foreground">
                {{ resumenRegla(regla) }}
              </p>
            </div>
            <span
              class="shrink-0 text-[10px] font-black uppercase tracking-wide text-primary"
            >
              {{ etiquetaTipoRegla(regla) }}
            </span>
          </li>
        </ul>
        <p
          v-else
          class="mt-3 text-sm text-muted-foreground"
        >
          Sin descuentos configurados.
        </p>
      </div>

      <div
        v-if="codigos.length || reglasPorPersona.length"
        class="grid gap-4 sm:grid-cols-2"
      >
        <label
          v-if="codigos.length"
          class="grid gap-2"
        >
          <span class="filtro-label inline-flex items-center gap-1.5">
            Probar código en la simulación
            <IconoAyuda
              texto="Ingresa un cupón creado en Descuentos para ver el precio con ese código."
              lado="derecha"
            />
          </span>
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
        <label
          v-if="reglasPorPersona.length"
          class="grid gap-2"
        >
          <span class="filtro-label inline-flex items-center gap-1.5">
            Simular como persona
            <IconoAyuda
              texto="Los descuentos por persona solo aplican si eliges a esa persona aquí."
              lado="derecha"
            />
          </span>
          <Select
            v-model="personaSimulacionId"
            class="filtro-control w-full"
            :options="[
              { label: 'Ninguna (genérico)', value: '' },
              ...opcionesPersonaSimulacion,
            ]"
            option-label="label"
            option-value="value"
            panel-class="tukuy-filtro-panel"
            fluid
          />
        </label>
      </div>

      <div class="grid gap-4 md:grid-cols-2">
        <article
          v-for="condicion in (['INTERNO', 'EXTERNO'] as const)"
          :key="condicion"
          class="border border-border p-4"
        >
          <h4 class="font-black">
            Alumno {{ condicion === "INTERNO" ? "interno" : "externo" }}
            <span
              v-if="personaSimulacionId"
              class="block text-xs font-normal text-muted-foreground"
            >
              {{ nombrePersona(personaSimulacionId) }}
            </span>
          </h4>
          <dl class="mt-3 grid gap-2 text-sm">
            <div class="flex justify-between gap-3">
              <dt>Curso</dt>
              <dd class="font-black">
                S/
                {{
                  simulacion(condicion, "CURSO_COMPLETO").precioFinal.toFixed(2)
                }}
              </dd>
            </div>
            <div
              v-if="
                config.certificacion.habilitada &&
                !config.certificacion.incluidaConCurso
              "
              class="flex justify-between gap-3"
            >
              <dt>Certificado al completar</dt>
              <dd class="font-black">
                S/
                {{
                  simulacion(condicion, "CERTIFICADO").precioFinal.toFixed(2)
                }}
              </dd>
            </div>
            <div class="flex justify-between gap-3 text-muted-foreground">
              <dt>Reglas aplicadas</dt>
              <dd>
                {{
                  simulacion(condicion, "CURSO_COMPLETO").reglasAplicadas.length
                }}
              </dd>
            </div>
            <div
              v-if="nombresReglasAplicadas(condicion, 'CURSO_COMPLETO')"
              class="text-xs text-muted-foreground"
            >
              {{ nombresReglasAplicadas(condicion, "CURSO_COMPLETO") }}
            </div>
            <div
              v-else
              class="text-xs text-muted-foreground"
            >
              Sin descuento para este perfil
              <template v-if="reglasPorPersona.length && !personaSimulacionId">
                · elige una persona arriba para ver descuentos personales
              </template>
            </div>
          </dl>
        </article>
      </div>
      <label class="grid max-w-xs gap-2">
        <span class="filtro-label">Fecha límite (opcional)</span>
        <input
          v-model="config.fechaLimite"
          type="date"
          class="h-10 border border-input bg-background px-3 text-sm"
        />
      </label>
    </section>

    <footer
      class="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-3 border border-border bg-card px-4 py-4 shadow-[0_-8px_24px_rgba(0,0,0,0.06)]"
    >
      <Button variant="ghost" @click="emit('cancelar')">Cancelar</Button>
      <div class="flex flex-wrap gap-2">
        <Button v-if="paso > 1" variant="outline" @click="anterior">
          <ChevronLeft class="h-4 w-4" />
          Anterior
        </Button>
        <Button
          v-if="paso < pasos.length"
          :disabled="!pasoValido"
          @click="siguiente"
        >
          Siguiente
          <ChevronRight class="h-4 w-4" />
        </Button>
        <template v-else>
          <Button
            variant="outline"
            :disabled="procesando"
            @click="emitirAprobar(false)"
          >
            Aprobar sin publicar
          </Button>
          <Button
            :disabled="procesando"
            @click="emitirAprobar(true)"
          >
            <BookOpenCheck class="h-4 w-4" />
            Aprobar y publicar
          </Button>
        </template>
      </div>
    </footer>
    <Dialog
      v-model:visible="modalAvanzado"
      modal
      header="Descuentos avanzados"
      :style="{ width: 'min(44rem, 96vw)' }"
      :pt="{
        root: { class: 'rounded-none' },
        header: { class: 'rounded-none border-b border-border' },
        content: { class: 'rounded-none' },
      }"
    >
      <div class="grid gap-5">
        <p class="text-sm text-muted-foreground">
          Para estudiantes internos o externos. Los descuentos por nodo siguen el
          acceso definido en el paso Acceso
          <template v-if="config.alcance === 'INTERNO'">
            ({{ config.nodoIds.length }} nodo{{
              config.nodoIds.length === 1 ? "" : "s"
            }}
            habilitado{{ config.nodoIds.length === 1 ? "" : "s" }}).
          </template>
          <template v-else>
            (curso público: no aplica descuento por nodo interno).
          </template>
        </p>

        <div class="grid gap-2">
          <div class="flex items-center gap-2">
            <p class="filtro-label mb-0">Combinación de descuentos</p>
            <IconoAyuda
              texto="Define qué pasa si un estudiante cumple más de una regla."
              lado="derecha"
            />
          </div>
          <div class="grid gap-2 sm:grid-cols-3">
            <label
              v-for="opcion in opcionesPoliticaAvanzada"
              :key="opcion.value"
              class="flex cursor-pointer items-start gap-3 border border-border px-3 py-3 text-sm transition hover:bg-muted/40"
              :class="
                config.politicaDescuentos === opcion.value
                  ? 'border-primary bg-primary/5'
                  : ''
              "
            >
              <input
                v-model="config.politicaDescuentos"
                type="radio"
                class="mt-1 h-4 w-4 accent-[var(--color-primary)]"
                :value="opcion.value"
              />
              <span>
                <b class="block">{{ opcion.titulo }}</b>
                <small class="text-muted-foreground">{{ opcion.detalle }}</small>
              </span>
            </label>
          </div>
        </div>

        <div class="grid gap-3 border border-border p-4">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <h4 class="font-black">Por nodo</h4>
              <IconoAyuda
                texto="Solo disponibles si el curso es interno y tiene nodos habilitados en Acceso."
                lado="derecha"
              />
            </div>
            <Button
              size="sm"
              variant="outline"
              :disabled="!puedeDescuentoPorNodo"
              @click="agregarDescuentoPorNodo"
            >
              <Plus class="h-4 w-4" />
              Añadir por nodo
            </Button>
          </div>
          <p
            v-if="!puedeDescuentoPorNodo"
            class="text-xs text-muted-foreground"
          >
            Para habilitarlo, en Acceso elige “Solo internos” y selecciona nodos.
          </p>
          <article
            v-for="regla in reglasPorNodo"
            :key="regla.id"
            class="grid gap-3 border border-border border-t-4 border-t-primary p-3"
          >
            <div class="flex items-start justify-between gap-2">
              <InputText v-model="regla.nombre" class="filtro-control flex-1" />
              <Button
                size="icon"
                variant="ghost"
                @click="quitarDescuento(regla.id)"
              >
                <Trash2 class="h-4 w-4 text-red-600" />
              </Button>
            </div>
            <label class="grid gap-2">
              <span class="filtro-label">Nodos beneficiarios</span>
              <MultiSelect
                v-model="regla.nodoIds"
                class="filtro-control w-full"
                :options="nodosDisponiblesDescuento"
                option-label="label"
                option-value="value"
                display="chip"
                placeholder="Nodos del curso"
                panel-class="tukuy-filtro-panel"
                fluid
              />
            </label>
            <div class="grid gap-3 sm:grid-cols-3">
              <div class="flex border border-border">
                <button
                  type="button"
                  class="flex-1 px-3 py-2 text-sm font-black"
                  :class="
                    regla.tipo === 'PORCENTAJE'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background'
                  "
                  @click="regla.tipo = 'PORCENTAJE'"
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
                  @click="regla.tipo = 'MONTO_FIJO'"
                >
                  S/
                </button>
              </div>
              <InputNumber
                v-model="regla.valor"
                class="filtro-control w-full"
                :suffix="regla.tipo === 'PORCENTAJE' ? '%' : undefined"
                :mode="regla.tipo === 'MONTO_FIJO' ? 'currency' : undefined"
                :currency="regla.tipo === 'MONTO_FIJO' ? 'PEN' : undefined"
                :locale="regla.tipo === 'MONTO_FIJO' ? 'es-PE' : undefined"
                :min="0"
                :max="regla.tipo === 'PORCENTAJE' ? 100 : undefined"
                fluid
              />
              <Select
                v-model="regla.aplicaSobre"
                class="filtro-control w-full"
                :options="opcionesAplicaSobre"
                option-label="titulo"
                option-value="value"
                panel-class="tukuy-filtro-panel"
                fluid
              />
            </div>
            <label
              v-if="config.politicaDescuentos === 'ACUMULABLES'"
              class="flex items-center gap-2 text-sm font-bold"
            >
              <ToggleSwitch v-model="regla.acumulable" />
              Acumulable
            </label>
            <label
              v-if="config.politicaDescuentos === 'POR_PRIORIDAD'"
              class="grid max-w-32 gap-2"
            >
              <span class="filtro-label">Prioridad</span>
              <InputNumber
                v-model="regla.prioridad"
                class="filtro-control w-full"
                :min="1"
                fluid
              />
            </label>
          </article>
        </div>

        <div class="grid gap-3 border border-border p-4">
          <div class="flex items-center gap-2">
            <h4 class="font-black">Persona específica</h4>
            <IconoAyuda
              texto="Busca estudiantes por DNI o nombre y asígnales un descuento puntual."
              lado="derecha"
            />
          </div>
          <label class="relative grid gap-2">
            <span class="filtro-label">Buscar por DNI o nombre</span>
            <Search
              class="pointer-events-none absolute left-3 top-9 h-4 w-4 text-muted-foreground"
            />
            <InputText
              v-model="busquedaPersona"
              class="filtro-control w-full pl-10"
              placeholder="Ej. 45678912 o María Soto"
            />
          </label>
          <p v-if="cargandoPersonas" class="text-xs text-muted-foreground">
            Cargando estudiantes…
          </p>
          <div v-else class="grid max-h-48 gap-1 overflow-y-auto border border-border">
            <button
              v-for="persona in personasFiltradas"
              :key="persona.id"
              type="button"
              class="flex items-center justify-between gap-3 px-3 py-2 text-left text-sm transition hover:bg-muted/40"
              @click="agregarDescuentoPorPersona(persona)"
            >
              <span>
                <b class="block">{{ persona.nombre }}</b>
                <small class="text-muted-foreground">
                  {{ persona.dni ? `DNI ${persona.dni} · ` : ""
                  }}{{ persona.correo }}
                </small>
              </span>
              <Plus class="h-4 w-4 shrink-0 text-primary" />
            </button>
            <p
              v-if="!personasFiltradas.length"
              class="px-3 py-4 text-center text-xs text-muted-foreground"
            >
              No hay coincidencias.
            </p>
          </div>

          <article
            v-for="regla in reglasPorPersona"
            :key="regla.id"
            class="grid gap-3 border border-border border-t-4 border-t-accent p-3"
          >
            <div class="flex items-start justify-between gap-2">
              <div>
                <b class="text-sm">{{ regla.nombre }}</b>
                <p class="text-xs text-muted-foreground">
                  {{ resumenRegla(regla) }}
                </p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                @click="quitarDescuento(regla.id)"
              >
                <Trash2 class="h-4 w-4 text-red-600" />
              </Button>
            </div>
            <div class="grid gap-3 sm:grid-cols-3">
              <div class="flex border border-border">
                <button
                  type="button"
                  class="flex-1 px-3 py-2 text-sm font-black"
                  :class="
                    regla.tipo === 'PORCENTAJE'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background'
                  "
                  @click="regla.tipo = 'PORCENTAJE'"
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
                  @click="regla.tipo = 'MONTO_FIJO'"
                >
                  S/
                </button>
              </div>
              <InputNumber
                v-model="regla.valor"
                class="filtro-control w-full"
                :suffix="regla.tipo === 'PORCENTAJE' ? '%' : undefined"
                :mode="regla.tipo === 'MONTO_FIJO' ? 'currency' : undefined"
                :currency="regla.tipo === 'MONTO_FIJO' ? 'PEN' : undefined"
                :locale="regla.tipo === 'MONTO_FIJO' ? 'es-PE' : undefined"
                :min="0"
                :max="regla.tipo === 'PORCENTAJE' ? 100 : undefined"
                fluid
              />
              <Select
                v-model="regla.aplicaSobre"
                class="filtro-control w-full"
                :options="opcionesAplicaSobre"
                option-label="titulo"
                option-value="value"
                panel-class="tukuy-filtro-panel"
                fluid
              />
            </div>
          </article>
        </div>
      </div>
      <template #footer>
        <Button @click="modalAvanzado = false">Listo</Button>
      </template>
    </Dialog>

  </div>
</template>
