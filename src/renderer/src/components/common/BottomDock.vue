<script setup lang="ts">
import { WORKBENCHES } from '../../config/workbenches'
</script>

<template>
  <nav
    class="h-16 border-t border-zinc-800 bg-zinc-950 flex items-center justify-center gap-3 px-6"
  >
    <RouterLink
      v-for="workbench in WORKBENCHES"
      :key="workbench.id"
      :to="workbench.path"
      class="px-4 py-2 rounded-lg text-sm tracking-wide transition"
      active-class="bg-zinc-800 text-white"
    >
      {{ workbench.label }}
    </RouterLink>
  </nav>
</template>
