<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { KeyRound, Search, ShieldCheck, Trash2, UserRoundCog } from "lucide-vue-next";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import Tag from "primevue/tag";

import { organizacionService } from "@/api/services/organizacion.service";
import { organizacionPrincipalService } from "@/api/services/organizacion-principal.service";
import EditorPermisosAgrupados, {
  type GrupoPermisosEditor,
} from "@/components/shared/EditorPermisosAgrupados.vue";
import TituloConAyuda from "@/components/shared/TituloConAyuda.vue";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useContextoSesion } from "@/composables/useContextoSesion";
import { MODULOS_ACCESO, etiquetaLegiblePermiso, resumenModulosActivos } from "@/lib/control-acceso";
import type { PerfilEntidad } from "@/portal-organizacion/types/estructura-organizacional.types";
import type { UsuarioOrganizacion } from "@/api/services/organizacion.service";
import { toast } from "@/lib/toast";

type Pestana = "general" | "excepciones";
type ExcepcionPermiso = {
  id: string;
  identidadRef: string;
  permisoCodigo: string;
  efecto: "CONCEDER" | "DENEGAR";
  motivo: string;
  correo?: string | null;
  nombre?: string | null;
};

const { contextoActivo, tienePermiso } = useContextoSesion();
const cargando = ref(true);
const guardando = ref(false);
const pestana = ref<Pestana>("general");
const mensaje = ref("");
const error = ref("");
const perfiles = ref<PerfilEntidad[]>([]);
const usuarios = ref<UsuarioOrganizacion[]>([]);
const excepciones = ref<ExcepcionPermiso[]>([]);
const perfilEditando = ref<PerfilEntidad | null>(null);
const permisosEditando = ref<string[]>([]);
const modalPerfil = ref(false);
const modalExcepcion = ref(false);
const busquedaPersona = ref("");
const busquedaExcepcion = ref("");

const formularioExcepcion = reactive({
  identidadRef: "",
  permisoCodigo: "",
  efecto: "DENEGAR" as "CONCEDER" | "DENEGAR",
  motivo: "",
});

const puedeGestionar = computed(
  () =>
    tienePermiso("perfiles.administrar") ||
    tienePermiso("equipos.administrar") ||
    tienePermiso("entidad.gobernar"),
);

const gruposPermisos = computed((): GrupoPermisosEditor[] =>
  MODULOS_ACCESO.filter((modulo) => modulo.portal === "organizacion").map(
    (modulo) => ({
      id: modulo.id,
      nombre: modulo.nombre,
      descripcion: modulo.descripcion,
      permisos: modulo.permisos.map((codigo) => ({
        codigo,
        etiqueta: etiquetaLegiblePermiso(codigo),
      })),
    }),
  ),
);

const opcionesPermiso = computed(() =>
  MODULOS_ACCESO.filter((m) => m.portal === "organizacion").flatMap((modulo) =>
    modulo.permisos.map((codigo) => ({
      label: `${etiquetaLegiblePermiso(codigo)} · ${modulo.nombre}`,
      value: codigo,
    })),
  ),
);

const personasFiltradas = computed(() => {
  const termino = busquedaPersona.value.trim().toLocaleLowerCase("es");
  return usuarios.value
    .filter((u) => u.estado === "ACTIVO")
    .filter((u) => {
      if (!termino) return true;
      return [u.nombre, u.correo, u.rol]
        .join(" ")
        .toLocaleLowerCase("es")
        .includes(termino);
    })
    .slice(0, 12);
});

const excepcionesFiltradas = computed(() => {
  const termino = busquedaExcepcion.value.trim().toLocaleLowerCase("es");
  return excepciones.value.filter((item) => {
    if (!termino) return true;
    return [item.nombre, item.correo, item.permisoCodigo, item.efecto, item.motivo]
      .join(" ")
      .toLocaleLowerCase("es")
      .includes(termino);
  });
});

const personaSeleccionada = computed(
  () =>
    usuarios.value.find(
      (u) =>
        String(u.id) === formularioExcepcion.identidadRef ||
        u.correo === formularioExcepcion.identidadRef,
    ) ?? null,
);

function puedeEditarPerfil(perfil: PerfilEntidad) {
  if (!puedeGestionar.value) return false;
  if (perfil.tipo === "DIRECCION" && !tienePermiso("entidad.gobernar")) {
    return false;
  }
  return true;
}

async function cargar() {
  cargando.value = true;
  error.value = "";
  try {
    const instalacionId = contextoActivo.value?.organizacionId;
    const [listaPerfiles, listaUsuarios] = await Promise.all([
      organizacionService.estructura.perfiles.listar(),
      organizacionService.usuarios.listar(),
    ]);
    perfiles.value = listaPerfiles;
    usuarios.value = listaUsuarios;
    if (instalacionId && organizacionPrincipalService.activo()) {
      try {
        excepciones.value =
          await organizacionPrincipalService.listarExcepcionesPermiso(
            instalacionId,
          );
      } catch (e) {
        excepciones.value = [];
        error.value =
          e instanceof Error
            ? `${e.message} (¿ejecutaste 20260813200000_org_permisos_generales_excepciones_precio.sql en PRINCIPAL?)`
            : "No se pudieron cargar excepciones.";
      }
    } else {
      excepciones.value = [];
    }
  } catch (e) {
    error.value =
      e instanceof Error ? e.message : "No se pudieron cargar los accesos.";
  } finally {
    cargando.value = false;
  }
}

function abrirPerfil(perfil: PerfilEntidad) {
  perfilEditando.value = perfil;
  permisosEditando.value = [...perfil.permisos];
  modalPerfil.value = true;
  }

async function guardarPerfil() {
  if (!perfilEditando.value || !puedeEditarPerfil(perfilEditando.value)) return;
  guardando.value = true;
  error.value = "";
  try {
    const actualizado = await organizacionService.estructura.perfiles.actualizar(
      perfilEditando.value.id,
      { permisos: [...new Set(permisosEditando.value)] },
    );
    perfiles.value = perfiles.value.map((p) =>
      p.id === actualizado.id ? actualizado : p,
    );
    modalPerfil.value = false;
    toast.success(`Permisos generales de «${actualizado.nombre}» actualizados.`);
  } catch (e) {
    error.value =
      e instanceof Error ? e.message : "No se pudieron guardar los permisos.";
  } finally {
    guardando.value = false;
  }
}

function abrirNuevaExcepcion() {
  formularioExcepcion.identidadRef = "";
  formularioExcepcion.permisoCodigo = "cursos.definir_precio";
  formularioExcepcion.efecto = "DENEGAR";
  formularioExcepcion.motivo = "";
  busquedaPersona.value = "";
  modalExcepcion.value = true;
}

function elegirPersona(usuario: UsuarioOrganizacion) {
  formularioExcepcion.identidadRef = String(usuario.id);
  busquedaPersona.value = usuario.nombre;
}

async function guardarExcepcion() {
  const instalacionId = contextoActivo.value?.organizacionId;
  if (!instalacionId || !puedeGestionar.value) return;
  if (!formularioExcepcion.identidadRef || !formularioExcepcion.permisoCodigo) {
    error.value = "Elige una persona y un permiso.";
    return;
  }
  guardando.value = true;
  error.value = "";
  try {
    await organizacionPrincipalService.guardarExcepcionPermiso(instalacionId, {
      identidadRef: formularioExcepcion.identidadRef,
      permisoCodigo: formularioExcepcion.permisoCodigo,
      efecto: formularioExcepcion.efecto,
      motivo: formularioExcepcion.motivo,
    });
    excepciones.value =
      await organizacionPrincipalService.listarExcepcionesPermiso(instalacionId);
    modalExcepcion.value = false;
    toast.success("Excepción guardada. Aplica solo a esa persona.");
  } catch (e) {
    error.value =
      e instanceof Error ? e.message : "No se pudo guardar la excepción.";
  } finally {
    guardando.value = false;
  }
}

async function eliminarExcepcion(item: ExcepcionPermiso) {
  const instalacionId = contextoActivo.value?.organizacionId;
  if (!instalacionId || !puedeGestionar.value) return;
  guardando.value = true;
  try {
    await organizacionPrincipalService.eliminarExcepcionPermiso(
      instalacionId,
      item.id,
    );
    excepciones.value = excepciones.value.filter((e) => e.id !== item.id);
    toast.success("Excepción eliminada. Vuelve a regir el permiso del perfil.");
  } catch (e) {
    error.value =
      e instanceof Error ? e.message : "No se pudo eliminar la excepción.";
  } finally {
    guardando.value = false;
  }
}

onMounted(cargar);
</script>

<template>
  <div class="mx-auto grid max-w-6xl gap-6 p-4 sm:p-6">
    <TituloConAyuda
      titulo="Accesos de la organización"
      ayuda="Define qué puede hacer cada perfil (Dirección, Administración, etc.). Las excepciones son opcionales y solo para casos puntuales."
    />

    <div
      v-if="mensaje"
      class="border-l-4 border-l-emerald-500 bg-emerald-500/10 p-3 text-sm font-semibold text-emerald-800 dark:text-emerald-100"
    >
      {{ mensaje }}
    </div>
    <div
      v-if="error"
      class="border-l-4 border-l-red-500 bg-red-500/10 p-3 text-sm font-semibold text-red-700 dark:text-red-200"
    >
      {{ error }}
    </div>

    <div
      v-if="!puedeGestionar"
      class="border-l-4 border-l-amber-500 bg-amber-50 p-4 text-sm text-amber-950 dark:bg-amber-950/20 dark:text-amber-100"
    >
      Solo Dirección y Administración pueden configurar accesos de la entidad.
    </div>

    <div class="flex flex-wrap gap-2">
      <Button
        size="sm"
        :variant="pestana === 'general' ? 'default' : 'outline'"
        @click="pestana = 'general'"
      >
        <ShieldCheck class="h-4 w-4" />
        Permisos por perfil
      </Button>
      <Button
        size="sm"
        :variant="pestana === 'excepciones' ? 'default' : 'outline'"
        @click="pestana = 'excepciones'"
      >
        <UserRoundCog class="h-4 w-4" />
        Excepciones (avanzado)
      </Button>
    </div>

    <div v-if="cargando" class="grid gap-3 sm:grid-cols-2">
      <Skeleton v-for="n in 4" :key="n" class="h-40" />
    </div>

    <section v-else-if="pestana === 'general'" class="grid gap-4 sm:grid-cols-2">
      <Card v-for="perfil in perfiles" :key="perfil.id">
        <CardContent class="p-5">
          <div class="flex items-start justify-between gap-3">
            <span
              class="grid h-11 w-11 place-items-center bg-primary/10 text-primary"
            >
              <KeyRound class="h-5 w-5" />
            </span>
            <Tag
              :value="perfil.esSistema ? 'Sistema' : perfil.plantilla"
              :severity="perfil.esSistema ? 'warn' : 'info'"
            />
          </div>
          <h3 class="mt-5 text-lg font-black">{{ perfil.nombre }}</h3>
          <p class="mt-2 min-h-10 text-xs leading-5 text-muted-foreground">
            {{ perfil.descripcion }}
          </p>
          <div class="mt-4 border-t border-border pt-4">
            <div class="flex flex-wrap gap-1.5">
              <Tag
                v-for="modulo in resumenModulosActivos(perfil.permisos).slice(0, 4)"
                :key="`${perfil.id}-${modulo}`"
                :value="modulo"
                severity="secondary"
              />
              <Tag
                v-if="resumenModulosActivos(perfil.permisos).length > 4"
                :value="`+${resumenModulosActivos(perfil.permisos).length - 4}`"
                severity="secondary"
              />
            </div>
            <Button
              class="mt-4 w-full"
              size="sm"
              variant="outline"
              :disabled="!puedeEditarPerfil(perfil) && !puedeGestionar"
              @click="abrirPerfil(perfil)"
            >
              {{
                puedeEditarPerfil(perfil)
                  ? "Configurar accesos"
                  : "Ver accesos"
              }}
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>

    <section v-else class="grid gap-4">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <label class="min-w-[16rem] flex-1">
          <span class="filtro-label">Buscar excepciones</span>
          <span class="relative block">
            <Search
              class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            />
            <InputText
              v-model="busquedaExcepcion"
              class="filtro-control w-full pl-9"
              placeholder="Persona, permiso o efecto"
            />
          </span>
        </label>
        <Button
          v-if="puedeGestionar"
          class="bg-primary hover:bg-primary/90"
          @click="abrirNuevaExcepcion"
        >
          Nueva excepción
        </Button>
      </div>

      <article
        v-for="item in excepcionesFiltradas"
        :key="item.id"
        class="flex flex-wrap items-start justify-between gap-3 border border-border bg-card p-4"
      >
        <div class="min-w-0">
          <p class="font-black">
            {{ item.nombre || item.correo || item.identidadRef }}
          </p>
          <p class="mt-1 text-xs text-muted-foreground">{{ item.correo }}</p>
          <p class="mt-2 text-sm">
            <Tag
              :value="item.efecto"
              :severity="item.efecto === 'DENEGAR' ? 'danger' : 'success'"
            />
            <span class="ml-2 font-semibold">{{ etiquetaLegiblePermiso(item.permisoCodigo) }}</span>
          </p>
          <p v-if="item.motivo" class="mt-2 text-xs text-muted-foreground">
            {{ item.motivo }}
          </p>
        </div>
        <Button
          v-if="puedeGestionar"
          size="sm"
          variant="outline"
          :disabled="guardando"
          @click="eliminarExcepcion(item)"
        >
          <Trash2 class="h-4 w-4" />
          Quitar
        </Button>
      </article>

      <p
        v-if="!excepcionesFiltradas.length"
        class="border border-dashed border-border p-8 text-center text-sm text-muted-foreground"
      >
        Sin excepciones. El permiso general del perfil aplica a todas las
        personas con ese perfil.
      </p>
    </section>

    <Dialog
      v-model:visible="modalPerfil"
      modal
      :header="`Permisos generales · ${perfilEditando?.nombre ?? ''}`"
      :style="{ width: 'min(42rem, calc(100vw - 2rem))' }"
    >
      <EditorPermisosAgrupados
        v-if="perfilEditando"
        :key="perfilEditando.id"
        v-model="permisosEditando"
        :grupos="gruposPermisos"
        modo-modulo
        :disabled="!puedeEditarPerfil(perfilEditando)"
        ayuda="Activa las áreas del portal que puede usar este perfil. Usa «Afinar» solo si necesitas un permiso específico."
      />
      <template #footer>
        <Button variant="outline" @click="modalPerfil = false">Cerrar</Button>
        <Button
          v-if="perfilEditando && puedeEditarPerfil(perfilEditando)"
          :disabled="guardando"
          class="bg-primary hover:bg-primary/90"
          @click="guardarPerfil"
        >
          {{ guardando ? "Guardando…" : "Guardar permisos" }}
        </Button>
      </template>
    </Dialog>

    <Dialog
      v-model:visible="modalExcepcion"
      modal
      header="Excepción por persona"
      :style="{ width: 'min(40rem, calc(100vw - 2rem))' }"
    >
      <div class="grid gap-4">
        <p class="text-sm text-muted-foreground">
          Busca a la persona y elige conceder o denegar un permiso concreto
          (por ejemplo quitarle
          <code>cursos.definir_precio</code> aunque el perfil Docencia lo tenga).
        </p>
        <label>
          <span class="filtro-label">Buscar persona</span>
          <InputText
            v-model="busquedaPersona"
            class="filtro-control w-full"
            placeholder="Nombre o correo"
          />
        </label>
        <div class="max-h-40 space-y-1 overflow-auto">
          <button
            v-for="persona in personasFiltradas"
            :key="persona.id"
            type="button"
            class="flex w-full items-center justify-between gap-2 border border-border px-3 py-2 text-left text-sm hover:border-primary/50"
            :class="
              formularioExcepcion.identidadRef === String(persona.id)
                ? 'border-primary bg-primary/5'
                : ''
            "
            @click="elegirPersona(persona)"
          >
            <span class="min-w-0">
              <span class="block font-semibold">{{ persona.nombre }}</span>
              <span class="text-xs text-muted-foreground">{{
                persona.correo
              }}</span>
            </span>
            <span class="text-[10px] uppercase text-muted-foreground">{{
              persona.rol
            }}</span>
          </button>
        </div>
        <p v-if="personaSeleccionada" class="text-xs font-semibold">
          Seleccionada: {{ personaSeleccionada.nombre }}
        </p>
        <label>
          <span class="filtro-label">Permiso</span>
          <Select
            v-model="formularioExcepcion.permisoCodigo"
            :options="opcionesPermiso"
            option-label="label"
            option-value="value"
            class="filtro-control w-full"
            filter
            placeholder="Elige un permiso"
          />
        </label>
        <label>
          <span class="filtro-label">Efecto</span>
          <Select
            v-model="formularioExcepcion.efecto"
            :options="[
              { label: 'Denegar (excepción)', value: 'DENEGAR' },
              { label: 'Conceder (extra)', value: 'CONCEDER' },
            ]"
            option-label="label"
            option-value="value"
            class="filtro-control w-full"
          />
        </label>
        <label>
          <span class="filtro-label">Motivo (opcional)</span>
          <InputText
            v-model="formularioExcepcion.motivo"
            class="filtro-control w-full"
            placeholder="Caso especial"
          />
        </label>
      </div>
      <template #footer>
        <Button variant="outline" @click="modalExcepcion = false">Cancelar</Button>
        <Button
          :disabled="guardando"
          class="bg-primary hover:bg-primary/90"
          @click="guardarExcepcion"
        >
          {{ guardando ? "Guardando…" : "Guardar excepción" }}
        </Button>
      </template>
    </Dialog>
  </div>
</template>
