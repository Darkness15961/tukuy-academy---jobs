import { computed, ref, watch } from "vue";

import { CARRITO_KEY } from "@/lib/constants";

const cartCourseIds = ref<string[]>(leerCarrito());

function leerCarrito(): string[] {
  if (typeof window === "undefined") return [];

  try {
    const guardado = localStorage.getItem(CARRITO_KEY);
    if (!guardado) return [];
    const ids = JSON.parse(guardado) as string[];
    return Array.isArray(ids) ? ids : [];
  } catch {
    return [];
  }
}

function persistirCarrito() {
  localStorage.setItem(CARRITO_KEY, JSON.stringify(cartCourseIds.value));
}

watch(cartCourseIds, persistirCarrito, { deep: true });

export function useCarrito() {
  const cartCount = computed(() => cartCourseIds.value.length);

  function addToCart(courseId: string) {
    if (!cartCourseIds.value.includes(courseId)) {
      cartCourseIds.value = [...cartCourseIds.value, courseId];
    }
  }

  function removeFromCart(courseId: string) {
    cartCourseIds.value = cartCourseIds.value.filter((id) => id !== courseId);
  }

  function clearCart() {
    cartCourseIds.value = [];
  }

  function isInCart(courseId: string) {
    return cartCourseIds.value.includes(courseId);
  }

  return {
    cartCourseIds,
    cartCount,
    addToCart,
    removeFromCart,
    clearCart,
    isInCart,
  };
}
