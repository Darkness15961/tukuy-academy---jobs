import { computed, ref } from 'vue'

const cartCourseIds = ref<string[]>(['c-007'])

export function useCart() {
  const cartCount = computed(() => cartCourseIds.value.length)

  function addToCart(courseId: string) {
    if (!cartCourseIds.value.includes(courseId)) {
      cartCourseIds.value.push(courseId)
    }
  }

  function removeFromCart(courseId: string) {
    cartCourseIds.value = cartCourseIds.value.filter((id) => id !== courseId)
  }

  function isInCart(courseId: string) {
    return cartCourseIds.value.includes(courseId)
  }

  return { cartCount, addToCart, removeFromCart, isInCart }
}
