import { api } from "@/api/client";
import { apiConfig } from "@/api/config";
import { resolveMock } from "@/api/mock";

type Identificador = string | number;

type RegistroIdentificable = {
  id: Identificador;
};

type SobrePersistencia<T> = {
  version: number;
  actualizadoEn: string;
  datos: T;
};

type ConfiguracionRepositorio<T extends RegistroIdentificable> = {
  clave: string;
  ruta: string;
  semilla: readonly T[];
  version?: number;
};

function clonar<T>(valor: T): T {
  return structuredClone(valor);
}

function leerSobre<T>(clave: string, version: number, semilla: T): T {
  const valorGuardado = localStorage.getItem(clave);

  if (valorGuardado) {
    try {
      const sobre = JSON.parse(valorGuardado) as SobrePersistencia<T>;
      if (sobre.version === version) return clonar(sobre.datos);
    } catch {
      localStorage.removeItem(clave);
    }
  }

  const datos = clonar(semilla);
  guardarSobre(clave, version, datos);
  return datos;
}

function guardarSobre<T>(clave: string, version: number, datos: T): void {
  const sobre: SobrePersistencia<T> = {
    version,
    actualizadoEn: new Date().toISOString(),
    datos: clonar(datos),
  };
  localStorage.setItem(clave, JSON.stringify(sobre));
}

/**
 * Repositorio de transición. En modo demostración persiste en localStorage y,
 * al configurar VITE_USE_MOCK=false, conserva el mismo contrato contra la API.
 */
export function crearRepositorioLocal<T extends RegistroIdentificable>({
  clave,
  ruta,
  semilla,
  version = 1,
}: ConfiguracionRepositorio<T>) {
  return {
    async listar(): Promise<T[]> {
      if (apiConfig.useMock) {
        return resolveMock(leerSobre(clave, version, [...semilla]));
      }
      const { data } = await api.get<T[]>(ruta);
      return data;
    },

    async obtener(id: Identificador): Promise<T | null> {
      if (apiConfig.useMock) {
        const registros = leerSobre(clave, version, [...semilla]);
        return resolveMock(registros.find((item) => item.id === id) ?? null);
      }
      const { data } = await api.get<T>(`${ruta}/${id}`);
      return data;
    },

    async crear(registro: T): Promise<T> {
      if (apiConfig.useMock) {
        const registros = leerSobre(clave, version, [...semilla]);
        registros.unshift(clonar(registro));
        guardarSobre(clave, version, registros);
        return resolveMock(clonar(registro));
      }
      const { data } = await api.post<T>(ruta, registro);
      return data;
    },

    async actualizar(id: Identificador, cambios: Partial<T>): Promise<T> {
      if (apiConfig.useMock) {
        const registros = leerSobre(clave, version, [...semilla]);
        const indice = registros.findIndex((item) => item.id === id);
        if (indice < 0) throw new Error("No se encontró el registro solicitado");

        const actualizado = { ...registros[indice], ...clonar(cambios), id } as T;
        registros[indice] = actualizado;
        guardarSobre(clave, version, registros);
        return resolveMock(clonar(actualizado));
      }
      const { data } = await api.patch<T>(`${ruta}/${id}`, cambios);
      return data;
    },

    async eliminar(id: Identificador): Promise<void> {
      if (apiConfig.useMock) {
        const registros = leerSobre(clave, version, [...semilla]).filter(
          (item) => item.id !== id,
        );
        guardarSobre(clave, version, registros);
        await resolveMock(undefined);
        return;
      }
      await api.delete(`${ruta}/${id}`);
    },

    async reemplazar(registros: T[]): Promise<T[]> {
      if (!apiConfig.useMock) {
        throw new Error(
          "La sustitución masiva solo está disponible en el modo de demostración",
        );
      }
      guardarSobre(clave, version, registros);
      return resolveMock(clonar(registros));
    },

    reiniciar(): void {
      if (!apiConfig.useMock) return;
      localStorage.removeItem(clave);
    },
  };
}

export function crearAlmacenDocumento<T>(
  clave: string,
  semilla: T,
  version = 1,
) {
  return {
    leer(): T {
      return leerSobre(clave, version, semilla);
    },
    guardar(datos: T): T {
      guardarSobre(clave, version, datos);
      return clonar(datos);
    },
    reiniciar(): void {
      localStorage.removeItem(clave);
    },
  };
}
