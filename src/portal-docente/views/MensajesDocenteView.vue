<script setup lang="ts">
import { Paperclip, Search, Send } from "lucide-vue-next";
import { computed, onMounted, ref } from "vue";
import {
  docenteService,
  type ConversacionDocente,
  type MensajeDocente,
} from "@/api/services/docente.service";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Skeleton from "primevue/skeleton";
const cargando = ref(true);
const conversaciones = ref<ConversacionDocente[]>([]);
const activa = ref<ConversacionDocente>();
const texto = ref("");
const busqueda = ref("");
const adjunto = ref<MensajeDocente["adjunto"]>();
const selectorArchivo = ref<HTMLInputElement | null>(null);
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
    activa.value = conversaciones.value[0];
  } finally {
    cargando.value = false;
  }
});

async function enviar() {
  if (!activa.value || (!texto.value.trim() && !adjunto.value)) return;
  const mensaje = texto.value.trim() || `Archivo: ${adjunto.value?.nombre}`;
  const actualizada = await docenteService.enviarMensaje(
    activa.value.id,
    mensaje,
    adjunto.value,
  );
  const indice = conversaciones.value.findIndex(
    (item) => item.id === actualizada.id,
  );
  if (indice >= 0) conversaciones.value[indice] = actualizada;
  activa.value = actualizada;
  texto.value = "";
  adjunto.value = undefined;
}

async function seleccionarConversacion(conversacion: ConversacionDocente) {
  activa.value = conversacion;
  if (conversacion.noLeidos > 0) {
    const actualizada = await docenteService.marcarConversacionLeida(
      conversacion.id,
    );
    const indice = conversaciones.value.findIndex(
      (item) => item.id === actualizada.id,
    );
    if (indice >= 0) conversaciones.value[indice] = actualizada;
    activa.value = actualizada;
  }
}

function adjuntarArchivo(evento: Event) {
  const archivo = (evento.target as HTMLInputElement).files?.[0];
  if (!archivo) return;
  adjunto.value = {
    nombre: archivo.name,
    tipo: archivo.type || "application/octet-stream",
    tamanio: archivo.size,
  };
}
</script>
<template>
  <section class="mx-auto max-w-375">
    <Card
      class="h-[calc(100vh-150px)] min-h-[600px] overflow-hidden border-border bg-card"
      ><CardContent class="grid h-full p-0 md:grid-cols-[340px_1fr]"
        ><aside class="border-r border-border">
          <div class="border-b border-border p-4">
            <h1 class="text-xl font-black">Mensajes</h1>
            <div class="relative mt-3">
              <Search
                class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              /><Input
                v-model="busqueda"
                class="pl-10"
                placeholder="Buscar conversación..."
              />
            </div>
          </div>
          <div v-if="cargando" class="space-y-2 p-4">
            <Skeleton v-for="item in 5" :key="item" class="h-16 w-full" />
          </div>
          <button
            v-for="c in conversacionesVisibles"
            :key="c.id"
            class="flex w-full gap-3 border-b border-border p-4 text-left"
            :class="activa?.id === c.id ? 'bg-primary/10' : 'hover:bg-muted'"
            @click="seleccionarConversacion(c)"
          >
            <Avatar
              ><AvatarFallback class="bg-primary/10 text-xs text-primary">{{
                c.iniciales
              }}</AvatarFallback></Avatar
            >
            <div class="min-w-0 flex-1">
              <div class="flex justify-between">
                <strong class="truncate text-sm">{{ c.nombre }}</strong
                ><span class="text-[10px] text-muted-foreground">{{
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
          <div class="flex items-center gap-3 border-b border-border p-4">
            <Avatar
              ><AvatarFallback class="bg-primary text-xs text-white">{{
                activa?.iniciales
              }}</AvatarFallback></Avatar
            >
            <div>
              <strong>{{ activa?.nombre }}</strong>
              <p class="text-xs text-emerald-600 dark:text-emerald-400">
                Activo recientemente
              </p>
            </div>
          </div>
          <div class="flex-1 space-y-3 overflow-y-auto bg-muted p-5">
            <div
              v-for="mensaje in activa?.mensajes ?? []"
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
          <form class="border-t border-border p-4" @submit.prevent="enviar">
            <div
              v-if="adjunto"
              class="mb-2 flex items-center justify-between bg-muted px-3 py-2 text-xs"
            >
              <span
                ><Paperclip class="mr-1 inline h-3.5 w-3.5" />{{
                  adjunto.nombre
                }}</span
              >
              <button
                type="button"
                class="font-bold text-red-600"
                @click="adjunto = undefined"
              >
                Quitar
              </button>
            </div>
            <div class="flex gap-2">
              <input
                ref="selectorArchivo"
                class="hidden"
                type="file"
                @change="adjuntarArchivo"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                @click="selectorArchivo?.click()"
                ><Paperclip class="h-5 w-5" /></Button
              ><Input
                v-model="texto"
                class="flex-1"
                placeholder="Escribe un mensaje..."
              /><Button size="icon"><Send class="h-4 w-4" /></Button>
            </div>
          </form></div></CardContent
    ></Card>
  </section>
</template>
