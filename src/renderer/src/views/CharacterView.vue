<script setup lang="ts">
import CharacterDimensionWheel, {
  type CharacterDimensionPair,
  type CharacterDimensionSlot,
} from '../components/character/CharacterDimensionWheel.vue'

const overviewDimensions: CharacterDimensionPair[] = [
  { id: 'connection-loss', positive: '渴望连接', negative: '相信消失' },
  { id: 'control-collapse', positive: '控制', negative: '失控' },
  { id: 'honesty-deception', positive: '诚实', negative: '自我欺骗' },
  { id: 'tender-cruel', positive: '温柔', negative: '残酷' },
]

const overviewDimensionSlots: CharacterDimensionSlot[] = [
  { dimensionId: 'connection-loss' },
  { dimensionId: 'control-collapse' },
  { dimensionId: 'honesty-deception' },
  { dimensionId: 'tender-cruel' }
]
</script>

<template>
  <div class="character-workbench">
    <div class="workbench-shell">
      <RouterLink class="corner-entry corner-entry-left-top" to="/character/list" aria-label="人物列表">
        <span class="entry-kicker">演员名册</span>
        <span class="entry-title">人物列表</span>
        <span class="entry-copy">进入单个人物档案，整理人物真相、语言方式、欲望与恐惧。</span>
        <span class="entry-meta">
          <span>主角 1</span>
          <span>第一圈 4</span>
          <span>待整理 7</span>
        </span>
      </RouterLink>

      <RouterLink class="corner-entry corner-entry-right-top" to="/character/relationships" aria-label="二人关系">
        <span class="entry-kicker">关系中的自我</span>
        <span class="entry-title">二人关系</span>
        <span class="entry-copy">查看二人的亲疏变化、关系定义，以及彼此面前的定制自我。</span>
        <span class="relationship-preview">
          <span>林澈</span>
          <i></i>
          <span>周以安</span>
        </span>
      </RouterLink>

      <RouterLink
        class="dimension-wheel-button"
        to="/character/dimensions"
        aria-label="进入人物维度"
      >
        <span class="wheel-caption wheel-caption-top">人物维度</span>
        <CharacterDimensionWheel
          :dimensions="overviewDimensions"
          :slots="overviewDimensionSlots"
          :size="520"
        />
        <span class="wheel-caption wheel-caption-bottom">点击进入维度设计</span>
      </RouterLink>

      <RouterLink class="corner-entry corner-entry-left-bottom" to="/character/cast-universe" aria-label="卡司宇宙">
        <span class="entry-kicker">群像对照</span>
        <span class="entry-title">卡司宇宙</span>
        <span class="entry-copy">围绕中心人物编排多层卡司，观察他们如何照亮或挑战彼此。</span>
        <span class="orbit-preview">
          <span class="orbit orbit-a"></span>
          <span class="orbit orbit-b"></span>
          <span class="orbit-dot dot-a"></span>
          <span class="orbit-dot dot-b"></span>
          <span class="orbit-dot dot-c"></span>
        </span>
      </RouterLink>

      <RouterLink class="corner-entry corner-entry-right-bottom" to="/character/inquiry" aria-label="问询室">
        <span class="entry-kicker">来，坐</span>
        <span class="entry-title">问询室</span>
        <span class="entry-copy">请人物进来，让他说话；等他出去后，再以作者视角翻看记录。</span>
        <span class="entry-quote">“我不是害怕失去，我只是早就知道它会发生。”</span>
      </RouterLink>
    </div>
  </div>
</template>

<style scoped>
.character-workbench {
  width: 100%;
  height: 100%;
  overflow: hidden;
  background:
    radial-gradient(circle at center, rgba(120, 113, 108, 0.2), transparent 34%),
    radial-gradient(circle at 18% 16%, rgba(63, 63, 70, 0.42), transparent 28%),
    radial-gradient(circle at 82% 84%, rgba(39, 39, 42, 0.58), transparent 30%), #09090b;
  color: #f4f4f5;
}

.workbench-shell {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 640px;
  padding: 42px 52px;
}

.workbench-shell::before,
.workbench-shell::after {
  content: '';
  position: absolute;
  inset: 14%;
  pointer-events: none;
  border: 1px solid rgba(161, 161, 170, 0.08);
  transform: rotate(6deg);
}

.workbench-shell::after {
  inset: 22%;
  border-style: dashed;
  border-color: rgba(161, 161, 170, 0.06);
  transform: rotate(-9deg);
}

.corner-entry {
  position: absolute;
  z-index: 2;
  display: flex;
  width: min(320px, 26vw);
  min-height: 178px;
  flex-direction: column;
  padding: 24px;
  border: 1px solid rgba(82, 82, 91, 0.72);
  border-radius: 24px;
  background: rgba(24, 24, 27, 0.72);
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.28);
  color: inherit;
  font: inherit;
  text-align: left;
  text-decoration: none;
  backdrop-filter: blur(18px);
  cursor: pointer;
  transition:
    border-color 0.18s ease,
    background 0.18s ease,
    transform 0.18s ease,
    box-shadow 0.18s ease;
}

.corner-entry:hover {
  transform: translateY(-2px);
  border-color: rgba(212, 212, 216, 0.72);
  background: rgba(39, 39, 42, 0.82);
  box-shadow: 0 26px 80px rgba(0, 0, 0, 0.34);
}

.corner-entry-left-top {
  top: 42px;
  left: 52px;
}

.corner-entry-right-top {
  top: 42px;
  right: 52px;
}

.corner-entry-left-bottom {
  left: 52px;
  bottom: 42px;
}

.corner-entry-right-bottom {
  right: 52px;
  bottom: 42px;
}

.entry-kicker {
  margin-bottom: 12px;
  color: #a1a1aa;
  font-size: 12px;
  letter-spacing: 0.28em;
  text-transform: uppercase;
}

.entry-title {
  color: #fafafa;
  font-size: 28px;
  font-weight: 600;
  letter-spacing: 0.06em;
}

.entry-copy {
  margin-top: 14px;
  color: #a1a1aa;
  font-size: 14px;
  line-height: 1.8;
}

.entry-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 18px;
}

.entry-meta span {
  padding: 5px 9px;
  border: 1px solid rgba(82, 82, 91, 0.8);
  border-radius: 999px;
  color: #d4d4d8;
  font-size: 12px;
}

.relationship-preview {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 20px;
  color: #e4e4e7;
  font-size: 13px;
}

.relationship-preview i {
  width: 56px;
  height: 1px;
  background: linear-gradient(90deg, transparent, #d4d4d8, transparent);
}

.orbit-preview {
  position: relative;
  width: 118px;
  height: 62px;
  margin-top: 16px;
}

.orbit {
  position: absolute;
  border: 1px dashed rgba(212, 212, 216, 0.34);
  border-radius: 50%;
}

.orbit-a {
  inset: 8px 18px;
}

.orbit-b {
  inset: 0;
}

.orbit-dot {
  position: absolute;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #d4d4d8;
}

.dot-a {
  top: 8px;
  left: 54px;
}

.dot-b {
  top: 29px;
  right: 12px;
}

.dot-c {
  bottom: 10px;
  left: 22px;
}

.entry-quote {
  margin-top: 18px;
  padding-left: 14px;
  border-left: 1px solid rgba(212, 212, 216, 0.42);
  color: #d4d4d8;
  font-size: 13px;
  line-height: 1.8;
}

.dimension-wheel-button {
  position: absolute;
  z-index: 3;
  top: 50%;
  left: 50%;
  display: flex;
  width: min(42vw, 560px);
  height: min(42vw, 560px);
  min-width: 410px;
  min-height: 410px;
  align-items: center;
  justify-content: center;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-decoration: none;
  cursor: pointer;
  transform: translate(-50%, -50%);
  transition:
    filter 0.2s ease,
    transform 0.2s ease;
}

.dimension-wheel-button:hover {
  filter: drop-shadow(0 0 34px rgba(212, 212, 216, 0.18));
  transform: translate(-50%, -50%) scale(1.015);
}

.wheel-caption {
  position: absolute;
  left: 50%;
  z-index: 2;
  color: #a1a1aa;
  font-size: 13px;
  letter-spacing: 0.18em;
  white-space: nowrap;
  transform: translateX(-50%);
}

.wheel-caption-top {
  top: -6px;
  color: #f4f4f5;
  font-size: 16px;
}

.wheel-caption-bottom {
  bottom: -4px;
}

@media (max-width: 1100px) {
  .workbench-shell {
    min-height: 720px;
    padding: 28px;
  }

  .corner-entry {
    width: 280px;
    min-height: 158px;
    padding: 20px;
  }

  .corner-entry-left-top,
  .corner-entry-left-bottom {
    left: 28px;
  }

  .corner-entry-right-top,
  .corner-entry-right-bottom {
    right: 28px;
  }

  .corner-entry-left-top,
  .corner-entry-right-top {
    top: 28px;
  }

  .corner-entry-left-bottom,
  .corner-entry-right-bottom {
    bottom: 28px;
  }

  .dimension-wheel-button {
    min-width: 380px;
    min-height: 380px;
  }
}
</style>
