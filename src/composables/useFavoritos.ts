import { computed, ref } from "vue";

const favoriteCourseIds = ref<string[]>(["c-002", "c-005", "c-007", "c-009"]);

export function useFavoritos() {
  const favoritesCount = computed(() => favoriteCourseIds.value.length);

  function isFavorite(courseId: string) {
    return favoriteCourseIds.value.includes(courseId);
  }

  function toggleFavorite(courseId: string) {
    if (isFavorite(courseId)) {
      favoriteCourseIds.value = favoriteCourseIds.value.filter(
        (id) => id !== courseId,
      );
      return;
    }
    favoriteCourseIds.value.push(courseId);
  }

  function addFavorite(courseId: string) {
    if (!isFavorite(courseId)) {
      favoriteCourseIds.value.push(courseId);
    }
  }

  function removeFavorite(courseId: string) {
    favoriteCourseIds.value = favoriteCourseIds.value.filter(
      (id) => id !== courseId,
    );
  }

  return {
    favoriteCourseIds,
    favoritesCount,
    isFavorite,
    toggleFavorite,
    addFavorite,
    removeFavorite,
  };
}
