<script setup lang="ts">
import {
  CheckCircle2,
  Clock3,
  Download,
  Eye,
  FileText,
  Search,
} from "lucide-vue-next";
import { computed, onMounted, ref } from "vue";

import {
  academicoService,
  type EntregaActividadAcademica,
} from "@/api/services/academico.service";
import { docenteService } from "@/api/services/docente.service";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Skeleton from "primevue/skeleton";

const filtro = ref<"PENDIENTES" | "REVISADAS">("PENDIENTES");
const cargando = ref(true);
const guardando = ref(false);
const busqueda = ref("");
const entregas = ref<EntregaActividadAcademica[]>([]);
const seleccionada = ref<EntregaActividadAcademica>();
const nota = ref(14);
const retroalimentacion = ref("");
const opcionesBandeja = ["PENDIENTES", "REVISADAS"] as const;

const pendientes = computed(
  () =>
    entregas.value.filter((entrega) =>
      ["ENTREGADA", "EN_REVISION", "OBSERVADA"].includes(entrega.estado),
    ).length,
);
const revisadas = computed(
  () =>
    entregas.value.filter((entrega) => entrega.estado === "CALIFICADA").length,
);
const visibles = computed(() => {
  const termino = busqueda.value.toLowerCase().trim();
  return entregas.value.filter((entrega) => {
    const revisada = entrega.estado === "CALIFICADA";
    const coincideEstado = filtro.value === "REVISADAS" ? revisada : !revisada;
    return (
      coincideEstado &&
      entrega.archivo &&
      (!termino ||
        [
          entrega.estudianteNombre,
          entrega.actividadTitulo,
          entrega.cursoTitulo,
          entrega.archivo.nombre,
        ].some((valor) => valor.toLowerCase().includes(termino)))
    );
  });
});

async function cargar() {
  cargando.value = true;
  try {
    entregas.value = await academicoService.listarEntregasDocente();
  } finally {
    cargando.value = false;
  }
}

onMounted(cargar);

function abrirCalificacion(entrega: EntregaActividadAcademica) {
  seleccionada.value = entrega;
  nota.value = entrega.nota ?? 14;
  retroalimentacion.value = entrega.retroalimentacion ?? "";
}

async function guardarCalificacion() {
  if (!seleccionada.value || nota.value < 0 || nota.value > 20) {
    return;
  }
  guardando.value = true;
  try {
    await academicoService.calificarEntrega(
      seleccionada.value.id,
      nota.value,
      retroalimentacion.value.trim(),
    );
    await docenteService.sincronizarCertificadosElegibles(
      seleccionada.value.cursoId,
    );
    seleccionada.value = undefined;
    await cargar();
  } finally {
    guardando.value = false;
  }
}
</script>

<template>
  <section class="mx-auto grid max-w-375 gap-6">
    <div>
      <h1 class="text-2xl font-black">Evaluaciones y entregas</h1>
      <p class="mt-1 text-sm text-muted-foreground">
        Bandeja general de archivos enviados en todos tus cursos.
      </p>
    </div>

    <div class="grid gap-4 sm:grid-cols-3">
      <Card
        v-for="indicador in [
          {
            etiqueta: 'Pendientes',
            valor: pendientes,
            icono: Clock3,
            clase: 'border-t-accent',
          },
          {
            etiqueta: 'Revisadas',
            valor: revisadas,
            icono: CheckCircle2,
            clase: 'border-t-emerald-500',
          },
          {
            etiqueta: 'Con archivo PDF',
            valor: entregas.filter((item) => item.archivo).length,
            icono: FileText,
            clase: 'border-t-primary',
          },
        ]"
        :key="indicador.etiqueta"
        class="overflow-hidden border-border border-t-4 bg-card"
        :class="indicador.clase"
      >
        <CardContent class="flex items-center gap-4 p-5"
          ><span
            class="grid h-11 w-11 place-items-center bg-primary/10 text-primary"
            ><component :is="indicador.icono" class="h-5 w-5"
          /></span>
          <div>
            <strong class="text-2xl">{{ indicador.valor }}</strong>
            <p class="text-xs text-muted-foreground">
              {{ indicador.etiqueta }}
            </p>
          </div></CardContent
        >
      </Card>
    </div>

    <Card class="border-border bg-card">
      <CardContent class="p-0">
        <div class="flex flex-wrap gap-3 border-b border-border p-4">
          <label class="relative min-w-64 flex-1"
            ><Search
              class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input
              v-model="busqueda"
              class="pl-10"
              placeholder="Buscar estudiante, curso, actividad o PDF"
          /></label>
          <Button
            v-for="opcion in opcionesBandeja"
            :key="opcion"
            size="sm"
            :variant="filtro === opcion ? 'default' : 'outline'"
            @click="filtro = opcion"
            >{{ opcion }}</Button
          >
        </div>
        <div v-if="cargando" class="space-y-2 p-5">
          <Skeleton v-for="item in 5" :key="item" class="h-24 w-full" />
        </div>
        <div v-else-if="visibles.length" class="divide-y divide-border">
          <article
            v-for="entrega in visibles"
            :key="entrega.id"
            class="flex flex-wrap items-center gap-4 p-5"
          >
            <span
              class="grid h-11 w-11 place-items-center bg-red-500/10 text-red-600"
              ><FileText class="h-5 w-5"
            /></span>
            <div class="min-w-64 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <h2 class="font-bold">{{ entrega.actividadTitulo }}</h2>
                <Badge variant="outline">{{
                  entrega.moduloTitulo.split("·")[0]
                }}</Badge>
              </div>
              <p class="mt-1 text-xs text-muted-foreground">
                {{ entrega.estudianteNombre }} · {{ entrega.cursoTitulo }}
              </p>
              <p
                class="mt-1 max-w-xl truncate text-xs font-semibold text-red-700 dark:text-red-300"
              >
                {{ entrega.archivo?.nombre }}
              </p>
            </div>
            <div class="text-xs text-muted-foreground">
              <p>Intento {{ entrega.intento }}</p>
              <p class="mt-1">{{ entrega.estado.replace("_", " ") }}</p>
            </div>
            <div class="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                @click="academicoService.abrirArchivo(entrega)"
                ><Eye class="h-4 w-4" /></Button
              ><Button
                variant="ghost"
                size="icon"
                @click="academicoService.descargarArchivo(entrega)"
                ><Download class="h-4 w-4" /></Button
              ><Button
                :variant="
                  entrega.estado === 'CALIFICADA' ? 'outline' : 'default'
                "
                @click="abrirCalificacion(entrega)"
                >{{
                  entrega.estado === "CALIFICADA"
                    ? `Nota ${entrega.nota}`
                    : "Calificar"
                }}</Button
              >
            </div>
          </article>
        </div>
        <p v-else class="p-12 text-center text-sm text-muted-foreground">
          No existen entregas en esta bandeja.
        </p>
      </CardContent>
    </Card>

    <div
      v-if="seleccionada"
      class="fixed inset-0 z-[80] grid place-items-center bg-slate-950/70 p-4"
      @click.self="seleccionada = undefined"
    >
      <Card class="w-full max-w-2xl border-border bg-card shadow-2xl"
        ><CardContent class="p-7"
          ><p class="text-xs font-black uppercase tracking-widest text-primary">
            Calificar evidencia
          </p>
          <h2 class="mt-2 text-xl font-black">
            {{ seleccionada.actividadTitulo }}
          </h2>
          <p class="mt-1 text-sm text-muted-foreground">
            {{ seleccionada.estudianteNombre }} · {{ seleccionada.cursoTitulo }}
          </p>
          <div
            class="mt-5 flex items-center gap-3 border border-border bg-muted/40 p-4"
          >
            <FileText class="h-7 w-7 text-red-600" /><strong
              class="min-w-0 flex-1 truncate text-sm"
              >{{ seleccionada.archivo?.nombre }}</strong
            ><Button
              variant="outline"
              size="sm"
              @click="academicoService.abrirArchivo(seleccionada)"
              ><Eye class="h-4 w-4" />Ver PDF</Button
            ><Button
              variant="outline"
              size="sm"
              @click="academicoService.descargarArchivo(seleccionada)"
              ><Download class="h-4 w-4" />Descargar</Button
            >
          </div>
          <label class="mt-5 grid gap-2 text-sm font-bold"
            >Nota sobre 20<Input
              v-model.number="nota"
              type="number"
              min="0"
              max="20" /></label
          ><label class="mt-4 grid gap-2 text-sm font-bold"
            >Retroalimentación<textarea
              v-model="retroalimentacion"
              class="min-h-32 border border-border bg-background p-3 font-normal"
            />
          </label>
          <div class="mt-6 flex justify-end gap-2">
            <Button variant="outline" @click="seleccionada = undefined"
              >Cancelar</Button
            ><Button
              :disabled="guardando || nota < 0 || nota > 20"
              @click="guardarCalificacion"
              >{{ guardando ? "Guardando..." : "Guardar calificación" }}</Button
            >
          </div></CardContent
        ></Card
      >
    </div>
  </section>
</template>
