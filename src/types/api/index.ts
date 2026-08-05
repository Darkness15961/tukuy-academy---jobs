import type {
  Course,
  Job,
  UserProfile,
  WorkExperience,
} from "@/types/academia";
import type { MembresiaEntrada } from "@/types/membresia.types";

export type CourseDto = Course;
export type JobDto = Job;
export type UserProfileDto = UserProfile;
export type WorkExperienceDto = WorkExperience;

export type LoginRequestDto = {
  /** Campo histórico de la vista; contiene el correo. */
  dni: string;
  password: string;
};

export type UsuarioApiDto = {
  id: string;
  correo: string;
  nombres: string;
  apellidos: string;
  telefono?: string | null;
};

export type SesionApiDto = {
  id: string;
  creada_en?: string;
  expira_en?: string;
  ip?: string | null;
  user_agent?: string | null;
  actual?: boolean;
};

export type LoginResponseDto = {
  token: string;
  user: UserProfileDto;
  memberships?: MembresiaEntrada[];
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
