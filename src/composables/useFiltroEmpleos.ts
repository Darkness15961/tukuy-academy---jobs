import { computed, ref } from "vue";

import { FOR_YOU_JOB_MATCH } from "@/lib/constants";
import type { Job } from "@/types/academia";

export type JobScopeFilter = "all" | "for-you";
export type JobDateFilter = "all" | "recent" | "closing-soon" | "this-month";

function isForYou(job: Job) {
  return job.match >= FOR_YOU_JOB_MATCH;
}

function isRecent(postedAt: string, days = 14) {
  const posted = new Date(postedAt);
  const now = new Date();
  const diff = now.getTime() - posted.getTime();
  return diff >= 0 && diff <= days * 24 * 60 * 60 * 1000;
}

function isClosingSoon(deadlineAt: string, days = 15) {
  const deadline = new Date(deadlineAt);
  const now = new Date();
  const diff = deadline.getTime() - now.getTime();
  return diff >= 0 && diff <= days * 24 * 60 * 60 * 1000;
}

function isThisMonth(deadlineAt: string) {
  const deadline = new Date(deadlineAt);
  const now = new Date();
  return (
    deadline.getFullYear() === now.getFullYear() &&
    deadline.getMonth() === now.getMonth()
  );
}

function applyDateFilter(list: Job[], dateFilter: JobDateFilter) {
  if (dateFilter === "recent") {
    return list.filter((job) => isRecent(job.postedAt));
  }
  if (dateFilter === "closing-soon") {
    return list.filter((job) => isClosingSoon(job.deadlineAt));
  }
  if (dateFilter === "this-month") {
    return list.filter((job) => isThisMonth(job.deadlineAt));
  }
  return list;
}

export function useFiltroEmpleos(jobs: () => Job[]) {
  const searchTerm = ref("");
  const scopeFilter = ref<JobScopeFilter>("all");
  const dateFilter = ref<JobDateFilter>("all");

  const baseFilteredJobs = computed(() => {
    const term = searchTerm.value.trim().toLowerCase();
    let list = jobs();

    if (scopeFilter.value === "for-you") {
      list = list.filter(isForYou);
    }

    list = applyDateFilter(list, dateFilter.value);

    if (term) {
      list = list.filter((job) =>
        [job.title, job.company, job.location, ...job.tags].some((value) =>
          value.toLowerCase().includes(term),
        ),
      );
    }

    return [...list].sort((a, b) => {
      if (scopeFilter.value === "for-you") {
        return b.match - a.match;
      }
      return new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime();
    });
  });

  const forYouJobs = computed(() => {
    const term = searchTerm.value.trim().toLowerCase();
    let list = jobs().filter(isForYou);
    list = applyDateFilter(list, dateFilter.value);

    if (term) {
      list = list.filter((job) =>
        [job.title, job.company, job.location, ...job.tags].some((value) =>
          value.toLowerCase().includes(term),
        ),
      );
    }

    return [...list].sort((a, b) => b.match - a.match);
  });

  const filteredJobs = computed(() => baseFilteredJobs.value);

  return {
    searchTerm,
    scopeFilter,
    dateFilter,
    filteredJobs,
    forYouJobs,
  };
}

export function isJobForYou(job: Job) {
  return isForYou(job);
}
