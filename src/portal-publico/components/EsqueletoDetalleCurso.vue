<script setup lang="ts">
import { Skeleton } from "@/components/ui/skeleton";
</script>

<template>
  <main aria-busy="true" aria-label="Cargando información del curso">
    <section class="bg-[#07152B] pb-16 pt-32">
      <div
        class="mx-auto grid max-w-360 gap-10 px-5 lg:grid-cols-[minmax(0,1fr)_480px] lg:px-8"
      >
        <div class="self-center py-5">
          <Skeleton class="h-5 w-32 bg-white/10" />
          <Skeleton class="mt-10 h-4 w-44 bg-[#F5B400]/25" />
          <Skeleton class="mt-5 h-14 w-full max-w-3xl bg-white/10" />
          <Skeleton class="mt-3 h-14 w-4/5 max-w-2xl bg-white/10" />

          <div class="mt-8 flex flex-wrap gap-3">
            <Skeleton class="h-7 w-44 bg-white/10" />
            <Skeleton class="h-7 w-24 bg-white/10" />
            <Skeleton class="h-7 w-20 bg-white/10" />
          </div>

          <div class="mt-9 flex items-center gap-4 border-l-4 border-[#F5B400]/40 pl-5">
            <Skeleton class="h-14 w-14 shrink-0 bg-white/10" />
            <div class="grid w-full max-w-sm gap-2">
              <Skeleton class="h-3 w-32 bg-white/10" />
              <Skeleton class="h-5 w-48 bg-white/10" />
              <Skeleton class="h-3 w-64 bg-white/10" />
            </div>
          </div>
        </div>

        <aside class="border border-white/15 bg-[#020817]">
          <Skeleton class="aspect-video w-full bg-white/10" />
          <div class="p-6">
            <div class="flex items-end gap-3">
              <Skeleton class="h-10 w-32 bg-white/10" />
              <Skeleton class="h-6 w-20 bg-white/10" />
              <Skeleton class="h-7 w-14 bg-[#F5B400]/25" />
            </div>
            <Skeleton class="mt-6 h-13 w-full bg-[#F5B400]/25" />
            <div class="mt-5 grid gap-3 border-t border-white/10 pt-5">
              <Skeleton class="h-4 w-64 bg-white/10" />
              <Skeleton class="h-4 w-72 bg-white/10" />
            </div>
          </div>
        </aside>
      </div>
    </section>

    <section class="bg-[#F5F8FC] py-16">
      <div
        class="mx-auto grid max-w-360 gap-10 px-5 lg:grid-cols-[minmax(0,1fr)_400px] lg:px-8"
      >
        <div>
          <Skeleton class="h-4 w-44 bg-blue-100" />
          <Skeleton class="mt-4 h-12 w-full max-w-xl bg-slate-200" />
          <Skeleton class="mt-4 h-4 w-36 bg-slate-200" />

          <div class="mt-8 border-t border-[#CBD8E8] bg-white">
            <div
              v-for="indice in 4"
              :key="indice"
              class="flex items-center gap-4 border-b border-[#CBD8E8] px-5 py-5"
            >
              <Skeleton class="h-10 w-10 shrink-0 bg-slate-200" />
              <div class="grid flex-1 gap-2">
                <Skeleton
                  class="h-5 bg-slate-200"
                  :class="indice % 2 === 0 ? 'w-2/3' : 'w-4/5'"
                />
                <Skeleton class="h-3 w-20 bg-slate-100" />
              </div>
              <Skeleton class="h-5 w-5 bg-slate-100" />
            </div>
          </div>
        </div>

        <aside class="self-start border-t-4 border-[#F5B400]/50 bg-white p-7">
          <Skeleton class="h-3 w-40 bg-blue-100" />
          <div class="mt-5 flex items-center gap-4">
            <Skeleton class="h-24 w-24 shrink-0 bg-slate-200" />
            <div class="grid flex-1 gap-2">
              <Skeleton class="h-6 w-40 bg-slate-200" />
              <Skeleton class="h-4 w-full bg-slate-100" />
              <Skeleton class="h-4 w-4/5 bg-slate-100" />
            </div>
          </div>
          <div class="mt-6 grid gap-3">
            <Skeleton class="h-4 w-full bg-slate-100" />
            <Skeleton class="h-4 w-full bg-slate-100" />
            <Skeleton class="h-4 w-5/6 bg-slate-100" />
          </div>
          <div class="mt-6 grid gap-3 border-t border-[#E8EDF5] pt-5">
            <Skeleton class="h-5 w-48 bg-slate-200" />
            <Skeleton class="h-4 w-full bg-slate-100" />
            <Skeleton class="h-4 w-11/12 bg-slate-100" />
            <Skeleton class="h-4 w-4/5 bg-slate-100" />
          </div>
        </aside>
      </div>
    </section>

    <span class="sr-only">Cargando curso...</span>
  </main>
</template>
