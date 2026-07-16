<script setup lang="ts">
import { Building2 } from "lucide-vue-next";
import { useRoute } from "vue-router";
import { Card, CardContent } from "@/components/ui/card";
const route = useRoute();
</script>
<template>
  <Card class="mx-auto max-w-375 border-border bg-card"
    ><CardContent class="grid min-h-[520px] place-items-center p-8 text-center"
      ><div>
        <div
          class="mx-auto grid h-16 w-16 place-items-center rounded-xl bg-primary/10 text-primary"
        >
          <Building2 class="h-8 w-8" />
        </div>
        <h1 class="mt-5 text-2xl font-black">{{ route.meta.titulo }}</h1>
        <p class="mt-2 text-sm text-muted-foreground">
          Módulo preparado para la siguiente entrega del portal empresarial.
        </p>
      </div></CardContent
    ></Card
  >
</template>
