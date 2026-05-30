<script setup lang="ts">
import type { SplashVariant } from '../../stores/preferences'
import skycodeLogo from '../../assets/images/skycode_logo.png'

const props = defineProps<{
  variant: SplashVariant
}>()
</script>

<template>
  <div class="preview-frame" :data-variant="props.variant">
    <section class="splash-card splash-noir" aria-label="Noir Studio splash">
      <div class="noir-halo"></div>
      <div class="card-grain"></div>
      <div class="studio-mark">RICHOPERA PRESENTS</div>
      <div class="noir-title-block">
        <p class="tiny-label">Where your stories take shape</p>
        <h2>Story Studio</h2>
        <p class="english-line">
          <span>Story is metaphor for life.</span><span>Writing is craft for story.</span>
        </p>
        <p class="chinese-line">让你的故事，从这里走向台前。</p>
      </div>
      <div class="splash-footer">
        <span>Entering your private studio</span>
        <i></i>
      </div>
      <div class="skycode-credit skycode-noir">
        <img :src="skycodeLogo" alt="SkyCode" />
        <span>天码×索奥提供算力支持 · SkyCode</span>
      </div>
    </section>

    <section class="splash-card splash-structure" aria-label="Structure Map splash">
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
        <p class="english-line">
          <span>Story is metaphor for life.</span><span>Writing is craft for story.</span>
        </p>
        <p class="chinese-line">让你的故事，从这里走向台前。</p>
      </div>
      <div class="module-strip">
        <span>STRUCTURE</span>
        <span>SCENE</span>
        <span>CHARACTER</span>
        <span>REMINDER</span>
      </div>
      <div class="skycode-credit skycode-structure">
        <img :src="skycodeLogo" alt="SkyCode" />
        <span>天码×索奥提供算力支持 · SkyCode</span>
      </div>
    </section>

    <section class="splash-card splash-paper" aria-label="Paper Script splash">
      <div class="paper-sheet">
        <div class="paper-punch"></div>
        <p class="type-kicker">A RICHOPERA CREATION</p>
        <h2>Story Studio</h2>
        <p class="typed-line">37 EXT. STREET - NIGHT</p>
        <p class="typed-small">
          <span>Story is metaphor for life.</span><span>Writing is craft for story.</span>
        </p>
        <p class="chinese-line">让你的故事，从这里走向台前。</p>
      </div>
      <div class="paper-shadow"></div>
      <div class="splash-footer dark-footer">
        <span>Entering your private studio</span>
        <i></i>
      </div>
      <div class="skycode-credit skycode-paper">
        <img :src="skycodeLogo" alt="SkyCode" />
        <span>天码×索奥提供算力支持 · SkyCode</span>
      </div>
    </section>

    <section class="splash-card splash-console" aria-label="Console Load splash">
      <div class="console-topline">
        <span>RS-00</span>
        <span>LOCAL BUILD</span>
      </div>
      <div class="console-main">
        <p class="studio-mark">A RICHOPERA CREATION</p>
        <h2>STORY STUDIO</h2>
        <p class="tiny-label">Where your stories take shape</p>
        <p class="english-line">
          <span>Story is metaphor for life.</span><span>Writing is craft for story.</span>
        </p>
      </div>
      <div class="boot-list">
        <p><span>✓</span> structure.workbench</p>
        <p><span>✓</span> scene.editor</p>
        <p><span>✓</span> character.universe</p>
        <p><span>·</span> reminder.layer</p>
      </div>
      <p class="chinese-line">让你的故事，从这里走向台前。</p>
      <div class="console-progress"><i></i></div>
      <div class="skycode-credit skycode-console">
        <img :src="skycodeLogo" alt="SkyCode" />
        <span>天码×索奥提供算力支持 · SkyCode</span>
      </div>
    </section>

    <section class="splash-card splash-soft" aria-label="Soft Studio splash">
      <div class="soft-orb orb-one"></div>
      <div class="soft-orb orb-two"></div>
      <div class="soft-card-inner">
        <p class="studio-mark">RICHOPERA PRESENTS</p>
        <h2>Story Studio</h2>
        <p class="tiny-label">Where your stories take shape</p>
        <p class="english-line">
          <span>Story is metaphor for life.</span><span>Writing is craft for story.</span>
        </p>
        <p class="chinese-line">让你的故事，从这里走向台前。</p>
        <div class="soft-loader">
          <span></span>
          <span></span>
          <span></span>
        </div>
        <div class="skycode-credit skycode-soft">
          <img :src="skycodeLogo" alt="SkyCode" />
          <span>天码×索奥提供算力支持 · SkyCode</span>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.preview-frame {
  position: relative;
  width: 640px;
  height: 400px;
  perspective: 1200px;
}

.splash-card {
  position: absolute;
  inset: 0;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 28px;
  box-shadow:
    0 36px 90px rgba(0, 0, 0, 0.44),
    0 0 0 1px rgba(255, 255, 255, 0.035) inset;
  opacity: 0;
  transform: translateY(24px) rotateX(8deg) scale(0.96);
  pointer-events: none;
  transition:
    opacity 260ms ease,
    transform 260ms ease;
}

.preview-frame[data-variant='noir'] .splash-noir,
.preview-frame[data-variant='structure-big'] .splash-structure,
.preview-frame[data-variant='paper'] .splash-paper,
.preview-frame[data-variant='console'] .splash-console,
.preview-frame[data-variant='soft'] .splash-soft {
  opacity: 1;
  transform: none;
  pointer-events: auto;
}

.card-grain::before {
  position: absolute;
  inset: 0;
  content: '';
  opacity: 0.12;
  background-image:
    linear-gradient(115deg, transparent 0 42%, rgba(255, 255, 255, 0.08) 43%, transparent 45% 100%),
    repeating-radial-gradient(
      circle at 24% 18%,
      rgba(255, 255, 255, 0.16) 0 1px,
      transparent 1px 5px
    );
  mix-blend-mode: soft-light;
}

.studio-mark {
  margin: 0;
  color: rgba(255, 255, 255, 0.7);
  font-family: Inter, ui-sans-serif, system-ui, sans-serif;
  font-size: 12px;
  font-weight: 760;
  letter-spacing: 0.22em;
  line-height: 1.2;
  text-transform: uppercase;
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
  color: rgba(255, 255, 255, 0.68);
  font-size: 15px;
  letter-spacing: 0.02em;
}
.english-line span {
  display: block;
}

.chinese-line {
  margin: 0;
  color: rgba(255, 255, 255, 0.78);
  font-family: 'Splash Aozora', 'Noto Serif SC', serif;
  letter-spacing: 0.12em;
}

.splash-footer {
  position: absolute;
  right: 38px;
  bottom: 34px;
  left: 38px;
  display: flex;
  align-items: center;
  gap: 18px;
  color: rgba(255, 255, 255, 0.54);
  font-family: 'Splash Comfortaa', sans-serif;
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.splash-footer i {
  position: relative;
  flex: 1;
  height: 1px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.14);
}
.splash-footer i::after {
  position: absolute;
  inset: 0 auto 0 0;
  width: 44%;
  content: '';
  background: linear-gradient(90deg, transparent, #e6c16f, transparent);
  animation: loadSlide 2.2s ease-in-out infinite;
}

.skycode-credit {
  position: absolute;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: rgba(255, 255, 255, 0.42);
  font-family: 'Splash Comfortaa', 'Noto Sans SC', sans-serif;
  font-size: 10px;
  letter-spacing: 0.04em;
  white-space: nowrap;
  pointer-events: none;
}
.skycode-credit img {
  width: 15px;
  height: 15px;
  object-fit: contain;
  opacity: 0.78;
}

.splash-noir {
  display: grid;
  align-items: center;
  padding: 46px 54px;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.08), transparent 30%),
    radial-gradient(circle at 50% 46%, rgba(236, 196, 99, 0.16), transparent 36%),
    linear-gradient(160deg, #050505, #11100d 54%, #070707);
}
.noir-halo {
  position: absolute;
  top: 70px;
  left: 50%;
  width: 360px;
  height: 180px;
  border-radius: 50%;
  background: rgba(232, 196, 112, 0.12);
  filter: blur(52px);
  transform: translateX(-50%);
}
.splash-noir .studio-mark {
  position: absolute;
  top: 40px;
  left: 50%;
  color: rgba(232, 196, 112, 0.84);
  text-shadow: 0 0 18px rgba(232, 196, 112, 0.18);
  transform: translateX(-50%);
}
.noir-title-block {
  position: relative;
  z-index: 1;
  display: grid;
  justify-items: center;
  gap: 13px;
  text-align: center;
}
.splash-noir h2 {
  margin: 0;
  color: #fff7e4;
  font-family: 'Splash Comfortaa', sans-serif;
  font-size: 66px;
  font-weight: 600;
  letter-spacing: -0.09em;
  line-height: 0.92;
  text-shadow: 0 0 34px rgba(232, 196, 112, 0.16);
}
.splash-noir .chinese-line {
  margin-top: 2px;
  color: rgba(240, 224, 192, 0.86);
  font-size: 23px;
}
.skycode-noir {
  right: 38px;
  bottom: 16px;
  color: rgba(240, 224, 192, 0.4);
}
.skycode-noir img {
  filter: grayscale(1) sepia(0.18) brightness(1.45);
  opacity: 0.45;
}

.splash-structure {
  padding: 44px 48px;
  background:
    radial-gradient(circle at 80% 24%, rgba(0, 228, 255, 0.18), transparent 32%),
    radial-gradient(circle at 16% 74%, rgba(126, 104, 255, 0.22), transparent 34%),
    linear-gradient(145deg, #050912, #0a101d 62%, #07080d);
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
.node {
  position: absolute;
  width: 10px;
  height: 10px;
  border: 1px solid rgba(183, 246, 255, 0.9);
  border-radius: 50%;
  background: rgba(16, 222, 255, 0.35);
  box-shadow: 0 0 22px rgba(16, 222, 255, 0.7);
}
.node-a {
  top: 110px;
  left: 146px;
}
.node-b {
  top: 148px;
  right: 246px;
}
.node-c {
  right: 86px;
  bottom: 180px;
}
.node-d {
  left: 296px;
  bottom: 90px;
}
.structure-copy {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 16px;
  width: 560px;
}
.splash-structure .studio-mark {
  color: rgba(155, 238, 255, 0.82);
  font-weight: 780;
  letter-spacing: 0.2em;
  text-shadow: 0 0 18px rgba(69, 225, 255, 0.16);
}
.splash-structure h2 {
  margin: 8px 0 0;
  color: #e8fbff;
  font-family: 'Splash Agibot', sans-serif;
  font-size: 74px;
  font-weight: 700;
  letter-spacing: 0.01em;
  line-height: 0.92;
  text-shadow: 0 0 30px rgba(69, 225, 255, 0.24);
}
.splash-structure .english-line {
  max-width: 390px;
  color: rgba(214, 246, 255, 0.7);
  font-family: 'Splash Comfortaa', sans-serif;
  line-height: 1.6;
}
.splash-structure .chinese-line {
  margin-top: 4px;
  color: rgba(236, 251, 255, 0.88);
  font-size: 22px;
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
.skycode-structure {
  right: 44px;
  top: 34px;
  color: rgba(178, 237, 255, 0.46);
  font-family: 'Splash Agibot', 'Noto Sans SC', sans-serif;
  letter-spacing: 0.08em;
}
.skycode-structure img {
  filter: saturate(0.72) brightness(1.06);
  opacity: 0.52;
}

.splash-paper {
  background:
    radial-gradient(circle at 28% 28%, rgba(213, 177, 114, 0.15), transparent 34%),
    linear-gradient(145deg, #12100e, #050505);
}
.paper-sheet {
  position: absolute;
  top: 42px;
  left: 86px;
  z-index: 1;
  display: grid;
  gap: 12px;
  width: 430px;
  min-height: 282px;
  padding: 38px 44px 34px;
  color: #17120c;
  border-radius: 12px;
  background:
    linear-gradient(90deg, rgba(168, 121, 78, 0.14) 0 1px, transparent 1px),
    linear-gradient(#f2ead8, #e6d6b9);
  background-size:
    56px 100%,
    auto;
  box-shadow: 26px 32px 60px rgba(0, 0, 0, 0.42);
  transform: rotate(-2deg);
}
.paper-shadow {
  position: absolute;
  right: 94px;
  bottom: 76px;
  width: 420px;
  height: 240px;
  border-radius: 18px;
  background: rgba(0, 0, 0, 0.26);
  filter: blur(26px);
  transform: rotate(3deg);
}
.paper-punch {
  position: absolute;
  top: 32px;
  left: 18px;
  display: grid;
  gap: 38px;
}
.paper-punch::before,
.paper-punch::after {
  display: block;
  width: 8px;
  height: 8px;
  content: '';
  border-radius: 50%;
  background: rgba(91, 62, 31, 0.24);
}
.type-kicker {
  margin: 0;
  color: rgba(28, 20, 11, 0.68);
  font-family: Inter, ui-sans-serif, system-ui, sans-serif;
  font-size: 12px;
  font-weight: 760;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}
.splash-paper h2 {
  margin: 4px 0 8px;
  font-family: 'Splash Typewriter', monospace;
  font-size: 46px;
  font-weight: 400;
  letter-spacing: -0.04em;
}
.typed-line,
.typed-small {
  margin: 0;
  font-family: 'Splash Typewriter', monospace;
  line-height: 1.48;
}
.typed-line {
  font-size: 14px;
}
.typed-small {
  display: grid;
  gap: 4px;
  max-width: 310px;
  color: rgba(28, 20, 11, 0.66);
  font-size: 13px;
}
.typed-small span {
  display: block;
}
.splash-paper .chinese-line {
  margin-top: 6px;
  color: rgba(28, 20, 11, 0.84);
  font-size: 23px;
  letter-spacing: 0.08em;
}
.dark-footer {
  color: rgba(240, 222, 187, 0.52);
}
.skycode-paper {
  right: 42px;
  bottom: 17px;
  color: rgba(238, 222, 187, 0.43);
  font-family: 'Splash Typewriter', 'Noto Sans SC', monospace;
  letter-spacing: 0.02em;
}
.skycode-paper img {
  filter: grayscale(1) sepia(0.26) brightness(1.15);
  opacity: 0.42;
}

.splash-console {
  padding: 38px 42px;
  background:
    linear-gradient(rgba(97, 255, 183, 0.055) 50%, transparent 50%) 0 0 / 100% 4px,
    radial-gradient(circle at 76% 52%, rgba(60, 255, 166, 0.12), transparent 34%),
    linear-gradient(145deg, #040807, #0b1110 62%, #020303);
}
.console-topline {
  display: flex;
  justify-content: space-between;
  color: rgba(130, 255, 190, 0.68);
  font-family: 'Splash Agibot', sans-serif;
  font-size: 12px;
  letter-spacing: 0.24em;
}
.console-main {
  display: grid;
  gap: 12px;
  margin-top: 52px;
}
.splash-console h2 {
  margin: 0;
  color: #d9ffe9;
  font-family: 'Splash Agibot', sans-serif;
  font-size: 54px;
  font-weight: 700;
  letter-spacing: 0.08em;
  line-height: 0.98;
  text-shadow: 0 0 28px rgba(89, 255, 169, 0.18);
}
.splash-console .english-line {
  color: rgba(204, 255, 226, 0.62);
  font-family: 'Splash Comfortaa', sans-serif;
}
.boot-list {
  position: absolute;
  right: 46px;
  bottom: 92px;
  display: grid;
  gap: 10px;
  min-width: 220px;
  padding: 16px 18px;
  border: 1px solid rgba(130, 255, 190, 0.18);
  background: rgba(0, 0, 0, 0.24);
}
.boot-list p {
  display: flex;
  gap: 10px;
  margin: 0;
  color: rgba(204, 255, 226, 0.68);
  font-family: 'Splash Typewriter', monospace;
  font-size: 13px;
}
.boot-list span {
  color: #7dffb8;
}
.splash-console .chinese-line {
  position: absolute;
  bottom: 52px;
  left: 42px;
  color: rgba(220, 255, 235, 0.82);
  font-size: 22px;
}
.console-progress {
  position: absolute;
  right: 42px;
  bottom: 54px;
  width: 230px;
  height: 4px;
  overflow: hidden;
  background: rgba(130, 255, 190, 0.14);
}
.console-progress i {
  display: block;
  width: 66%;
  height: 100%;
  background: linear-gradient(90deg, #56ffad, #d6ffe8);
  animation: consolePulse 1.8s ease-in-out infinite;
}
.skycode-console {
  left: 42px;
  bottom: 22px;
  color: rgba(138, 255, 192, 0.42);
  font-family: 'Splash Typewriter', 'Noto Sans SC', monospace;
  letter-spacing: 0.06em;
}
.skycode-console img {
  filter: hue-rotate(82deg) saturate(0.75) brightness(1.05);
  opacity: 0.42;
}

.splash-soft {
  display: grid;
  place-items: center;
  background:
    radial-gradient(circle at 30% 28%, rgba(255, 190, 156, 0.32), transparent 34%),
    radial-gradient(circle at 76% 74%, rgba(145, 176, 255, 0.28), transparent 36%),
    linear-gradient(145deg, #17131a, #0b1018);
}
.soft-card-inner {
  position: relative;
  z-index: 1;
  display: grid;
  justify-items: center;
  gap: 14px;
  width: 420px;
  padding: 50px 46px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 34px;
  background: rgba(255, 255, 255, 0.075);
  text-align: center;
  backdrop-filter: blur(30px);
}
.soft-orb {
  position: absolute;
  width: 220px;
  height: 220px;
  border-radius: 50%;
  filter: blur(18px);
}
.orb-one {
  top: -54px;
  left: 78px;
  background: rgba(255, 198, 138, 0.26);
}
.orb-two {
  right: 56px;
  bottom: -66px;
  background: rgba(113, 157, 255, 0.26);
}
.splash-soft .studio-mark {
  color: rgba(255, 246, 232, 0.72);
  letter-spacing: 0.18em;
}
.splash-soft h2 {
  margin: 0;
  font-family: 'Splash Comfortaa', sans-serif;
  font-size: 60px;
  font-weight: 650;
  letter-spacing: -0.1em;
  line-height: 0.96;
}
.splash-soft .english-line {
  color: rgba(255, 255, 255, 0.7);
  font-family: 'Splash Comfortaa', sans-serif;
  line-height: 1.55;
}
.splash-soft .chinese-line {
  color: rgba(255, 241, 224, 0.9);
  font-size: 24px;
}
.soft-loader {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}
.soft-loader span {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: rgba(255, 236, 206, 0.86);
  animation: dotPulse 1.2s ease-in-out infinite;
}
.soft-loader span:nth-child(2) {
  animation-delay: 120ms;
}
.soft-loader span:nth-child(3) {
  animation-delay: 240ms;
}
.skycode-soft {
  right: 26px;
  bottom: 22px;
  color: rgba(255, 241, 224, 0.44);
}
.skycode-soft img {
  filter: saturate(0.52) brightness(1.24);
  opacity: 0.46;
}

@keyframes loadSlide {
  0% {
    transform: translateX(-120%);
  }
  55%,
  100% {
    transform: translateX(260%);
  }
}
@keyframes dashMove {
  to {
    stroke-dashoffset: -160;
  }
}
@keyframes consolePulse {
  0%,
  100% {
    opacity: 0.58;
    transform: scaleX(0.82);
    transform-origin: left;
  }
  50% {
    opacity: 1;
    transform: scaleX(1);
  }
}
@keyframes dotPulse {
  0%,
  100% {
    opacity: 0.32;
    transform: translateY(0);
  }
  50% {
    opacity: 1;
    transform: translateY(-4px);
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 1ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
    transition-duration: 1ms !important;
  }
}
</style>
