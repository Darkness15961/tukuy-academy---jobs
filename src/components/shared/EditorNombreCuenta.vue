<script setup lang="ts">
import { UserRound } from "lucide-vue-next";
import { onMounted, ref } from "vue";

import { cuentaAlumnoService } from "@/api/services/cuenta-alumno.service";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { actualizarPerfilSesion, useAuth } from "@/composables/useAuth";
import { toast } from "@/lib/toast";

const emit = defineEmits<{
  guardado: [nombre: string];
}>();

const { currentUser } = useAuth();
const nombre = ref(currentUser.value?.name?.trim() || "");
const guardando = ref(false);

onMounted(async () => {
  try {
    const cuenta = await cuentaAlumnoService.obtener();
    if (cuenta.nombre) nombre.value = cuenta.nombre;
  } catch {
    /* RPC aún no aplicada: usa el nombre de sesión */
  }
});

async function guardar() {
  const valor = nombre.value.trim();
  if (!valor) {
    toast.error("Ingresa tu nombre completo.");
    return;
  }
  guardando.value = true;
  try {
    const cuenta = await cuentaAlumnoService.guardar({ nombre: valor });
    nombre.value = cuenta.nombre || valor;
    actualizarPerfilSesion({
      name: nombre.value,
    });
    emit("guardado", nombre.value);
    toast.success("Nombre actualizado.");
  } catch (causa) {
    toast.error(
      causa instanceof Error ? causa.message : "No se pudo guardar el nombre.",
    );
  } finally {
    guardando.value = false;
  }
}
</script>

<template>
  <Card class="shadow-sm">
    <CardHeader>
      <CardTitle class="flex items-center gap-2 text-lg">
        <UserRound class="h-5 w-5 text-primary" />
        Nombre completo
      </CardTitle>
    </CardHeader>
    <CardContent class="grid gap-4">
      <div>
        <label
          class="mb-1.5 block text-xs font-semibold uppercase text-muted-foreground"
          for="cuenta-nombre-completo"
        >
          Cómo te mostramos en la plataforma
        </label>
        <Input
          id="cuenta-nombre-completo"
          v-model="nombre"
          type="text"
          class="h-11"
          autocomplete="name"
          placeholder="Nombres y apellidos"
          :disabled="guardando"
        />
        <p class="mt-1.5 text-xs text-muted-foreground">
          Aparece en tu perfil, certificados, cabecera y en los portales donde
          entres con esta cuenta.
        </p>
      </div>
      <div class="flex justify-end">
        <Button size="sm" :disabled="guardando" @click="guardar">
          {{ guardando ? "Guardando…" : "Guardar nombre" }}
        </Button>
      </div>
    </CardContent>
  </Card>
</template>
