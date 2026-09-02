<script setup lang="ts">
import { MessageSquare, Paperclip, Search, Send } from "lucide-vue-next";
import { computed, onMounted, ref } from "vue";
import {
  docenteService,
  type ConversacionDocente,
} from "@/api/services/docente.service";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Skeleton from "primevue/skeleton";
import { toast } from "@/lib/toast";

const cargando = ref(true);
const error = ref("");
const conversaciones = ref<ConversacionDocente[]>([]);
const activa = ref<ConversacionDocente>();
const texto = ref("");
const busqueda = ref("");
const enviando = ref(false);
const conversacionesVisibles = computed(() => {
  const termino = busqueda.value.toLowerCase().trim();
  if (!termino) return conversaciones.value;
  return conversaciones.value.filter(
    (item) =>
      item.nombre.toLowerCase().includes(termino) ||
      item.mensaje.toLowerCase().includes(termino),
  );
});

onMounted(async () => {
  try {
    conversaciones.value = await docenteService.conversaciones.listar();
    if (conversaciones.value[0]) {
      await seleccionarConversacion(conversaciones.value[0]);
    }
  } catch (causa) {
    error.value =
      causa instanceof Error
        ? causa.message
        : "No se pudieron cargar las conversaciones.";
  } finally {
    cargando.value = false;
  }
});

async function enviar() {
  if (!activa.value || !texto.value.trim() || enviando.value) return;
  enviando.value = true;
  try {
    const actualizada = await docenteService.enviarMensaje(
      activa.value.id,
      texto.value.trim(),
    );
    const indice = conversaciones.value.findIndex(
      (item) => item.id === actualizada.id,
    );
    if (indice >= 0) conversaciones.value[indice] = actualizada;
    activa.value = actualizada;
    texto.value = "";
  } catch (causa) {
    toast.error(
      causa instanceof Error ? causa.message : "No se pudo enviar el mensaje.",
    );
  } finally {
    enviando.value = false;
  }
}

async function seleccionarConversacion(conversacion: ConversacionDocente) {
  const detalle =
    (await docenteService.conversaciones.obtener(conversacion.id)) ??
    conversacion;
  activa.value = detalle;
  if (detalle.noLeidos > 0 || conversacion.noLeidos > 0) {
    const actualizada = await docenteService.marcarConversacionLeida(
      detalle.id,
    );
    const indice = conversaciones.value.findIndex(
      (item) => item.id === actualizada.id,
    );
    if (indice >= 0) {
      conversaciones.value[indice] = {
        ...conversaciones.value[indice]!,
        ...actualizada,
        noLeidos: 0,
      };
    }
    activa.value = { ...actualizada, noLeidos: 0 };
  } else {
    const indice = conversaciones.value.findIndex(
      (item) => item.id === detalle.id,
    );
    if (indice >= 0) {
      conversaciones.value[indice] = {
        ...conversaciones.value[indice]!,
        mensaje: detalle.mensaje,
        hora: detalle.hora,
      };
    }
  }
}

function avisarAdjuntosPendientes() {
  toast.info("Los adjuntos estarán disponibles cuando el almacenamiento de archivos quede conectado al chat.");
}
</script>
<template>
  <section class="mx-auto max-w-375">
    <Card
      class="h-[calc(100vh-150px)] min-h-[600px] overflow-hidden border-border bg-card"
    >
      <CardContent class="grid h-full p-0 md:grid-cols-[340px_1fr]">
        <aside class="border-r border-border">
          <div class="border-b border-border p-4">
            <h1 class="text-xl font-black">Mensajes</h1>
            <div class="relative mt-3">
              <Search
                class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                v-model="busqueda"
                class="pl-10"
                placeholder="Buscar conversación..."
              />
            </div>
          </div>
          <div v-if="cargando" class="space-y-2 p-4">
            <Skeleton v-for="item in 5" :key="item" class="h-16 w-full" />
          </div>
          <p
            v-else-if="error"
            class="p-4 text-sm font-semibold text-red-600"
          >
            {{ error }}
          </p>
          <p
            v-else-if="!conversacionesVisibles.length"
            class="p-6 text-center text-sm text-muted-foreground"
          >
            Aún no hay conversaciones. Aparecerán cuando tengas alumnos
            matriculados en tus cursos.
          </p>
          <button
            v-for="c in conversacionesVisibles"
            :key="c.id"
            class="flex w-full gap-3 border-b border-border p-4 text-left"
            :class="activa?.id === c.id ? 'bg-primary/10' : 'hover:bg-muted'"
            @click="seleccionarConversacion(c)"
          >
            <Avatar>
              <AvatarFallback class="bg-primary/10 text-xs text-primary">{{
                c.iniciales
              }}</AvatarFallback>
            </Avatar>
            <div class="min-w-0 flex-1">
              <div class="flex justify-between">
                <strong class="truncate text-sm">{{ c.nombre }}</strong>
                <span class="text-[10px] text-muted-foreground">{{
                  c.hora
                }}</span>
              </div>
              <p class="mt-1 truncate text-xs text-muted-foreground">
                {{ c.mensaje }}
              </p>
            </div>
            <span
              v-if="c.noLeidos"
              class="grid h-5 w-5 place-items-center rounded-full bg-primary text-[10px] text-white"
              >{{ c.noLeidos }}</span
            >
          </button>
        </aside>
        <div class="flex min-w-0 flex-col">
          <div
            v-if="activa"
            class="flex items-center gap-3 border-b border-border p-4"
          >
            <Avatar>
              <AvatarFallback class="bg-primary text-xs text-white">{{
                activa.iniciales
              }}</AvatarFallback>
            </Avatar>
            <div>
              <strong>{{ activa.nombre }}</strong>
              <p class="text-xs text-muted-foreground">Conversación del curso</p>
            </div>
          </div>
          <div
            v-else
            class="flex flex-1 flex-col items-center justify-center gap-2 bg-muted p-8 text-center text-muted-foreground"
          >
            <MessageSquare class="h-8 w-8 opacity-40" />
            <p class="text-sm">Selecciona una conversación</p>
          </div>
          <div
            v-if="activa"
            class="flex-1 space-y-3 overflow-y-auto bg-muted p-5"
          >
            <p
              v-if="!(activa.mensajes ?? []).length"
              class="py-10 text-center text-sm text-muted-foreground"
            >
              Escribe el primer mensaje.
            </p>
            <div
              v-for="mensaje in activa.mensajes ?? []"
              :key="mensaje.id"
              class="max-w-md p-3 text-sm shadow-sm"
              :class="
                mensaje.autor === 'DOCENTE'
                  ? 'ml-auto bg-primary text-white'
                  : 'bg-card'
              "
            >
              <p>{{ mensaje.contenido }}</p>
              <div
                v-if="mensaje.adjunto"
                class="mt-2 border border-current/20 px-3 py-2 text-xs"
              >
                <Paperclip class="mr-1 inline h-3.5 w-3.5" />{{
                  mensaje.adjunto.nombre
                }}
              </div>
              <p class="mt-1 text-right text-[10px] opacity-70">
                {{ mensaje.hora }}
              </p>
            </div>
          </div>
          <form
            v-if="activa"
            class="border-t border-border p-4"
            @submit.prevent="enviar"
          >
            <div class="flex gap-2">
              <Button
                type="button"
                size="icon"
                variant="outline"
                title="Adjuntos próximamente"
                @click="avisarAdjuntosPendientes"
              >
                <Paperclip class="h-4 w-4" />
              </Button>
              <Input
                v-model="texto"
                class="flex-1"
                placeholder="Escribe un mensaje..."
                :disabled="enviando"
              />
              <Button type="submit" :disabled="enviando || !texto.trim()">
                <Send class="h-4 w-4" />
              </Button>
            </div>
          </form>
        </div>
      </CardContent>
    </Card>
  </section>
</template>
