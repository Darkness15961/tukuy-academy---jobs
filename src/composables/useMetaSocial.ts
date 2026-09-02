import { onUnmounted, toValue, watch, type MaybeRefOrGetter } from "vue";

import {
  aplicarMetaSocial,
  restaurarMetaSocial,
  type MetaSocialEntrada,
} from "@/lib/meta-social";

/** Sincroniza metadatos de la página (Open Graph / Twitter) con un estado reactivo. */
export function useMetaSocial(
  source: MaybeRefOrGetter<MetaSocialEntrada | null | undefined>,
) {
  watch(
    () => toValue(source),
    (meta) => {
      if (meta) aplicarMetaSocial(meta);
      else restaurarMetaSocial();
    },
    { immediate: true, deep: true },
  );

  onUnmounted(() => {
    restaurarMetaSocial();
  });
}
