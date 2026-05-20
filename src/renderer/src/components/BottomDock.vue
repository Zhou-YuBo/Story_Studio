<template>
  <nav
    class="h-16 border-t border-zinc-800 bg-zinc-950 flex items-center justify-center gap-3 px-6"
  >
    <RouterLink
      to="/"
      class="px-4 py-2 rounded-lg text-sm tracking-wide transition"
      active-class="bg-zinc-800 text-white"
    >
      灵感
    </RouterLink>

    <RouterLink
      to="/world"
      class="px-4 py-2 rounded-lg text-sm tracking-wide transition"
      active-class="bg-zinc-800 text-white"
    >
      世界
    </RouterLink>

    <RouterLink
      to="/character"
      class="px-4 py-2 rounded-lg text-sm tracking-wide transition"
      active-class="bg-zinc-800 text-white"
    >
      人物
    </RouterLink>
  </nav>
</template>