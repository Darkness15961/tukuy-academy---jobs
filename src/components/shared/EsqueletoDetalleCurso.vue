<script setup lang="ts">
import CargaPerezosaCurso from "@/components/shared/CargaPerezosaCurso.vue";

withDefaults(
  defineProps<{
    pantallaCompleta?: boolean;
  }>(),
  { pantallaCompleta: false },
);
</script>

<template>
  <CargaPerezosaCurso
    :pantalla-completa="pantallaCompleta"
    :mensajes="[
      'Cargando curso…',
      'Alistando recursos…',
      'Preparando materiales…',
      'Organizando módulos…',
      'Cargando avance…',
      'Casi listo…',
    ]"
  />
</template>
