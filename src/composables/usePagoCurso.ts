import { computed, ref } from "vue";

import { usePasarelaIzipay } from "@/composables/usePasarelaIzipay";

export function usePagoCurso() {
  const pasarela = usePasarelaIzipay();
  const cursoIdActivo = ref<string | null>(null);

  async function iniciarPago(cursoId: string) {
    cursoIdActivo.value = cursoId;
    await pasarela.iniciarPagoCurso(cursoId);
  }

  return {
    ...pasarela,
    iniciarPago,
    cursoIdActivo: computed(() => cursoIdActivo.value),
  };
}
