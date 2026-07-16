<script setup lang="ts">
import EstudiantesDocenteView from "@/portal-docente/views/EstudiantesDocenteView.vue";
</script>

<template>
  <EstudiantesDocenteView
    titulo="Alumnos por curso"
    etiqueta="Seguimiento institucional"
    descripcion="Consulta los alumnos gestionados por el Colegio de Ingenieros Cusco, su avance, estado académico y curso asignado."
    nombre-archivo="alumnos-colegio-ingenieros-cusco.csv"
    alcance="ORGANIZACION"
  />
</template>
