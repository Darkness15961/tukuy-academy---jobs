import { api } from "@/api/client";
import { apiConfig } from "@/api/config";
import { API } from "@/api/endpoints";
import { resolveMock } from "@/api/mock";
import { vacantesMock } from "../data/vacantes.mock";
import type { Postulacion, Vacante } from "../types/vacante.types";

const CLAVE_POSTULACIONES = "tukuy_postulaciones_demo";
const CLAVE_GUARDADAS = "tukuy_vacantes_guardadas_demo";

function leerPostulacionesMock(): Postulacion[] {
  const guardadas = localStorage.getItem(CLAVE_POSTULACIONES);
  if (!guardadas) return [];

  try {
    return JSON.parse(guardadas) as Postulacion[];
  } catch {
    localStorage.removeItem(CLAVE_POSTULACIONES);
    return [];
  }
}

export const vacantesService = {
  async obtenerTodas(): Promise<Vacante[]> {
    if (apiConfig.useMock) return resolveMock([...vacantesMock]);
    const { data } = await api.get<Vacante[]>(API.bolsa.vacantes);
    return data;
  },

  async obtenerPorId(vacanteId: string): Promise<Vacante> {
    if (apiConfig.useMock) {
      const vacante = vacantesMock.find((item) => item.id === vacanteId);
      if (!vacante) throw new Error("No encontramos la vacante solicitada.");
      return resolveMock({ ...vacante });
    }
    const { data } = await api.get<Vacante>(
      API.bolsa.vacantePorId(vacanteId),
    );
    return data;
  },

  async obtenerPostulaciones(): Promise<Postulacion[]> {
    if (apiConfig.useMock) return resolveMock(leerPostulacionesMock());
    const { data } = await api.get<Postulacion[]>(API.bolsa.postulaciones);
    return data;
  },

  async postular(vacanteId: string): Promise<Postulacion> {
    if (apiConfig.useMock) {
      const existentes = leerPostulacionesMock();
      const anterior = existentes.find((item) => item.vacanteId === vacanteId);
      if (anterior) return resolveMock(anterior);

      const postulacion: Postulacion = {
        id: `post-${Date.now()}`,
        vacanteId,
        fecha: new Date().toISOString(),
        estado: "enviada",
      };
      localStorage.setItem(
        CLAVE_POSTULACIONES,
        JSON.stringify([...existentes, postulacion]),
      );
      return resolveMock(postulacion);
    }

    const { data } = await api.post<Postulacion>(
      API.bolsa.postular(vacanteId),
    );
    return data;
  },

  async obtenerGuardadas(): Promise<string[]> {
    if (apiConfig.useMock) {
      const guardadas = localStorage.getItem(CLAVE_GUARDADAS);
      if (!guardadas) return resolveMock([]);
      try {
        return resolveMock(JSON.parse(guardadas) as string[]);
      } catch {
        return resolveMock([]);
      }
    }
    const { data } = await api.get<string[]>(API.bolsa.postulaciones + "/guardadas");
    return data;
  },

  async guardar(vacanteId: string): Promise<void> {
    if (apiConfig.useMock) {
      const guardadas = localStorage.getItem(CLAVE_GUARDADAS);
      const lista: string[] = guardadas ? (JSON.parse(guardadas) as string[]) : [];
      if (!lista.includes(vacanteId)) {
        localStorage.setItem(CLAVE_GUARDADAS, JSON.stringify([...lista, vacanteId]));
      }
      return resolveMock(undefined);
    }
    await api.post(API.bolsa.guardar(vacanteId));
  },

  async desguardar(vacanteId: string): Promise<void> {
    if (apiConfig.useMock) {
      const guardadas = localStorage.getItem(CLAVE_GUARDADAS);
      const lista: string[] = guardadas ? (JSON.parse(guardadas) as string[]) : [];
      localStorage.setItem(
        CLAVE_GUARDADAS,
        JSON.stringify(lista.filter((id) => id !== vacanteId)),
      );
      return resolveMock(undefined);
    }
    await api.delete(API.bolsa.guardar(vacanteId));
  },
};
