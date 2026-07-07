<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { computed } from 'vue'

const props = withDefaults(defineProps<{ variant?: 'dark' | 'light' }>(), {
  variant: 'light',
})

const isDark = computed(() => props.variant === 'dark')
const modules = ['Academy Cursos', 'CV Inteligente', 'Bolsa Jobs', 'Certificados', 'Perfil Laboral']
const company = ['Inicio', 'Cursos', 'Oportunidades', 'Beneficios', 'Contacto']
</script>

<template>
  <footer
    :class="
      isDark
        ? 'border-t border-white/10 bg-[#07152B] text-white'
        : 'border-t border-[#D6E2EF] bg-[#EAF1F8] text-[#07152B]'
    "
  >
    <div class="mx-auto grid max-w-7xl gap-8 px-5 py-10 md:grid-cols-[1.3fr_0.8fr_0.8fr_0.9fr]">
      <div class="grid content-start gap-4">
        <div class="flex items-center gap-3">
          <img class="h-11 w-auto object-contain" src="/img/iconoTukuyAcademy.png" alt="Tukuy Academy" />
          <div>
            <strong class="block text-xl leading-none tracking-normal">
              <span class="font-black">Tukuy</span>
              <span class="font-light"> Academy</span>
            </strong>
            <span :class="['text-sm', isDark ? 'text-white/65' : 'text-[#52657A]']">
              Formación, certificación y empleabilidad
            </span>
          </div>
        </div>

        <p :class="['max-w-sm text-sm leading-6', isDark ? 'text-white/65' : 'text-[#52657A]']">
          Plataforma simulada para capacitación, CV inteligente, certificados verificables y oportunidades laborales
          para perfiles de obra.
        </p>

        <div :class="['flex items-center gap-2 text-sm font-semibold', isDark ? 'text-white/65' : 'text-[#52657A]']">
          <span class="h-2 w-2 rounded-full bg-emerald-400" />
          Soporte demo disponible
        </div>
      </div>

      <div class="grid content-start gap-3">
        <h3 class="font-bold">Módulos</h3>
        <Button
          v-for="item in modules"
          :key="item"
          class="h-auto justify-start p-0 font-normal"
          :class="isDark ? 'text-white/70 hover:text-white' : 'text-[#52657A] hover:text-[#07152B]'"
          variant="link"
          type="button"
        >
          {{ item }}
        </Button>
      </div>

      <div class="grid content-start gap-3">
        <h3 class="font-bold">Empresa</h3>
        <Button
          v-for="item in company"
          :key="item"
          class="h-auto justify-start p-0 font-normal"
          :class="isDark ? 'text-white/70 hover:text-white' : 'text-[#52657A] hover:text-[#07152B]'"
          variant="link"
          type="button"
        >
          {{ item }}
        </Button>
      </div>

      <div class="grid content-start gap-3">
        <h3 class="font-bold">Contacto</h3>
        <span :class="['text-sm', isDark ? 'text-white/65' : 'text-[#52657A]']">Cusco, Perú</span>
        <span :class="['text-sm', isDark ? 'text-white/65' : 'text-[#52657A]']">+51 930 804 475</span>
        <span :class="['text-sm', isDark ? 'text-white/65' : 'text-[#52657A]']">academy@tukuyobra.com</span>
        <span :class="['text-sm', isDark ? 'text-white/65' : 'text-[#52657A]']">Lun - Vie · 9am - 7pm</span>
      </div>
    </div>

    <div :class="isDark ? 'border-t border-white/10' : 'border-t border-[#D6E2EF]'">
      <div
        :class="[
          'mx-auto flex max-w-7xl flex-col gap-2 px-5 py-4 text-xs sm:flex-row sm:items-center sm:justify-between',
          isDark ? 'text-white/65' : 'text-[#52657A]',
        ]"
      >
        <span>© 2026 Tukuy Academy & Jobs.</span>
        <span>Aprende · Certifícate · Postula</span>
      </div>
    </div>
  </footer>
</template>
