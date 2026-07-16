<script setup lang="ts">
import {
  ArrowLeft,
  Award,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  GripVertical,
  Image,
  Lock,
  Plus,
  Save,
  Send,
  ShieldCheck,
  Video,
} from "lucide-vue-next";
import { computed, onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Skeleton from "primevue/skeleton";
import {
  docenteService,
  type BorradorCursoDocente,
} from "@/api/services/docente.service";
import { useContextoSesion } from "@/composables/useContextoSesion";

const router = useRouter();
const route = useRoute();
const { contextoActivo } = useContextoSesion();
const paso = ref(1);
const cargando = ref(true);
const guardado = ref(false);
const enviado = ref(false);
const mostrandoVistaPrevia = ref(false);
const errorImagen = ref("");
const selectorImagen = ref<HTMLInputElement | null>(null);
const esIndependiente = computed(
  () =>
    contextoActivo.value?.ambitoDocencia === "INDEPENDIENTE" ||
    !contextoActivo.value?.organizacionId,
);
const nombreAmbito = computed(() =>
  esIndependiente.value
    ? "Curso propio · Docencia independiente"
    : `Curso institucional · ${contextoActivo.value?.organizacionNombre}`,
);
const membresiaId = contextoActivo.value?.membresiaId ?? "docente";
const cursoId = computed(() => String(route.params.cursoId ?? "nuevo"));

const valoresIniciales = {
  titulo: "Nuevo curso de formación",
  subtitulo: "",
  descripcion: "",
  publico: "Profesionales y técnicos de obra",
  objetivos: ["Aplicar los conceptos del curso en situaciones reales de obra"],
  requisitos: ["Conocimientos básicos de gestión de obras"],
  categoria: "Gestión de obras",
  nivel: "Básico",
  imagen: "",
  ambito: esIndependiente.value ? "INDEPENDIENTE" : "ORGANIZACION",
  organizacionId: contextoActivo.value?.organizacionId ?? null,
  acceso: esIndependiente.value ? "PAGO" : "ORGANIZACION",
  precio: esIndependiente.value ? 89 : 0,
  visibilidad: esIndependiente.value ? "PUBLICO" : "ORGANIZACION",
  permiteEmpresas: esIndependiente.value,
  certificado: true,
  nombreCertificado: "Certificado de aprobación",
  notaMinima: 14,
  vigenciaMeses: 0,
};
const curso = reactive({ ...valoresIniciales });
const secciones = ref([
  {
    titulo: "Introducción y fundamentos",
    clases: ["Bienvenida al curso", "Conceptos principales"],
  },
  { titulo: "Aplicación práctica", clases: ["Caso de estudio en obra"] },
]);
onMounted(async () => {
  try {
    const cursoExistente =
      cursoId.value === "nuevo"
        ? null
        : await docenteService.cursos.obtener(cursoId.value);
    const semilla = {
      ...valoresIniciales,
      titulo: cursoExistente?.titulo ?? valoresIniciales.titulo,
      imagen: cursoExistente?.imagen ?? valoresIniciales.imagen,
      ambito: cursoExistente?.ambito ?? valoresIniciales.ambito,
      organizacionId:
        cursoExistente?.organizacionId ?? valoresIniciales.organizacionId,
      acceso:
        cursoExistente?.modeloAcceso === "VENTA_INDIVIDUAL"
          ? "PAGO"
          : valoresIniciales.acceso,
      secciones: secciones.value,
    };
    const borrador = await docenteService.obtenerBorrador(
      membresiaId,
      cursoId.value,
      semilla,
    );
    const { secciones: seccionesGuardadas, ...datosCurso } = borrador;
    Object.assign(curso, datosCurso);
    secciones.value = seccionesGuardadas;
  } finally {
    cargando.value = false;
  }
});
const pasos = [
  "Planifica tu curso",
  "Programa y contenidos",
  "Página de presentación",
  "Precio y acceso",
  "Certificado",
  "Enviar a revisión",
];
const titulos = [
  "Planifica tu curso",
  "Programa y contenidos",
  "Página de presentación",
  "Precio y acceso",
  "Configura el certificado",
  "Enviar a revisión",
];
const descripciones = [
  "Define a quién está dirigido y qué logrará.",
  "Organiza secciones, clases y recursos.",
  "Diseña la información que verá el estudiante antes de inscribirse.",
  "Decide quién puede acceder y cómo se comercializa.",
  "Establece las condiciones y datos de certificación.",
  "Comprueba que todo esté listo para la evaluación de Tukuy.",
];
const requisitosRevision = computed(() => [
  {
    texto: "Información y público objetivo definidos",
    listo: !!curso.publico && curso.objetivos.length > 0,
  },
  {
    texto: "Programa con secciones y clases",
    listo:
      secciones.value.length > 0 &&
      secciones.value.every((s) => s.clases.length > 0),
  },
  {
    texto: "Página de presentación completa",
    listo:
      !!curso.titulo && !!curso.subtitulo && curso.descripcion.length >= 30,
  },
  {
    texto: "Precio y acceso configurados",
    listo:
      curso.acceso === "GRATUITO" ||
      curso.acceso === "ORGANIZACION" ||
      curso.precio > 0,
  },
  {
    texto: "Certificado configurado",
    listo: !curso.certificado || !!curso.nombreCertificado,
  },
]);
const listoParaEnviar = computed(() =>
  requisitosRevision.value.every((r) => r.listo),
);

function construirBorrador(): BorradorCursoDocente {
  return {
    ...structuredClone(curso),
    secciones: structuredClone(secciones.value),
  };
}

async function guardar() {
  await docenteService.guardarCursoDesdeBorrador(
    membresiaId,
    cursoId.value,
    construirBorrador(),
  );
  guardado.value = true;
  setTimeout(() => (guardado.value = false), 2000);
}
function agregarObjetivo() {
  curso.objetivos.push("Nuevo objetivo de aprendizaje");
}
function agregarRequisito() {
  curso.requisitos.push("Nuevo requisito");
}
function agregarSeccion() {
  secciones.value.push({ titulo: "Nueva sección", clases: ["Nueva clase"] });
}
async function enviarRevision() {
  if (!listoParaEnviar.value) return;
  await docenteService.enviarBorradorRevision(
    membresiaId,
    cursoId.value,
    construirBorrador(),
  );
  enviado.value = true;
}
async function siguiente() {
  await guardar();
  if (paso.value < 6) paso.value++;
}

function seleccionarImagen(evento: Event) {
  const archivo = (evento.target as HTMLInputElement).files?.[0];
  if (!archivo) return;
  errorImagen.value = "";
  if (!archivo.type.startsWith("image/")) {
    errorImagen.value = "Selecciona una imagen JPG, PNG o WebP.";
    return;
  }
  if (archivo.size > 1_500_000) {
    errorImagen.value =
      "La imagen debe pesar menos de 1.5 MB para esta demostración.";
    return;
  }
  const lector = new FileReader();
  lector.onload = () => {
    curso.imagen = String(lector.result ?? "");
  };
  lector.readAsDataURL(archivo);
}
</script>

<template>
  <section class="mx-auto grid max-w-350 gap-6">
    <div v-if="cargando" class="grid gap-6 lg:grid-cols-[270px_minmax(0,1fr)]">
      <Skeleton class="h-[520px] w-full" />
      <Skeleton class="h-[620px] w-full" />
    </div>
    <template v-else>
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            @click="router.push('/docente/cursos')"
            ><ArrowLeft class="h-5 w-5"
          /></Button>
          <div>
            <p class="text-xs font-bold uppercase text-primary">
              Constructor de curso
            </p>
            <h1 class="text-xl font-black">{{ curso.titulo }}</h1>
            <p class="mt-1 text-xs font-semibold text-muted-foreground">
              {{ nombreAmbito }}
            </p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <span
            v-if="guardado"
            class="text-xs text-emerald-700 dark:text-emerald-400"
            >Cambios guardados</span
          ><Button variant="outline" @click="guardar"
            ><Save class="h-4 w-4" />Guardar borrador</Button
          ><Button class="bg-primary" @click="mostrandoVistaPrevia = true"
            ><Eye class="h-4 w-4" />Vista previa</Button
          >
        </div>
      </div>

      <div class="grid gap-6 lg:grid-cols-[270px_minmax(0,1fr)]">
        <Card class="h-fit border-border bg-card"
          ><CardContent class="p-3"
            ><button
              v-for="(nombre, i) in pasos"
              :key="nombre"
              class="flex w-full items-center gap-3 rounded-lg p-3 text-left text-sm font-semibold"
              :class="
                paso === i + 1
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted'
              "
              @click="paso = i + 1"
            >
              <span
                class="grid h-6 w-6 place-items-center rounded-full text-xs"
                :class="paso === i + 1 ? 'bg-primary text-white' : 'bg-border'"
                >{{ i + 1 }}</span
              ><span class="flex-1">{{ nombre }}</span
              ><ChevronRight class="h-4 w-4" /></button></CardContent
        ></Card>

        <Card class="border-border bg-card"
          ><CardContent class="p-6 sm:p-8">
            <Badge class="bg-primary/10 text-primary"
              >Paso {{ paso }} de 6</Badge
            >
            <h2 class="mt-3 text-2xl font-black">{{ titulos[paso - 1] }}</h2>
            <p class="mt-2 text-sm text-muted-foreground">
              {{ descripciones[paso - 1] }}
            </p>

            <div v-if="paso === 1" class="mt-7 grid gap-6">
              <label class="grid gap-2 text-sm font-bold"
                >Estudiantes esperados<textarea
                  v-model="curso.publico"
                  class="min-h-24 rounded-md border p-3 font-normal"
                />
              </label>
              <div>
                <div class="flex justify-between">
                  <h3 class="font-bold">Objetivos de aprendizaje</h3>
                  <Button size="sm" variant="ghost" @click="agregarObjetivo"
                    ><Plus class="h-4 w-4" />Agregar</Button
                  >
                </div>
                <Input
                  v-for="(_, i) in curso.objetivos"
                  :key="i"
                  v-model="curso.objetivos[i]"
                  class="mt-2"
                />
              </div>
              <div>
                <div class="flex justify-between">
                  <h3 class="font-bold">Requisitos</h3>
                  <Button size="sm" variant="ghost" @click="agregarRequisito"
                    ><Plus class="h-4 w-4" />Agregar</Button
                  >
                </div>
                <Input
                  v-for="(_, i) in curso.requisitos"
                  :key="i"
                  v-model="curso.requisitos[i]"
                  class="mt-2"
                />
              </div>
            </div>

            <div v-else-if="paso === 2" class="mt-7 grid gap-4">
              <article
                v-for="(seccion, si) in secciones"
                :key="si"
                class="overflow-hidden rounded-xl border border-border"
              >
                <div class="flex items-center gap-3 bg-muted p-4">
                  <GripVertical class="h-5 w-5 text-muted-foreground" /><Input
                    v-model="seccion.titulo"
                    class="flex-1 border-0 bg-transparent font-bold shadow-none"
                  />
                </div>
                <div class="divide-y">
                  <div
                    v-for="(clase, ci) in seccion.clases"
                    :key="ci"
                    class="flex items-center gap-3 p-4"
                  >
                    <component
                      :is="ci === 0 ? Video : FileText"
                      class="h-4 w-4 text-primary"
                    /><Input
                      v-model="seccion.clases[ci]"
                      class="flex-1 border-0 shadow-none"
                    /><Badge variant="outline">{{
                      ci === 0 ? "Video" : "Lectura"
                    }}</Badge>
                  </div>
                  <Button
                    class="m-3"
                    variant="ghost"
                    @click="seccion.clases.push('Nueva clase')"
                    ><Plus class="h-4 w-4" />Agregar clase</Button
                  >
                  <div
                    class="m-3 grid gap-3 border border-amber-300 bg-amber-50 p-4 text-slate-900 sm:grid-cols-[auto_1fr_auto] sm:items-center dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-white"
                  >
                    <span
                      class="grid h-10 w-10 place-items-center bg-[#071F52] text-white"
                    >
                      <FileText class="h-5 w-5" />
                    </span>
                    <div>
                      <p
                        class="text-[10px] font-black uppercase tracking-[.16em] text-[#B87A00] dark:text-amber-300"
                      >
                        Actividad calificable obligatoria
                      </p>
                      <strong class="mt-1 block text-sm">
                        Evidencia aplicada · {{ seccion.titulo }}
                      </strong>
                      <p
                        class="mt-1 text-xs text-slate-600 dark:text-slate-300"
                      >
                        El estudiante entregará un PDF. La nota y las horas
                        aprobadas alimentarán el certificado.
                      </p>
                    </div>
                    <div class="text-left text-xs sm:text-right">
                      <strong class="block">Nota máxima 20</strong>
                      <span class="text-slate-500 dark:text-slate-300">
                        {{ Math.max(2, seccion.clases.length * 2) }} horas
                      </span>
                    </div>
                  </div>
                </div>
              </article>
              <Button
                variant="outline"
                class="border-dashed"
                @click="agregarSeccion"
                ><Plus class="h-4 w-4" />Agregar sección</Button
              >
            </div>

            <div v-else-if="paso === 3" class="mt-7 grid gap-5">
              <div class="grid gap-4 sm:grid-cols-2">
                <label class="grid gap-2 text-sm font-bold sm:col-span-2"
                  >Título público<Input v-model="curso.titulo" /></label
                ><label class="grid gap-2 text-sm font-bold sm:col-span-2"
                  >Subtítulo<Input
                    v-model="curso.subtitulo"
                    placeholder="Una promesa clara para el estudiante" /></label
                ><label class="grid gap-2 text-sm font-bold"
                  >Categoría<select
                    v-model="curso.categoria"
                    class="h-10 rounded-md border px-3 font-normal"
                  >
                    <option>Gestión de obras</option>
                    <option>Seguridad</option>
                    <option>Logística</option>
                  </select></label
                ><label class="grid gap-2 text-sm font-bold"
                  >Nivel<select
                    v-model="curso.nivel"
                    class="h-10 rounded-md border px-3 font-normal"
                  >
                    <option>Básico</option>
                    <option>Intermedio</option>
                    <option>Avanzado</option>
                  </select></label
                ><label class="grid gap-2 text-sm font-bold sm:col-span-2"
                  >Descripción<textarea
                    v-model="curso.descripcion"
                    class="min-h-32 rounded-md border p-3 font-normal"
                    placeholder="Mínimo 30 caracteres"
                  />
                </label>
              </div>
              <div
                class="rounded-xl border-2 border-dashed border-blue-200 bg-primary/10/50 p-7 text-center"
              >
                <img
                  v-if="curso.imagen"
                  :src="curso.imagen"
                  alt="Vista previa de la portada"
                  class="mx-auto mb-4 aspect-video max-h-56 w-full object-cover"
                />
                <Image v-else class="mx-auto h-8 w-8 text-primary" />
                <p class="mt-2 font-bold">Imagen de portada</p>
                <p class="text-xs text-muted-foreground">
                  JPG o PNG · proporción 16:9
                </p>
                <input
                  ref="selectorImagen"
                  class="hidden"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  @change="seleccionarImagen"
                />
                <Button
                  class="mt-3"
                  size="sm"
                  variant="outline"
                  @click="selectorImagen?.click()"
                  >Seleccionar imagen</Button
                >
                <p
                  v-if="errorImagen"
                  class="mt-2 text-xs font-semibold text-red-600"
                >
                  {{ errorImagen }}
                </p>
              </div>
            </div>

            <div v-else-if="paso === 4" class="mt-7 grid gap-6">
              <div
                v-if="!esIndependiente"
                class="border border-blue-200 border-l-4 border-l-primary bg-primary/10 p-5"
              >
                <p
                  class="text-xs font-black uppercase tracking-wide text-primary"
                >
                  Acceso institucional
                </p>
                <h3 class="mt-2 font-black">
                  {{ contextoActivo?.organizacionNombre }} controla la
                  asignación
                </h3>
                <p class="mt-2 text-sm leading-6 text-muted-foreground">
                  Este curso no tendrá precio individual. La organización
                  decidirá qué equipos o participantes podrán acceder mediante
                  sus licencias.
                </p>
              </div>
              <div v-else class="grid gap-3 sm:grid-cols-2">
                <button
                  v-for="tipo in ['GRATUITO', 'PAGO']"
                  :key="tipo"
                  class="rounded-xl border-2 p-5 text-left"
                  :class="
                    curso.acceso === tipo
                      ? 'border-blue-600 bg-primary/10'
                      : 'border-border'
                  "
                  @click="curso.acceso = tipo"
                >
                  <strong>{{
                    tipo === "GRATUITO" ? "Curso gratuito" : "Curso de pago"
                  }}</strong>
                  <p class="mt-1 text-xs text-muted-foreground">
                    {{
                      tipo === "GRATUITO"
                        ? "Acceso sin costo"
                        : "Venta individual o empresarial"
                    }}
                  </p>
                </button>
              </div>
              <label
                v-if="esIndependiente && curso.acceso === 'PAGO'"
                class="grid max-w-sm gap-2 text-sm font-bold"
                >Precio en soles<Input
                  v-model.number="curso.precio"
                  type="number"
                  min="1" /></label
              ><label
                v-if="esIndependiente"
                class="grid max-w-sm gap-2 text-sm font-bold"
                >Visibilidad<select
                  v-model="curso.visibilidad"
                  class="h-10 rounded-md border px-3 font-normal"
                >
                  <option value="PUBLICO">Catálogo público</option>
                  <option value="PRIVADO">Solo por invitación</option>
                  <option value="ORGANIZACION">Solo organizaciones</option>
                </select></label
              ><label
                v-if="esIndependiente"
                class="flex items-center gap-3 rounded-xl border p-4"
                ><input v-model="curso.permiteEmpresas" type="checkbox" /><span
                  ><b class="block text-sm">Permitir licencias empresariales</b
                  ><span class="text-xs text-muted-foreground"
                    >Las organizaciones podrán asignarlo a sus equipos.</span
                  ></span
                ></label
              >
            </div>

            <div
              v-else-if="paso === 5"
              class="mt-7 grid gap-6 lg:grid-cols-[1fr_360px]"
            >
              <div class="grid content-start gap-5">
                <label class="flex items-center gap-3 rounded-xl border p-4"
                  ><input v-model="curso.certificado" type="checkbox" /><span
                    ><b class="block">Emitir certificado</b
                    ><span class="text-xs text-muted-foreground"
                      >Se genera al cumplir las condiciones.</span
                    ></span
                  ></label
                ><template v-if="curso.certificado"
                  ><label class="grid gap-2 text-sm font-bold"
                    >Nombre del certificado<Input
                      v-model="curso.nombreCertificado" /></label
                  ><label class="grid gap-2 text-sm font-bold"
                    >Nota mínima (sobre 20)<Input
                      v-model.number="curso.notaMinima"
                      type="number"
                      min="0"
                      max="20" /></label
                  ><label class="grid gap-2 text-sm font-bold"
                    >Vigencia en meses<Input
                      v-model.number="curso.vigenciaMeses"
                      type="number"
                      min="0"
                    /><span class="font-normal text-muted-foreground"
                      >0 significa que no vence.</span
                    ></label
                  ></template
                >
              </div>
              <div
                class="rounded-xl border bg-linear-to-br from-[#071F52] to-[#0B3A78] p-6 text-center text-white"
              >
                <Award class="mx-auto h-10 w-10 text-amber-300" />
                <p class="mt-4 text-xs uppercase tracking-widest text-blue-200">
                  Tukuy Academy certifica que
                </p>
                <strong class="mt-4 block text-xl"
                  >Nombre del estudiante</strong
                >
                <p class="mt-3 text-xs text-blue-100">
                  completó satisfactoriamente
                </p>
                <p class="mt-2 font-bold">{{ curso.titulo }}</p>
                <div class="mx-auto mt-5 h-px w-28 bg-white/40" />
                <p class="mt-2 text-[10px]">Código verificable</p>
              </div>
            </div>

            <div v-else class="mt-7">
              <div
                v-if="enviado"
                class="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-8 text-center"
              >
                <CheckCircle2 class="mx-auto h-12 w-12 text-emerald-600" />
                <h3 class="mt-4 text-xl font-black">
                  Curso enviado a revisión
                </h3>
                <p class="mt-2 text-sm text-emerald-800 dark:text-emerald-300">
                  El equipo Tukuy evaluará el contenido y te notificará sus
                  observaciones.
                </p>
              </div>
              <template v-else
                ><div class="space-y-3">
                  <div
                    v-for="item in requisitosRevision"
                    :key="item.texto"
                    class="flex items-center gap-3 rounded-lg border p-4"
                  >
                    <span
                      class="grid h-7 w-7 place-items-center rounded-full"
                      :class="
                        item.listo
                          ? 'bg-emerald-500/10 text-emerald-600'
                          : 'bg-accent/15 text-[#B87A00] dark:text-accent'
                      "
                      ><Check v-if="item.listo" class="h-4 w-4" /><Lock
                        v-else
                        class="h-4 w-4" /></span
                    ><span class="flex-1 text-sm font-semibold">{{
                      item.texto
                    }}</span
                    ><Badge
                      :class="
                        item.listo
                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                          : 'bg-accent/15 text-[#B87A00] dark:text-accent'
                      "
                      >{{ item.listo ? "Listo" : "Pendiente" }}</Badge
                    >
                  </div>
                </div>
                <div class="mt-6 rounded-xl bg-muted p-4">
                  <div class="flex gap-3">
                    <ShieldCheck class="h-5 w-5 text-primary" />
                    <p class="text-sm text-muted-foreground">
                      Al enviar confirmas que el contenido es original y cumple
                      las políticas académicas de Tukuy.
                    </p>
                  </div>
                </div>
                <Button
                  class="mt-6 w-full bg-primary"
                  :disabled="!listoParaEnviar"
                  @click="enviarRevision"
                  ><Send class="h-4 w-4" />Enviar curso a revisión</Button
                ></template
              >
            </div>

            <div
              v-if="!enviado"
              class="mt-8 flex justify-between border-t pt-5"
            >
              <Button variant="outline" :disabled="paso === 1" @click="paso--"
                ><ChevronLeft class="h-4 w-4" />Anterior</Button
              ><Button v-if="paso < 6" @click="siguiente"
                >Guardar y continuar<ChevronRight class="h-4 w-4"
              /></Button>
            </div> </CardContent
        ></Card>
      </div>
    </template>
    <div
      v-if="mostrandoVistaPrevia"
      class="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4"
      @click.self="mostrandoVistaPrevia = false"
    >
      <article
        class="max-h-[90vh] w-full max-w-4xl overflow-auto border border-border bg-card shadow-2xl"
      >
        <div class="relative aspect-[16/7] bg-slate-900">
          <img
            v-if="curso.imagen"
            :src="curso.imagen"
            :alt="curso.titulo"
            class="h-full w-full object-cover opacity-65"
          />
          <div
            class="absolute inset-0 bg-linear-to-r from-slate-950 via-slate-950/60 to-transparent"
          />
          <div class="absolute inset-x-0 bottom-0 p-7 text-white sm:p-10">
            <Badge class="mb-4 bg-accent text-slate-950">{{
              curso.nivel
            }}</Badge>
            <h2 class="max-w-2xl text-3xl font-black">{{ curso.titulo }}</h2>
            <p class="mt-3 max-w-2xl text-sm text-slate-200">
              {{
                curso.subtitulo ||
                "Agrega un subtítulo para presentar el valor del curso."
              }}
            </p>
          </div>
        </div>
        <div class="grid gap-6 p-7 sm:grid-cols-[1fr_260px]">
          <div>
            <h3 class="font-black">Lo que aprenderás</h3>
            <ul class="mt-3 grid gap-2 text-sm text-muted-foreground">
              <li v-for="objetivo in curso.objetivos" :key="objetivo">
                ✓ {{ objetivo }}
              </li>
            </ul>
          </div>
          <div class="border-l border-border pl-5 text-sm">
            <p class="font-black">{{ curso.categoria }}</p>
            <p class="mt-2 text-muted-foreground">
              {{ secciones.length }} secciones ·
              {{
                secciones.reduce((total, item) => total + item.clases.length, 0)
              }}
              clases
            </p>
            <p class="mt-2 font-black text-primary">
              {{
                curso.acceso === "PAGO"
                  ? `S/ ${curso.precio}`
                  : "Acceso institucional o gratuito"
              }}
            </p>
          </div>
        </div>
        <div class="flex justify-end border-t border-border p-4">
          <Button @click="mostrandoVistaPrevia = false"
            >Cerrar vista previa</Button
          >
        </div>
      </article>
    </div>
  </section>
</template>
