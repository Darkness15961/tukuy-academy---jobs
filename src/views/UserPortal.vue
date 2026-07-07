<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'

import { portalPathByView } from '@/lib/portal-routes'

const router = useRouter()

onMounted(() => {
  router.replace(portalPathByView.courses)
})
</script>

<template>
  <div class="min-h-screen bg-background" />
</template>
