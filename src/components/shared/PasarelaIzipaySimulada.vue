<script setup lang="ts">
import {
  AlertTriangle,
  Check,
  CreditCard,
  LoaderCircle,
  LockKeyhole,
  QrCode,
  ShieldCheck,
  Smartphone,
  WalletCards,
} from "lucide-vue-next";

import { Button } from "@/components/ui/button";
import {
  MEDIOS_PAGO_IZIPAY,
  type FasePasarelaPago,
} from "@/composables/usePasarelaIzipay";
import type { SesionPagoCurso } from "@/types/pago.types";

const props = defineProps<{
  fase: FasePasarelaPago;
  sesion: SesionPagoCurso | null;
  error: string | null;
  procesando: boolean;
  puedeIniciar: boolean;
  textoBoton?: string;
  estaHabilitado: (
    codigo: SesionPagoCurso["metodosDisponibles"][number],
  ) => boolean | null;
}>();

const emit = defineEmits<{
  iniciar: [];
  simular: [];
  reiniciar: [];
}>();

const iconos = {
  CARD: CreditCard,
  YAPE_CODE: Smartphone,
  QR: QrCode,
  PAGO_PUSH: WalletCards,
} as const;
</script>

<template>
  <div>
    <p class="text-xs font-black uppercase tracking-[.24em] text-[#0B3A78]">
      Pasarela Izipay
    </p>
    <h2 class="mt-3 text-3xl font-black leading-tight sm:text-4xl">
      Elige cómo pagar
    </h2>
    <p class="mt-4 max-w-2xl text-base leading-7 text-[#52657A]">
      Izipay mostrará únicamente los medios habilitados para el comercio y
      disponibles para esta operación.
    </p>

    <div class="mt-8 grid gap-3 sm:grid-cols-2">
      <article
        v-for="medio in MEDIOS_PAGO_IZIPAY"
        :key="medio.codigo"
        class="border p-5 transition-colors"
        :class="
          estaHabilitado(medio.codigo) === false
            ? 'border-[#E7EBF1] bg-[#F8FAFC] opacity-45'
            : 'border-[#CBD8E8] bg-card'
        "
      >
        <div class="flex items-start gap-4">
          <span
            class="grid h-11 w-11 shrink-0 place-items-center bg-[#EAF2FF] text-[#0B3A78]"
          >
            <component :is="iconos[medio.codigo]" class="h-5 w-5" />
          </span>
          <div>
            <h3 class="font-black">{{ medio.nombre }}</h3>
            <p class="mt-1 text-xs leading-5 text-[#64748B]">
              {{ medio.detalle }}
            </p>
            <p
              v-if="estaHabilitado(medio.codigo) === false"
              class="mt-2 text-[11px] font-bold uppercase tracking-wide text-[#9A3412]"
            >
              No habilitado en esta sesión
            </p>
            <p
              v-else-if="estaHabilitado(medio.codigo)"
              class="mt-2 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-emerald-700"
            >
              <Check class="h-3 w-3" />
              Disponible
            </p>
          </div>
        </div>
      </article>
    </div>

    <div
      v-if="sesion?.demostracion && fase === 'checkout'"
      class="mt-8 border-l-4 border-[#F5B400] bg-[#FFF9E8] p-5"
    >
      <p class="font-black">Vista de demostración</p>
      <p class="mt-1 text-sm leading-6 text-[#52657A]">
        No se solicitarán datos financieros ni se realizará un cobro. En
        producción, este paso abre el formulario oficial de Izipay.
      </p>
      <Button
        class="mt-5 rounded-none bg-accent text-accent-foreground hover:bg-amber-400"
        :disabled="procesando"
        @click="emit('simular')"
      >
        <LoaderCircle v-if="procesando" class="h-4 w-4 animate-spin" />
        Simular pago aprobado
      </Button>
    </div>

    <div
      v-if="error"
      class="mt-8 flex items-start gap-3 border border-red-200 bg-red-50 p-5 text-red-800"
    >
      <AlertTriangle class="mt-0.5 h-5 w-5 shrink-0" />
      <div>
        <p class="font-black">No pudimos completar el proceso</p>
        <p class="mt-1 text-sm">{{ error }}</p>
        <button
          type="button"
          class="mt-3 text-sm font-black underline underline-offset-4"
          @click="emit('reiniciar')"
        >
          Intentar nuevamente
        </button>
      </div>
    </div>

    <Button
      v-if="fase === 'inicial' || fase === 'creando'"
      class="mt-8 h-14 w-full rounded-none bg-[#0B3A78] px-7 text-base text-white hover:bg-[#071F52]"
      :disabled="procesando || !puedeIniciar"
      @click="emit('iniciar')"
    >
      <LoaderCircle v-if="fase === 'creando'" class="h-5 w-5 animate-spin" />
      <ShieldCheck v-else class="h-5 w-5" />
      {{
        fase === "creando"
          ? "Creando orden segura..."
          : (textoBoton ?? "Continuar con Izipay")
      }}
    </Button>

    <p class="mt-5 flex items-start gap-2 text-xs leading-5 text-[#64748B]">
      <LockKeyhole class="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
      Tukuy Academy no almacena números de tarjeta, claves de billetera ni
      códigos de confirmación.
    </p>
  </div>
</template>
