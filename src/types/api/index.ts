import type {
  Course,
  Job,
  UserProfile,
  WorkExperience,
} from "@/types/academia";
import type { MembresiaOrganizacion } from "@/types/membresia.types";

export type CourseDto = Course;
export type JobDto = Job;
export type UserProfileDto = UserProfile;
export type WorkExperienceDto = WorkExperience;

export type LoginRequestDto = {
  dni: string;
  password: string;
};

export type LoginResponseDto = {
  token: string;
  user: UserProfileDto;
  memberships?: MembresiaOrganizacion[];
};

export type RegistroRequestDto = {
  nombre: string;
  apellidos: string;
  correo: string;
  password: string;
  telefono?: string;
};

export type UsuarioRegistradoDto = {
  id: string;
  correo: string;
  password: string;
  nombre: string;
  apellidos: string;
  telefono?: string;
  proveedor: "email" | "google";
  creadoEn: string;
  /** @deprecated cuentas antiguas; el acceso es por correo */
  usuario?: string;
};

export type CarouselSlideDto = {
  title: string;
  description: string;
  image: string;
  label: string;
};

export type TukuyModuleDto = {
  icon: string;
  title: string;
  description: string;
  tags: string[];
};

export type NavItemDto = {
  id: string;
  label: string;
};
