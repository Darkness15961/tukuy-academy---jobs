<script setup lang="ts">
import { Building2, CircleDollarSign, Clock3, UsersRound, BookOpenCheck, ShieldCheck } from "lucide-vue-next";
import { onMounted, ref } from "vue";
import { operacionPrincipalService, type PanelPrincipal } from "@/api/services/operacion-principal.service";
import TituloConAyuda from "@/components/shared/TituloConAyuda.vue";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
const cargando=ref(true);const error=ref("");const panel=ref<PanelPrincipal|null>(null);
const dinero=(centavos:number)=>new Intl.NumberFormat("es-PE",{style:"currency",currency:"PEN",maximumFractionDigits:0}).format(centavos/100);
onMounted(async()=>{try{panel.value=await operacionPrincipalService.panel();}catch(c){error.value=c instanceof Error?c.message:"No se pudo cargar el panel.";}finally{cargando.value=false;}});
</script>
<template><section class="mx-auto grid max-w-400 gap-6">
  <TituloConAyuda clase-eyebrow="text-primary" eyebrow="Operación global" titulo="Panel administrativo" ayuda="Indicadores calculados directamente desde la base principal." />
  <div v-if="error" class="border-l-4 border-l-red-500 bg-red-500/10 p-4 text-sm font-semibold">{{error}}</div>
  <div v-if="cargando" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Skeleton v-for="i in 8" :key="i" class="h-24"/></div>
  <template v-else-if="panel">
    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card v-for="item in [
        {e:'Organizaciones',v:panel.organizaciones.total,d:`${panel.organizaciones.habilitadas} habilitadas · ${panel.organizaciones.pendientes} pendientes`,i:Building2},
        {e:'Identidades activas',v:panel.identidades.activas,d:`${panel.identidades.total} registradas`,i:UsersRound},
        {e:'Cursos publicados',v:panel.cursos.publicados,d:`${panel.cursos.revision} en revisión`,i:BookOpenCheck},
        {e:'Suscripciones activas',v:panel.suscripciones.activas,d:`${panel.suscripciones.porVencer} por vencer`,i:ShieldCheck},
        {e:'Facturado este mes',v:dinero(panel.finanzas.facturadoMesCentavos),d:`${panel.finanzas.ordenesPendientes} órdenes pendientes`,i:CircleDollarSign},
        {e:'Cobrado este mes',v:dinero(panel.finanzas.cobradoMesCentavos),d:'Pagos confirmados',i:CircleDollarSign}
      ]" :key="item.e" class="border-border bg-card"><CardContent class="flex gap-4 p-5"><span class="grid h-11 w-11 place-items-center bg-primary/10 text-primary"><component :is="item.i" class="h-5 w-5"/></span><div><strong class="text-2xl font-black">{{item.v}}</strong><p class="text-xs font-bold">{{item.e}}</p><p class="mt-1 text-xs text-muted-foreground">{{item.d}}</p></div></CardContent></Card>
    </div>
    <Card class="border-border bg-card"><CardContent class="p-0"><div class="border-b border-border p-5"><h2 class="font-black">Alertas operativas</h2><p class="text-xs text-muted-foreground">Instalaciones pendientes y suscripciones próximas a vencer</p></div><div class="divide-y divide-border"><article v-for="alerta in panel.alertas" :key="alerta.referencia" class="flex gap-3 p-5"><Clock3 class="h-5 w-5 text-amber-600"/><div><p class="font-bold">{{alerta.titulo}}</p><p class="text-sm text-muted-foreground">{{alerta.detalle}}</p></div></article><p v-if="!panel.alertas.length" class="p-8 text-center text-sm text-muted-foreground">No existen alertas pendientes.</p></div></CardContent></Card>
  </template>
</section></template>
