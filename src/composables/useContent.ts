import { onMounted, ref } from 'vue'

import { contentService } from '@/api/services/content.service'
import type { CarouselSlide, TukuyModule, ViewId } from '@/types/academy'

export function useContent() {
  const navItems = ref<{ id: ViewId; label: string }[]>([])
  const carouselSlides = ref<CarouselSlide[]>([])
  const tukuyModules = ref<TukuyModule[]>([])
  const heroImage = ref('')
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchContent() {
    loading.value = true
    error.value = null
    try {
      const [nav, carousel, modules, hero] = await Promise.all([
        contentService.getNavItems(),
        contentService.getCarouselSlides(),
        contentService.getTukuyModules(),
        contentService.getHeroImage(),
      ])
      navItems.value = nav
      carouselSlides.value = carousel
      tukuyModules.value = modules
      heroImage.value = hero
    } catch {
      error.value = 'No se pudo cargar el contenido'
    } finally {
      loading.value = false
    }
  }

  onMounted(fetchContent)

  return {
    navItems,
    carouselSlides,
    tukuyModules,
    heroImage,
    loading,
    error,
    refetch: fetchContent,
  }
}
