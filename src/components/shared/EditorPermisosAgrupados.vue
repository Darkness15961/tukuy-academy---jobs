<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { ChevronLeft, ChevronRight } from "lucide-vue-next";

import { Button } from "@/components/ui/button";

export type PermisoEditorItem = {
  codigo: string;
  etiqueta: string;
  descripcion?: string | null;
  meta?: string | null;
};

export type GrupoPermisosEditor = {
  id: string;
  nombre: string;
  descripcion?: string | null;
  permisos: PermisoEditorItem[];
};

const props = withDefaults(
  defineProps<{
    grupos: GrupoPermisosEditor[];
    modelValue: string[];
    disabled?: boolean;
    ayuda?: string;
    /** Activa interruptores por área/módulo en lugar de listar todos los permisos de entrada. */
    modoModulo?: boolean;
  }>(),
  {
    disabled: false,
    ayuda: "Activa las áreas que necesitas. Solo abre el detalle si quieres afinar permisos puntuales.",
    modoModulo: false,
  },
);

const emit = defineEmits<{
  "update:modelValue": [value: string[]];
}>();

const grupoActivoId = ref<string | null>(null);

watch(
  () => props.grupos,
  () => {
    if (
      grupoActivoId.value &&
      !props.grupos.some((grupo) => grupo.id === grupoActivoId.value)
    ) {
      grupoActivoId.value = null;
    }
  },
);

const seleccion = computed(() => new Set(props.modelValue));

const grupoActivo = computed(
  () => props.grupos.find((grupo) => grupo.id === grupoActivoId.value) ?? null,
);

const areasActivas = computed(() =>
  props.grupos.filter((grupo) => conteoGrupo(grupo).activos > 0).length,
);

function conteoGrupo(grupo: GrupoPermisosEditor) {
  const activos = grupo.permisos.filter((permiso) =>
    seleccion.value.has(permiso.codigo),
  ).length;
  return { activos, total: grupo.permisos.length };
}

function estadoGrupo(grupo: GrupoPermisosEditor) {
  const { activos, total } = conteoGrupo(grupo);
  if (activos <= 0) return "off" as const;
  if (activos >= total) return "on" as const;
  return "partial" as const;
}

function abrirGrupo(id: string) {
  grupoActivoId.value = id;
}

function volverAGrupos() {
  grupoActivoId.value = null;
}

function alternar(codigo: string) {
  if (props.disabled) return;
  const actual = new Set(props.modelValue);
  if (actual.has(codigo)) actual.delete(codigo);
  else actual.add(codigo);
  emit("update:modelValue", [...actual]);
}

function alternarTodoGrupo(grupo: GrupoPermisosEditor, activar: boolean) {
  if (props.disabled) return;
  const actual = new Set(props.modelValue);
  for (const permiso of grupo.permisos) {
    if (activar) actual.add(permiso.codigo);
    else actual.delete(permiso.codigo);
  }
  emit("update:modelValue", [...actual]);
}
</script>

<template>
  <div class="grid gap-3">
    <p v-if="ayuda" class="text-xs text-muted-foreground">{{ ayuda }}</p>

    <p
      v-if="modoModulo && grupos.length && !grupoActivo"
      class="text-xs font-semibold text-foreground"
    >
      {{ areasActivas }} de {{ grupos.length }} áreas activas
    </p>

    <!-- Lista de grupos -->
    <div v-if="!grupoActivo" class="grid gap-2">
      <div
        v-for="grupo in grupos"
        :key="grupo.id"
        class="flex items-center gap-3 border border-border bg-card p-4 transition hover:border-primary/40"
      >
        <label
          v-if="modoModulo"
          class="flex min-w-0 flex-1 cursor-pointer items-start gap-3"
          :class="disabled ? 'opacity-70' : ''"
          @click.stop
        >
          <input
            type="checkbox"
            class="mt-1 h-4 w-4 shrink-0"
            :checked="estadoGrupo(grupo) === 'on'"
            :disabled="disabled"
            @change="
              alternarTodoGrupo(
                grupo,
                ($event.target as HTMLInputElement).checked,
              )
            "
          />
          <span class="min-w-0">
            <span class="block font-bold">{{ grupo.nombre }}</span>
            <span
              v-if="grupo.descripcion"
              class="mt-1 block text-xs text-muted-foreground"
            >
              {{ grupo.descripcion }}
            </span>
            <span class="mt-2 block text-[11px] font-semibold text-muted-foreground">
              <template v-if="estadoGrupo(grupo) === 'partial'">
                Parcial · {{ conteoGrupo(grupo).activos }}/{{ conteoGrupo(grupo).total }}
              </template>
              <template v-else-if="estadoGrupo(grupo) === 'on'">
                Área completa activa
              </template>
              <template v-else>
                Sin acceso
              </template>
            </span>
          </span>
        </label>

        <button
          v-else
          type="button"
          class="flex min-w-0 flex-1 items-center justify-between gap-3 text-left"
          @click="abrirGrupo(grupo.id)"
        >
          <span class="min-w-0">
            <span class="block font-bold">{{ grupo.nombre }}</span>
            <span
              v-if="grupo.descripcion"
              class="mt-1 block text-xs text-muted-foreground"
            >
              {{ grupo.descripcion }}
            </span>
            <span class="mt-2 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {{ conteoGrupo(grupo).activos }}/{{ conteoGrupo(grupo).total }} activos
            </span>
          </span>
          <ChevronRight class="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>

        <Button
          v-if="modoModulo"
          size="sm"
          variant="outline"
          type="button"
          @click="abrirGrupo(grupo.id)"
        >
          Afinar
        </Button>
      </div>

      <p
        v-if="!grupos.length"
        class="border border-dashed border-border p-6 text-center text-sm text-muted-foreground"
      >
        No hay áreas de acceso para configurar.
      </p>
    </div>

    <!-- Detalle de un grupo -->
    <div v-else class="grid gap-3">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <Button size="sm" variant="outline" @click="volverAGrupos">
          <ChevronLeft class="h-4 w-4" />
          Volver
        </Button>
        <div v-if="!disabled" class="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            @click="alternarTodoGrupo(grupoActivo!, true)"
          >
            Activar todo
          </Button>
          <Button
            size="sm"
            variant="outline"
            @click="alternarTodoGrupo(grupoActivo!, false)"
          >
            Quitar todo
          </Button>
        </div>
      </div>

      <div class="border border-border bg-card p-4">
        <p class="font-black">{{ grupoActivo!.nombre }}</p>
        <p v-if="grupoActivo!.descripcion" class="mt-1 text-sm text-muted-foreground">
          {{ grupoActivo!.descripcion }}
        </p>
        <p class="mt-2 text-xs text-muted-foreground">
          {{ conteoGrupo(grupoActivo!).activos }} de
          {{ conteoGrupo(grupoActivo!).total }} capacidades activas
        </p>
      </div>

      <div class="grid max-h-72 gap-2 overflow-auto pr-1 sm:grid-cols-2">
        <label
          v-for="permiso in grupoActivo!.permisos"
          :key="permiso.codigo"
          class="flex items-start gap-2 border border-border bg-background p-3 text-xs"
          :class="disabled ? 'opacity-70' : 'cursor-pointer hover:border-primary/40'"
        >
          <input
            type="checkbox"
            class="mt-0.5 h-4 w-4"
            :checked="seleccion.has(permiso.codigo)"
            :disabled="disabled"
            @change="alternar(permiso.codigo)"
          />
          <span class="min-w-0">
            <span class="font-semibold">{{ permiso.etiqueta }}</span>
            <span
              v-if="permiso.meta"
              class="ml-1 text-[10px] uppercase tracking-wide text-muted-foreground"
            >
              · {{ permiso.meta }}
            </span>
            <span
              v-if="permiso.descripcion"
              class="mt-0.5 block text-muted-foreground"
            >
              {{ permiso.descripcion }}
            </span>
          </span>
        </label>
      </div>
    </div>
  </div>
</template>
