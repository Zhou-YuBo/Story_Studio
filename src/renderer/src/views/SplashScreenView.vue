<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue'
import SplashVariantFrame from '../components/splash/SplashVariantFrame.vue'
import type { SplashVariant } from '../stores/preferences'

const props = withDefaults(
  defineProps<{
    variant?: SplashVariant
  }>(),
  {
    variant: 'structure-big'
  }
)

const emit = defineEmits<{ done: [] }>()

let timer: ReturnType<typeof setTimeout> | null = null

function skip(): void {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
  emit('done')
}

onMounted(() => {
  timer = setTimeout(skip, 2500)
})

onBeforeUnmount(() => {
  if (timer) clearTimeout(timer)
})
</script>

<template>
  <div class="splash-root" @click="skip">
    <SplashVariantFrame :variant="props.variant" />
  </div>
</template>

<style>
@font-face {
  font-family: 'Splash Agibot';
  src: url('@renderer/assets/fonts/splash/AgibotDisplay/AgibotDisplay-Regular.ttf')
    format('truetype');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: 'Splash Agibot';
  src: url('@renderer/assets/fonts/splash/AgibotDisplay/AgibotDisplay-Bold.ttf') format('truetype');
  font-weight: 700;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: 'Splash Comfortaa';
  src: url('@renderer/assets/fonts/splash/Comfortaa/Comfortaa-VariableFont_wght.ttf')
    format('truetype');
  font-weight: 300 700;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: 'Splash Aozora';
  src: url('@renderer/assets/fonts/splash/AozoraMincho/AozoraMincho-thin.ttf') format('truetype');
  font-weight: 300;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: 'Splash Typewriter';
  src: url('@renderer/assets/fonts/CourierPrime-Regular.ttf') format('truetype');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
</style>

<style scoped>
.splash-root {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100vw;
  height: 100vh;
  background: #050912;
  cursor: pointer;
  user-select: none;
}
</style>
