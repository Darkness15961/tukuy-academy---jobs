import { api } from '@/api/client'
import { apiConfig } from '@/api/config'
import { API } from '@/api/endpoints'
import { resolveMock } from '@/api/mock'
import { user as userMock, workExperiences as workExperiencesMock } from '@/data/academy.mock'
import { mapUserProfileDto, mapWorkExperienceList } from '@/mappers/academy.mapper'
import type { UserProfileDto, WorkExperienceDto } from '@/types/api'
import type { UserProfile, WorkExperience } from '@/types/academy'

export const userService = {
  async getProfile(): Promise<UserProfile> {
    if (apiConfig.useMock) {
      return resolveMock(mapUserProfileDto(userMock))
    }

    const { data } = await api.get<UserProfileDto>(API.user.profile)
    return mapUserProfileDto(data)
  },

  async getExperiences(): Promise<WorkExperience[]> {
    if (apiConfig.useMock) {
      return resolveMock(mapWorkExperienceList(workExperiencesMock))
    }

    const { data } = await api.get<WorkExperienceDto[]>(API.user.experiences)
    return mapWorkExperienceList(data)
  },
}
