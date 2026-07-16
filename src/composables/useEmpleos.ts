import { computed, onMounted, ref } from "vue";

import { FOR_YOU_JOB_MATCH } from "@/lib/constants";
import { empleosService } from "@/api/services/empleos.service";
import type { Job } from "@/types/academia";

export function useEmpleos() {
  const jobs = ref<Job[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function fetchJobs() {
    loading.value = true;
    error.value = null;
    try {
      jobs.value = await empleosService.getAll();
    } catch {
      error.value = "No se pudieron cargar las oportunidades";
    } finally {
      loading.value = false;
    }
  }

  onMounted(fetchJobs);

  const recommendedJobs = computed(() =>
    jobs.value.filter((job) => job.match >= FOR_YOU_JOB_MATCH),
  );

  return {
    jobs,
    loading,
    error,
    recommendedJobs,
    refetch: fetchJobs,
  };
}
