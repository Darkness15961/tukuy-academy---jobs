import { computed, onMounted, ref } from "vue";
import { comunidadService } from "../services/comunidad.service";
import type {
  EventoComunidad,
  GrupoComunidad,
  PublicacionComunidad,
  TipoPublicacion,
} from "../types/comunidad.types";

export function useComunidad() {
  const publicaciones = ref<PublicacionComunidad[]>([]);
  const grupos = ref<GrupoComunidad[]>([]);
  const eventos = ref<EventoComunidad[]>([]);
  const cargando = ref(false);
  const publicando = ref(false);
  const error = ref<string | null>(null);
  const filtro = ref<TipoPublicacion | "todas">("todas");

  const publicacionesFiltradas = computed(() =>
    filtro.value === "todas"
      ? publicaciones.value
      : publicaciones.value.filter((item) => item.tipo === filtro.value),
  );

  async function cargar() {
    cargando.value = true;
    error.value = null;
    try {
      const [listaPublicaciones, listaGrupos, listaEventos] = await Promise.all([
        comunidadService.obtenerPublicaciones(),
        comunidadService.obtenerGrupos(),
        comunidadService.obtenerEventos(),
      ]);
      publicaciones.value = listaPublicaciones;
      grupos.value = listaGrupos;
      eventos.value = listaEventos;
    } catch (err) {
      error.value =
        err instanceof Error
          ? err.message
          : "No pudimos cargar la comunidad.";
    } finally {
      cargando.value = false;
    }
  }

  async function publicar(contenido: string, tipo: TipoPublicacion) {
    publicando.value = true;
    try {
      const creada = await comunidadService.crearPublicacion(contenido, tipo);
      publicaciones.value.unshift(creada);
    } finally {
      publicando.value = false;
    }
  }

  async function reaccionar(publicacion: PublicacionComunidad) {
    const resultado = await comunidadService.alternarReaccion(publicacion.id);
    publicacion.reaccionada = resultado.reaccionada;
    publicacion.reacciones = resultado.reacciones;
  }

  async function comentar(publicacion: PublicacionComunidad, contenido: string) {
    const comentario = await comunidadService.comentar(
      publicacion.id,
      contenido,
    );
    publicacion.comentarios.push(comentario);
  }

  onMounted(cargar);

  return {
    publicaciones,
    publicacionesFiltradas,
    grupos,
    eventos,
    cargando,
    publicando,
    error,
    filtro,
    publicar,
    reaccionar,
    comentar,
    recargar: cargar,
  };
}
