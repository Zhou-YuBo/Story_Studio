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

    <RouterLink
      to="/structure"
      class="px-4 py-2 rounded-lg text-sm tracking-wide transition"
      active-class="bg-zinc-800 text-white"
    >
      结构
    </RouterLink>

    <RouterLink
      to="/scene"
      class="px-4 py-2 rounded-lg text-sm tracking-wide transition"
      active-class="bg-zinc-800 text-white"
    >
      场景
    </RouterLink>

    <RouterLink
      to="/reminder"
      class="px-4 py-2 rounded-lg text-sm tracking-wide transition"
      active-class="bg-zinc-800 text-white"
    >
      提醒
    </RouterLink>

    <RouterLink
      to="/export"
      class="px-4 py-2 rounded-lg text-sm tracking-wide transition"
      active-class="bg-zinc-800 text-white"
    >
      导出
    </RouterLink>
  </nav>
</template>
