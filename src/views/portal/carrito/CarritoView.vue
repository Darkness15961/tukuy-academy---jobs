<script setup lang="ts">
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ShoppingBag,
  Trash2,
} from "lucide-vue-next";
import { computed } from "vue";
import { useRouter } from "vue-router";

import PasarelaIzipaySimulada from "@/components/shared/PasarelaIzipaySimulada.vue";
import PortalSection from "@/components/shared/PortalSection.vue";
import { Button } from "@/components/ui/button";
import { useCarrito } from "@/composables/useCarrito";
import { useCursos } from "@/composables/useCursos";
import {
  formatPrecioSoles,
  usePasarelaIzipay,
} from "@/composables/usePasarelaIzipay";
import { enrichCourse } from "@/lib/presentacion-curso";
import type { Course } from "@/types/academia";

const router = useRouter();
const { courses } = useCursos();
const { cartCourseIds, removeFromCart, clearCart } = useCarrito();
const pasarela = usePasarelaIzipay();

const cursosCarrito = computed(() => {
  const mapa = new Map(courses.value.map((curso) => [curso.id, curso]));
  return cartCourseIds.value
    .map((id) => mapa.get(id))
    .filter((curso): curso is Course => Boolean(curso))
    .map(enrichCourse);
});

const cursosPagados = computed(() =>
  cursosCarrito.value.filter(
    (curso) => curso.pricing === "paid" && (curso.price ?? 0) > 0,
  ),
);

const cursosGratuitos = computed(() =>
  cursosCarrito.value.filter((curso) => curso.pricing !== "paid"),
);

const subtotal = computed(() =>
  cursosPagados.value.reduce((total, curso) => total + (curso.price ?? 0), 0),
);

const puedePagar = computed(
  () => cursosPagados.value.length > 0 && pasarela.fase.value !== "pagado",
);

async function pagarConIzipay() {
  if (!cursosPagados.value.length) return;
  await pasarela.iniciarPagoCarrito(cursosPagados.value.map((curso) => curso.id));
}

async function finalizarCompra() {
  if (pasarela.fase.value !== "pagado") return;
  clearCart();
  pasarela.reiniciar();
  await router.push("/tukuy-academy/mi-aprendizaje");
}

function irACursos() {
  router.push("/tukuy-academy/cursos");
}
</script>

<template>
  <PortalSection wide :centered="false">
    <section class="grid gap-8">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p class="text-sm font-black uppercase tracking-[.25em] text-primary">
            Tu selección
          </p>
          <h1 class="mt-3 text-3xl font-black text-foreground sm:text-4xl">
            Carrito de compra
          </h1>
          <p class="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
            Revisa los cursos de pago, confirma el total y completa la matrícula
            con la pasarela simulada de Izipay.
          </p>
        </div>
        <Button
          class="rounded-none"
          variant="outline"
          @click="irACursos"
        >
          <ArrowLeft class="h-4 w-4" />
          Seguir explorando cursos
        </Button>
      </div>

      <div
        v-if="!cursosCarrito.length"
        class="border border-border bg-card px-6 py-16 text-center"
      >
        <span
          class="mx-auto grid h-16 w-16 place-items-center bg-[#EDF4FC] text-primary"
        >
          <ShoppingBag class="h-8 w-8" />
        </span>
        <h2 class="mt-6 text-2xl font-black">Tu carrito está vacío</h2>
        <p class="mt-3 text-sm leading-6 text-muted-foreground">
          Agrega cursos de pago desde el catálogo para iniciar una compra
          simulada con Izipay.
        </p>
        <Button class="mt-7 rounded-none" @click="irACursos">
          Ir al catálogo
        </Button>
      </div>

      <div
        v-else
        class="grid gap-8 xl:grid-cols-[minmax(0,1fr)_390px]"
      >
        <div class="grid gap-5">
          <section class="border border-border bg-card">
            <div class="border-b border-border px-5 py-4">
              <h2 class="text-lg font-black">Cursos en el carrito</h2>
              <p class="mt-1 text-sm text-[#64748B]">
                {{ cursosCarrito.length }} curso(s) seleccionado(s)
              </p>
            </div>

            <article
              v-for="curso in cursosCarrito"
              :key="curso.id"
              class="grid gap-4 border-b border-border p-5 last:border-b-0 sm:grid-cols-[160px_1fr_auto]"
            >
              <img
                :src="curso.image"
                :alt="curso.title"
                class="aspect-video w-full object-cover sm:aspect-[4/3]"
              />
              <div>
                <p class="text-xs font-black uppercase tracking-wide text-primary">
                  {{ curso.category }}
                </p>
                <h3 class="mt-2 text-lg font-black leading-snug">
                  {{ curso.title }}
                </h3>
                <p class="mt-2 text-sm text-[#64748B]">
                  {{ curso.instructor }} · {{ curso.duration }}
                </p>
                <p class="mt-3 text-sm font-bold text-foreground">
                  {{
                    curso.pricing === "paid"
                      ? formatPrecioSoles(curso.price ?? 0)
                      : "Gratis"
                  }}
                </p>
                <p
                  v-if="curso.pricing !== 'paid'"
                  class="mt-2 text-xs text-[#64748B]"
                >
                  Este curso no requiere pago. Puedes inscribirte desde el
                  catálogo.
                </p>
              </div>
              <Button
                class="self-start rounded-none"
                variant="outline"
                size="sm"
                @click="removeFromCart(curso.id)"
              >
                <Trash2 class="h-4 w-4" />
                Quitar
              </Button>
            </article>
          </section>

          <section
            v-if="cursosGratuitos.length"
            class="border border-border border-l-4 border-l-[#F5B400] bg-[#FFF9E8] p-5"
          >
            <p class="font-black">Cursos gratuitos en tu selección</p>
            <p class="mt-2 text-sm leading-6 text-muted-foreground">
              {{ cursosGratuitos.length }} curso(s) no se cobrarán en esta orden.
              Inscríbete directamente desde el catálogo o mi aprendizaje.
            </p>
          </section>

          <section
            v-if="pasarela.fase.value === 'pagado'"
            class="border border-emerald-200 bg-emerald-50 p-7"
          >
            <div class="flex items-start gap-4">
              <span class="grid h-14 w-14 place-items-center bg-emerald-600 text-white">
                <CheckCircle2 class="h-7 w-7" />
              </span>
              <div>
                <p class="text-xs font-black uppercase tracking-[.24em] text-emerald-700">
                  Pago confirmado
                </p>
                <h2 class="mt-2 text-2xl font-black">Compra simulada aprobada</h2>
                <p class="mt-3 text-sm leading-6 text-muted-foreground">
                  La orden <strong>{{ pasarela.orden.value?.ordenId }}</strong>
                  fue validada por el servidor de demostración. Ya puedes
                  continuar con tus cursos.
                </p>
                <Button
                  class="mt-5 rounded-none bg-[#0B3A78] text-white hover:bg-[#071F52]"
                  @click="finalizarCompra"
                >
                  Ir a mi aprendizaje
                </Button>
              </div>
            </div>
          </section>

          <section
            v-else-if="cursosPagados.length"
            class="border border-border bg-card p-6 sm:p-8"
          >
            <PasarelaIzipaySimulada
              :fase="pasarela.fase.value"
              :sesion="pasarela.sesion.value"
              :error="pasarela.error.value"
              :procesando="pasarela.procesando.value"
              :puede-iniciar="puedePagar"
              texto-botón="Pagar carrito con Izipay"
              :esta-habilitado="pasarela.estaHabilitado"
              @iniciar="pagarConIzipay"
              @simular="pasarela.simularAprobacion"
              @reiniciar="pasarela.reiniciar"
            />
          </section>
        </div>

        <aside class="self-start border border-border bg-card lg:sticky lg:top-8">
          <div class="border-b border-border p-6">
            <p class="text-xs font-black uppercase tracking-[.2em] text-primary">
              Resumen
            </p>
            <h2 class="mt-3 text-xl font-black">Total de la orden</h2>
          </div>

          <div class="grid gap-4 p-6">
            <div
              v-for="curso in cursosPagados"
              :key="`resumen-${curso.id}`"
              class="flex items-start justify-between gap-4 border-b border-border pb-4 last:border-b-0 last:pb-0"
            >
              <div>
                <p class="text-sm font-bold leading-snug">{{ curso.title }}</p>
                <p class="mt-1 text-xs text-[#64748B]">{{ curso.level }}</p>
              </div>
              <strong class="text-sm font-black">
                {{ formatPrecioSoles(curso.price ?? 0) }}
              </strong>
            </div>

            <div
              v-if="!cursosPagados.length"
              class="text-sm leading-6 text-[#64748B]"
            >
              Aún no tienes cursos de pago en el carrito.
            </div>
          </div>

          <div class="border-t border-border p-6">
            <div class="flex items-end justify-between gap-4">
              <span class="text-sm font-bold text-muted-foreground">Total a pagar</span>
              <strong class="text-3xl font-black text-foreground">
                {{ formatPrecioSoles(subtotal) }}
              </strong>
            </div>
            <p class="mt-2 text-right text-xs text-[#64748B]">
              Importe final validado por el servidor
            </p>

            <div class="mt-6 grid gap-3">
              <p class="flex items-start gap-2 text-sm text-muted-foreground">
                <Check class="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                Matrícula inmediata tras confirmación
              </p>
              <p class="flex items-start gap-2 text-sm text-muted-foreground">
                <Check class="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                Certificado verificable al completar
              </p>
            </div>

            <Button
              v-if="pasarela.fase.value !== 'pagado' && cursosPagados.length"
              class="mt-6 h-12 w-full rounded-none bg-accent text-accent-foreground hover:bg-amber-400"
              :disabled="pasarela.procesando.value || pasarela.fase.value === 'creando'"
              @click="
                pasarela.fase.value === 'checkout'
                  ? pasarela.simularAprobacion()
                  : pagarConIzipay()
              "
            >
              {{
                pasarela.fase.value === "checkout"
                  ? "Simular pago aprobado"
                  : "Continuar con Izipay"
              }}
            </Button>
          </div>
        </aside>
      </div>
    </section>
  </PortalSection>
</template>
