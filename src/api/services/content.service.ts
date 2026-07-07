import { api } from '@/api/client'
import { apiConfig } from '@/api/config'
import { API } from '@/api/endpoints'
import { resolveMock } from '@/api/mock'
import {
  carouselSlides as carouselSlidesMock,
  heroImage as heroImageMock,
  navItems as navItemsMock,
  tukuyModules as tukuyModulesMock,
} from '@/data/academy.mock'
import type { CarouselSlideDto, NavItemDto, TukuyModuleDto } from '@/types/api'
import type { CarouselSlide, TukuyModule, ViewId } from '@/types/academy'

export const contentService = {
  async getNavItems(): Promise<{ id: ViewId; label: string }[]> {
    if (apiConfig.useMock) {
      return resolveMock(navItemsMock)
    }

    const { data } = await api.get<NavItemDto[]>(API.content.nav)
    return data as { id: ViewId; label: string }[]
  },

  async getCarouselSlides(): Promise<CarouselSlide[]> {
    if (apiConfig.useMock) {
      return resolveMock(carouselSlidesMock)
    }

    const { data } = await api.get<CarouselSlideDto[]>(API.content.carousel)
    return data
  },

  async getTukuyModules(): Promise<TukuyModule[]> {
    if (apiConfig.useMock) {
      return resolveMock(tukuyModulesMock)
    }

    const { data } = await api.get<TukuyModuleDto[]>(API.content.modules)
    return data
  },

  async getHeroImage(): Promise<string> {
    if (apiConfig.useMock) {
      return resolveMock(heroImageMock)
    }

    const { data } = await api.get<{ url: string }>(API.content.hero)
    return data.url
  },
}
