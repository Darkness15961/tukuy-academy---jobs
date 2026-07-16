import type {
  CourseDto,
  JobDto,
  UserProfileDto,
  WorkExperienceDto,
} from "@/types/api";
import type {
  Course,
  Job,
  UserProfile,
  WorkExperience,
} from "@/types/academia";

export const mapCourseDto = (dto: CourseDto): Course => ({ ...dto });
export const mapJobDto = (dto: JobDto): Job => ({ ...dto });
export const mapUserProfileDto = (dto: UserProfileDto): UserProfile => ({
  ...dto,
});
export const mapWorkExperienceDto = (
  dto: WorkExperienceDto,
): WorkExperience => ({ ...dto });

export const mapCourseList = (dtos: CourseDto[]): Course[] =>
  dtos.map(mapCourseDto);
export const mapJobList = (dtos: JobDto[]): Job[] => dtos.map(mapJobDto);
export const mapWorkExperienceList = (
  dtos: WorkExperienceDto[],
): WorkExperience[] => dtos.map(mapWorkExperienceDto);
