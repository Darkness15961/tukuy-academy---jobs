import type { TipoPortal } from "@/types/membresia.types";

export type TipoPublicacion =
  | "pregunta"
  | "experiencia"
  | "recurso"
  | "oportunidad"
  | "evento"
  | "logro";

export type AutorComunidad = {
  id: string;
  nombre: string;
  cargo: string;
  avatar: string;
  portal: TipoPortal;
  verificado?: boolean;
};

export type ComentarioComunidad = {
  id: string;
  autor: AutorComunidad;
  contenido: string;
  fecha: string;
};

export type PublicacionComunidad = {
  id: string;
  tipo: TipoPublicacion;
  autor: AutorComunidad;
  contenido: string;
  imagen?: string;
  etiquetas: string[];
  fecha: string;
  reacciones: number;
  reaccionada: boolean;
  comentarios: ComentarioComunidad[];
};

export type GrupoComunidad = {
  id: string;
  nombre: string;
  descripcion: string;
  imagen: string;
  integrantes: number;
  categoria: string;
};

export type EventoComunidad = {
  id: string;
  titulo: string;
  descripcion: string;
  imagen: string;
  fecha: string;
  hora: string;
  modalidad: "Virtual" | "Presencial";
  organizador: string;
  inscritos: number;
};

