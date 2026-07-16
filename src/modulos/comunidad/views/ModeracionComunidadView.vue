<script setup lang="ts">
import { AlertTriangle, CheckCircle2, ShieldCheck } from "lucide-vue-next";

const reportes = [
  { id: "rep-001", motivo: "Contenido promocional no relacionado", autor: "Usuario de demostración", estado: "Pendiente" },
  { id: "rep-002", motivo: "Información laboral engañosa", autor: "Empresa de demostración", estado: "En revisión" },
];
</script>

<template>
  <main class="mx-auto max-w-295 px-5 py-10 lg:px-8 lg:py-14">
    <p class="text-xs font-black uppercase tracking-[.22em] text-primary">Administración Tukuy</p>
    <h1 class="mt-3 text-4xl font-black sm:text-5xl">Moderación de Comunidad</h1>
    <p class="mt-4 text-muted-foreground">Revisa reportes y protege la calidad de las conversaciones.</p>

    <div class="mt-10 grid gap-4 sm:grid-cols-3">
      <div class="border-l-4 border-amber-500 bg-card p-6">
        <AlertTriangle class="h-5 w-5 text-amber-600" />
        <strong class="mt-4 block text-3xl font-black">{{ reportes.length }}</strong>
        <span class="text-sm text-muted-foreground">Reportes abiertos</span>
      </div>
      <div class="border-l-4 border-emerald-600 bg-card p-6">
        <CheckCircle2 class="h-5 w-5 text-emerald-600" />
        <strong class="mt-4 block text-3xl font-black">24</strong>
        <span class="text-sm text-muted-foreground">Resueltos este mes</span>
      </div>
      <div class="border-l-4 border-primary bg-card p-6">
        <ShieldCheck class="h-5 w-5 text-primary" />
        <strong class="mt-4 block text-3xl font-black">98.6%</strong>
        <span class="text-sm text-muted-foreground">Contenido saludable</span>
      </div>
    </div>

    <section class="mt-8 border border-border bg-card">
      <div class="border-b border-border p-6"><h2 class="text-xl font-black">Reportes recientes</h2></div>
      <article v-for="reporte in reportes" :key="reporte.id" class="grid gap-4 border-b border-border p-5 last:border-0 md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <p class="font-black">{{ reporte.motivo }}</p>
          <p class="mt-1 text-xs text-muted-foreground">{{ reporte.autor }} · {{ reporte.id }}</p>
        </div>
        <span class="bg-accent/20 px-3 py-1.5 text-xs font-black text-amber-800 dark:text-amber-300">{{ reporte.estado }}</span>
      </article>
    </section>
  </main>
</template>

