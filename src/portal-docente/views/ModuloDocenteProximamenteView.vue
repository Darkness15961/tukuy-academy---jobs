<script setup lang="ts">
import { Construction } from "lucide-vue-next";
import { useRoute } from "vue-router";
import { Card, CardContent } from "@/components/ui/card";
const route = useRoute();
</script>
<template>
  <section class="mx-auto max-w-375">
    <Card class="border-border bg-card"
      ><CardContent
        class="grid min-h-[520px] place-items-center p-8 text-center"
        ><div>
          <div
            class="mx-auto grid h-16 w-16 place-items-center rounded-xl bg-primary/10 text-primary"
          >
            <Construction class="h-8 w-8" />
          </div>
          <h1 class="mt-5 text-2xl font-black">{{ route.meta.titulo }}</h1>
          <p class="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
            Este módulo forma parte de la siguiente entrega del portal docente.
            La navegación y los permisos ya están preparados.
          </p>
        </div></CardContent
      ></Card
    >
  </section>
</template>
