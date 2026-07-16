import { computed, onMounted, ref } from "vue";
import { vacantesService } from "../services/vacantes.service";
import type { Vacante } from "../types/vacante.types";

export function useVacantes() {
  const vacantes = ref<Vacante[]>([]);
  const cargando = ref(false);
  const error = ref<string | null>(null);
  const busqueda = ref("");
  const modalidad = ref("todas");
  const soloCompatibles = ref(false);

  const filtradas = computed(() => {
    const termino = busqueda.value.trim().toLowerCase();
    return vacantes.value.filter((vacante) => {
      const coincideBusqueda =
        !termino ||
        [
          vacante.titulo,
          vacante.empresa,
          vacante.ubicacion,
          ...vacante.etiquetas,
        ].some((valor) => valor.toLowerCase().includes(termino));
      const coincideModalidad =
        modalidad.value === "todas" || vacante.modalidad === modalidad.value;
      const coincideCompatibilidad =
        !soloCompatibles.value || vacante.compatibilidad >= 80;
      return coincideBusqueda && coincideModalidad && coincideCompatibilidad;
    });
  });

  const recomendadas = computed(() =>
    [...vacantes.value]
      .filter((vacante) => vacante.compatibilidad >= 80)
      .sort((a, b) => b.compatibilidad - a.compatibilidad)
      .slice(0, 3),
  );

  async function cargar() {
    cargando.value = true;
    error.value = null;
    try {
      vacantes.value = await vacantesService.obtenerTodas();
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "No pudimos cargar las vacantes.";
    } finally {
      cargando.value = false;
    }
  }

  onMounted(cargar);

  return {
    vacantes,
    filtradas,
    recomendadas,
    cargando,
    error,
    busqueda,
    modalidad,
    soloCompatibles,
    recargar: cargar,
  };
}

