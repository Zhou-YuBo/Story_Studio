<script setup lang="ts">
import { APP_META } from '../../config/app-meta'
import { WORKBENCHES, type WorkbenchId } from '../../config/workbenches'
import { usePreferencesStore, type SplashVariant } from '../../stores/preferences'
import skycodeLogo from '../../assets/images/skycode_logo.png'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const preferences = usePreferencesStore()

const splashOptions: { id: SplashVariant; label: string; description: string }[] = [
  { id: 'structure-big', label: 'Structure Map', description: '默认的结构星图风格' },
  { id: 'noir', label: 'Noir Studio', description: '黑金电影片头感' },
  { id: 'paper', label: 'Paper Script', description: '纸页与打字机气质' },
  { id: 'console', label: 'Console Load', description: '终端启动与模块加载' },
  { id: 'soft', label: 'Soft Studio', description: '柔和玻璃与光晕' }
]

function selectSplashVariant(variant: SplashVariant): void {
  preferences.setSplashVariant(variant)
}

function selectDefaultWorkbench(id: WorkbenchId): void {
  preferences.setDefaultWorkbench(id)
}
</script>

<template>
  <Teleport to="body">
    <div v-if="props.open" class="settings-backdrop" @click.self="emit('close')">
      <section class="settings-dialog" role="dialog" aria-modal="true" aria-label="设置">
        <header class="settings-header">
          <div>
            <p class="settings-kicker">Story Studio</p>
            <h2>设置</h2>
          </div>
          <button class="settings-close" type="button" @click="emit('close')">关闭</button>
        </header>

        <div class="settings-body">
          <section class="settings-section">
            <div class="section-copy">
              <h3>开屏选择</h3>
              <p>选择下次启动时显示的开屏风格。</p>
            </div>
            <div class="option-grid">
              <button
                v-for="option in splashOptions"
                :key="option.id"
                class="option-card"
                :class="{ 'is-active': preferences.splashVariant === option.id }"
                type="button"
                @click="selectSplashVariant(option.id)"
              >
                <span>{{ option.label }}</span>
                <small>{{ option.description }}</small>
              </button>
            </div>
          </section>

          <section class="settings-section">
            <div class="section-copy">
              <h3>默认工作台</h3>
              <p>下次进入项目时，打开：</p>
            </div>
            <div class="workbench-row">
              <button
                v-for="workbench in WORKBENCHES"
                :key="workbench.id"
                class="workbench-pill"
                :class="{ 'is-active': preferences.defaultWorkbenchId === workbench.id }"
                type="button"
                @click="selectDefaultWorkbench(workbench.id)"
              >
                {{ workbench.label }}
              </button>
            </div>
            <label class="toggle-row">
              <input
                type="checkbox"
                :checked="preferences.rememberLastWorkbench"
                @change="
                  preferences.setRememberLastWorkbench(($event.target as HTMLInputElement).checked)
                "
              />
              <span>记住上次离开的工作台，并优先打开它</span>
            </label>
          </section>

          <section class="settings-section about-section">
            <div class="section-copy">
              <h3>关于与致谢</h3>
              <p>{{ APP_META.studio }}</p>
            </div>
            <div class="about-card">
              <div>
                <strong>{{ APP_META.name }}</strong>
                <span>Version {{ APP_META.version }}</span>
              </div>
              <div>
                <span>Author</span>
                <span>{{ APP_META.author }}</span>
              </div>
              <div>
                <span>License</span>
                <span>{{ APP_META.license }}</span>
              </div>
              <div class="skycode-line">
                <img :src="skycodeLogo" alt="SkyCode" />
                <span>{{ APP_META.skycodeCredit }}</span>
              </div>
              <p class="format-note">剧本导出遵循行业格式：US Letter，Courier 12pt。</p>
            </div>
          </section>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.settings-backdrop {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: grid;
  place-items: center;
  padding: 32px;
  background: rgba(0, 0, 0, 0.62);
  backdrop-filter: blur(12px);
}

.settings-dialog {
  width: min(760px, 100%);
  max-height: min(720px, 92vh);
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 24px;
  background: #0b0d12;
  color: #f7f7f8;
  box-shadow: 0 28px 90px rgba(0, 0, 0, 0.48);
}

.settings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 24px 28px 18px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.settings-kicker {
  margin: 0 0 6px;
  color: rgba(128, 235, 255, 0.66);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
}

.settings-header h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 650;
}

.settings-close {
  padding: 7px 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.72);
  cursor: pointer;
}
.settings-close:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
}

.settings-body {
  display: grid;
  gap: 24px;
  max-height: calc(min(720px, 92vh) - 88px);
  overflow: auto;
  padding: 24px 28px 28px;
}

.settings-section {
  display: grid;
  gap: 14px;
}

.section-copy h3 {
  margin: 0 0 6px;
  font-size: 15px;
  font-weight: 650;
}
.section-copy p {
  margin: 0;
  color: rgba(255, 255, 255, 0.45);
  font-size: 12px;
  line-height: 1.7;
}

.option-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px;
}

.option-card {
  display: grid;
  gap: 6px;
  min-height: 86px;
  padding: 13px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.035);
  color: rgba(255, 255, 255, 0.82);
  text-align: left;
  cursor: pointer;
}
.option-card span {
  font-size: 13px;
  font-weight: 650;
}
.option-card small {
  color: rgba(255, 255, 255, 0.42);
  font-size: 11px;
  line-height: 1.45;
}
.option-card:hover,
.option-card.is-active {
  border-color: rgba(128, 235, 255, 0.45);
  background: rgba(16, 222, 255, 0.09);
}

.workbench-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.workbench-pill {
  padding: 8px 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.035);
  color: rgba(255, 255, 255, 0.72);
  cursor: pointer;
}
.workbench-pill:hover,
.workbench-pill.is-active {
  border-color: rgba(128, 235, 255, 0.45);
  background: rgba(16, 222, 255, 0.09);
  color: #e8fbff;
}

.toggle-row {
  display: flex;
  align-items: center;
  gap: 10px;
  width: max-content;
  color: rgba(255, 255, 255, 0.74);
  font-size: 13px;
  cursor: pointer;
}
.toggle-row input {
  width: 16px;
  height: 16px;
  accent-color: #22d3ee;
}

.about-card {
  display: grid;
  gap: 10px;
  padding: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.035);
  color: rgba(255, 255, 255, 0.7);
  font-size: 12px;
}
.about-card div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
}
.about-card strong {
  color: #fff;
  font-size: 16px;
}
.about-card .skycode-line {
  justify-content: flex-start;
  color: rgba(178, 237, 255, 0.66);
}
.skycode-line img {
  width: 18px;
  height: 18px;
  object-fit: contain;
  opacity: 0.7;
}
.format-note {
  margin: 4px 0 0;
  color: rgba(255, 255, 255, 0.42);
  line-height: 1.7;
}

@media (max-width: 760px) {
  .option-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
