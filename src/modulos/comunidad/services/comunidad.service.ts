import { api } from "@/api/client";
import { apiConfig } from "@/api/config";
import { API } from "@/api/endpoints";
import { resolveMock } from "@/api/mock";
import { user } from "@/data/academia.mock";
import { CONTEXTO_SESION_KEY } from "@/lib/constants";
import type { ContextoSesion } from "@/types/membresia.types";
import {
  eventosMock,
  gruposMock,
  publicacionesMock,
} from "../data/comunidad.mock";
import type {
  ComentarioComunidad,
  EventoComunidad,
  GrupoComunidad,
  PublicacionComunidad,
  TipoPublicacion,
} from "../types/comunidad.types";

let publicacionesDemostracion = structuredClone(publicacionesMock);

function obtenerAutorActualMock() {
  const guardado = localStorage.getItem(CONTEXTO_SESION_KEY);
  let contexto: ContextoSesion | null = null;
  if (guardado) {
    try {
      contexto = JSON.parse(guardado) as ContextoSesion;
    } catch {
      contexto = null;
    }
  }

  if (contexto?.portal === "organizacion") {
    return {
      id: contexto.organizacionId ?? contexto.usuarioId,
      nombre: contexto.organizacionNombre,
      cargo: "Organización participante",
      avatar:
        "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=220&q=85",
      portal: contexto.portal,
      verificado: true,
    };
  }

  return {
    id: contexto?.usuarioId ?? "usuario-demo",
    nombre: contexto?.portal === "admin" ? "Tukuy Academy" : user.name,
    cargo:
      contexto?.portal === "docente"
        ? "Docente de Academia Tukuy"
        : contexto?.portal === "admin"
          ? "Administración de plataforma"
          : user.trade,
    avatar: "/img/vistasimg/perfilfoto.png",
    portal: contexto?.portal ?? ("estudiante" as const),
    verificado: contexto?.portal === "docente" || contexto?.portal === "admin",
  };
}

export const comunidadService = {
  async obtenerPublicaciones(): Promise<PublicacionComunidad[]> {
    if (apiConfig.useMock) {
      return resolveMock(structuredClone(publicacionesDemostracion));
    }
    const { data } = await api.get<PublicacionComunidad[]>(
      API.comunidad.publicaciones,
    );
    return data;
  },

  async crearPublicacion(
    contenido: string,
    tipo: TipoPublicacion,
  ): Promise<PublicacionComunidad> {
    if (apiConfig.useMock) {
      const publicacion: PublicacionComunidad = {
        id: `pub-${Date.now()}`,
        tipo,
        autor: obtenerAutorActualMock(),
        contenido,
        etiquetas: ["Comunidad Tukuy"],
        fecha: "Ahora",
        reacciones: 0,
        reaccionada: false,
        comentarios: [],
      };
      publicacionesDemostracion = [publicacion, ...publicacionesDemostracion];
      return resolveMock(structuredClone(publicacion));
    }
    const { data } = await api.post<PublicacionComunidad>(
      API.comunidad.publicaciones,
      { contenido, tipo },
    );
    return data;
  },

  async alternarReaccion(
    publicacionId: string,
  ): Promise<{ reaccionada: boolean; reacciones: number }> {
    if (apiConfig.useMock) {
      const publicacion = publicacionesDemostracion.find(
        (item) => item.id === publicacionId,
      );
      if (!publicacion) throw new Error("Publicación no encontrada.");
      publicacion.reaccionada = !publicacion.reaccionada;
      publicacion.reacciones += publicacion.reaccionada ? 1 : -1;
      return resolveMock({
        reaccionada: publicacion.reaccionada,
        reacciones: publicacion.reacciones,
      });
    }
    const { data } = await api.post<{
      reaccionada: boolean;
      reacciones: number;
    }>(API.comunidad.reacciones(publicacionId));
    return data;
  },

  async comentar(
    publicacionId: string,
    contenido: string,
  ): Promise<ComentarioComunidad> {
    if (apiConfig.useMock) {
      const publicacion = publicacionesDemostracion.find(
        (item) => item.id === publicacionId,
      );
      if (!publicacion) throw new Error("Publicación no encontrada.");
      const comentario: ComentarioComunidad = {
        id: `com-${Date.now()}`,
        autor: obtenerAutorActualMock(),
        contenido,
        fecha: "Ahora",
      };
      publicacion.comentarios.push(comentario);
      return resolveMock(structuredClone(comentario));
    }
    const { data } = await api.post<ComentarioComunidad>(
      API.comunidad.comentarios(publicacionId),
      { contenido },
    );
    return data;
  },

  async obtenerGrupos(): Promise<GrupoComunidad[]> {
    if (apiConfig.useMock) return resolveMock(structuredClone(gruposMock));
    const { data } = await api.get<GrupoComunidad[]>(API.comunidad.grupos);
    return data;
  },

  async obtenerEventos(): Promise<EventoComunidad[]> {
    if (apiConfig.useMock) return resolveMock(structuredClone(eventosMock));
    const { data } = await api.get<EventoComunidad[]>(API.comunidad.eventos);
    return data;
  },
};
