<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue'

const emit = defineEmits<{ done: [] }>()

let timer: ReturnType<typeof setTimeout> | null = null

function skip() {
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
    <div class="splash-surface">
      <div class="map-grid"></div>
      <div class="node node-a"></div>
      <div class="node node-b"></div>
      <div class="node node-c"></div>
      <div class="node node-d"></div>
      <svg class="map-lines" viewBox="0 0 640 400" aria-hidden="true">
        <path d="M152 115 C230 62 312 86 384 156 S500 262 552 210" />
        <path d="M112 270 C214 235 284 258 346 312 S470 330 530 284" />
        <path d="M220 92 C242 170 244 230 304 302" />
      </svg>
      <div class="structure-copy">
        <p class="studio-mark">A RICHOPERA CREATION</p>
        <h2>Story Studio</h2>
        <p class="tiny-label">Where your stories take shape</p>
        <p class="english-line"><span>Story is metaphor for life.</span><span>Writing is craft for story.</span></p>
        <p class="chinese-line">让你的故事，从这里走向台前。</p>
      </div>
      <div class="module-strip">
        <span>STRUCTURE</span>
        <span>SCENE</span>
        <span>CHARACTER</span>
        <span>REMINDER</span>
      </div>
      <div class="skycode-credit">
        <img src="@renderer/assets/images/skycode_logo.png" alt="SkyCode" />
        <span>天码×索奥提供算力支持 · SkyCode</span>
      </div>
    </div>
  </div>
</template>

<style>
@font-face {
  font-family: 'Splash Agibot';
  src: url('@renderer/assets/fonts/splash/AgibotDisplay/AgibotDisplay-Regular.ttf') format('truetype');
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
  src: url('@renderer/assets/fonts/splash/Comfortaa/Comfortaa-VariableFont_wght.ttf') format('truetype');
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

.splash-surface {
  position: relative;
  width: 640px;
  height: 400px;
  overflow: hidden;
  padding: 44px 48px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 28px;
  box-shadow:
    0 36px 90px rgba(0, 0, 0, 0.44),
    0 0 0 1px rgba(255, 255, 255, 0.035) inset;
  background:
    radial-gradient(circle at 80% 24%, rgba(0, 228, 255, 0.18), transparent 32%),
    radial-gradient(circle at 16% 74%, rgba(126, 104, 255, 0.22), transparent 34%),
    linear-gradient(145deg, #050912, #0a101d 62%, #07080d);
  animation: splash-enter 0.8s ease-out both;
}

@keyframes splash-enter {
  from {
    opacity: 0;
    transform: translateY(24px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

.map-grid {
  position: absolute;
  inset: 0;
  opacity: 0.22;
  background-image:
    linear-gradient(rgba(124, 231, 255, 0.18) 1px, transparent 1px),
    linear-gradient(90deg, rgba(124, 231, 255, 0.18) 1px, transparent 1px);
  background-size: 38px 38px;
  mask-image: radial-gradient(circle at 55% 48%, black, transparent 70%);
}

.map-lines {
  position: absolute;
  inset: 0;
  opacity: 0.58;
}
.map-lines path {
  fill: none;
  stroke: rgba(128, 235, 255, 0.62);
  stroke-width: 1.2;
  stroke-dasharray: 7 9;
  animation: dashMove 16s linear infinite;
}
@keyframes dashMove {
  to { stroke-dashoffset: -160; }
}

.node {
  position: absolute;
  width: 10px;
  height: 10px;
  border: 1px solid rgba(183, 246, 255, 0.9);
  border-radius: 50%;
  background: rgba(16, 222, 255, 0.35);
  box-shadow: 0 0 22px rgba(16, 222, 255, 0.7);
}
.node-a { top: 110px; left: 146px; }
.node-b { top: 148px; right: 246px; }
.node-c { right: 86px; bottom: 180px; }
.node-d { left: 296px; bottom: 90px; }

.structure-copy {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 16px;
  width: 560px;
}

.studio-mark {
  margin: 0;
  color: rgba(155, 238, 255, 0.82);
  font-family: Inter, ui-sans-serif, system-ui, sans-serif;
  font-size: 12px;
  font-weight: 780;
  letter-spacing: 0.2em;
  line-height: 1.2;
  text-transform: uppercase;
  text-shadow: 0 0 18px rgba(69, 225, 255, 0.16);
}

h2 {
  margin: 8px 0 0;
  color: #e8fbff;
  font-family: 'Splash Agibot', sans-serif;
  font-size: 74px;
  font-weight: 700;
  letter-spacing: 0.01em;
  line-height: 0.92;
  text-shadow: 0 0 30px rgba(69, 225, 255, 0.24);
}

.tiny-label {
  margin: 0;
  color: rgba(255, 255, 255, 0.44);
  font-family: 'Splash Comfortaa', sans-serif;
  font-size: 12px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.english-line {
  display: grid;
  gap: 3px;
  margin: 0;
  max-width: 390px;
  color: rgba(214, 246, 255, 0.7);
  font-family: 'Splash Comfortaa', sans-serif;
  font-size: 15px;
  letter-spacing: 0.02em;
  line-height: 1.6;
}
.english-line span {
  display: block;
}

.chinese-line {
  margin: 0;
  margin-top: 4px;
  color: rgba(236, 251, 255, 0.88);
  font-family: 'Splash Aozora', 'Noto Serif SC', serif;
  font-size: 22px;
  letter-spacing: 0.12em;
}

.module-strip {
  position: absolute;
  right: 44px;
  bottom: 34px;
  left: 44px;
  display: flex;
  justify-content: space-between;
  color: rgba(128, 235, 255, 0.55);
  font-family: 'Splash Agibot', sans-serif;
  font-size: 10px;
  letter-spacing: 0.24em;
}

.skycode-credit {
  position: absolute;
  right: 44px;
  top: 34px;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: rgba(178, 237, 255, 0.46);
  font-family: 'Splash Agibot', 'Noto Sans SC', sans-serif;
  font-size: 10px;
  letter-spacing: 0.08em;
  white-space: nowrap;
  pointer-events: none;
}
.skycode-credit img {
  width: 15px;
  height: 15px;
  object-fit: contain;
  opacity: 0.52;
  filter: saturate(0.72) brightness(1.06);
}
</style>
