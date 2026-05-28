<script setup lang="ts">
import { useStructureStore } from '../stores/structure'

const store = useStructureStore()

function onActColorChange(actId: string, e: Event) {
  store.updateActColor(actId, (e.target as HTMLInputElement).value)
}

function onActLabelBlur(actId: string, e: Event) {
  store.updateActLabel(actId, (e.target as HTMLInputElement).value)
}

function onSeqColorChange(actId: string, seqId: string, e: Event) {
  store.updateSequenceColor(actId, seqId, (e.target as HTMLInputElement).value)
}

function onSeqLabelBlur(actId: string, seqId: string, e: Event) {
  store.updateSequenceLabel(actId, seqId, (e.target as HTMLInputElement).value)
}
</script>

<template>
  <div class="structure-view scrollbar-panel">
    <div class="structure-panel">
      <div class="panel-header">
        <span class="panel-title">结构配置</span>
        <button class="add-btn" @click="store.addAct()">+ 添加幕</button>
      </div>

      <div v-if="store.acts.length === 0" class="empty-hint">
        暂无结构，点击「添加幕」开始配置
      </div>

      <div class="act-list">
        <div v-for="act in store.acts" :key="act.id" class="act-block">
          <div class="act-row">
            <input
              type="color"
              :value="act.color"
              class="color-picker"
              @input="onActColorChange(act.id, $event)"
            />
            <input
              type="text"
              :value="act.label"
              class="label-input act-label-input"
              @blur="onActLabelBlur(act.id, $event)"
              @keydown.enter="($event.target as HTMLInputElement).blur()"
            />
            <button class="remove-btn" @click="store.removeAct(act.id)" title="删除幕">×</button>
          </div>

          <div class="seq-list">
            <div v-for="seq in act.sequences" :key="seq.id" class="seq-row">
              <input
                type="color"
                :value="seq.color"
                class="color-picker color-picker-sm"
                @input="onSeqColorChange(act.id, seq.id, $event)"
              />
              <input
                type="text"
                :value="seq.label"
                class="label-input seq-label-input"
                @blur="onSeqLabelBlur(act.id, seq.id, $event)"
                @keydown.enter="($event.target as HTMLInputElement).blur()"
              />
              <button
                class="remove-btn remove-btn-sm"
                @click="store.removeSequence(act.id, seq.id)"
                title="删除序列"
              >×</button>
            </div>
          </div>

          <button class="add-seq-btn" @click="store.addSequence(act.id)">+ 添加序列</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.structure-view {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  padding: 40px 20px;
  overflow-y: auto;
  background: #18181b;
}

.structure-panel {
  width: 100%;
  max-width: 480px;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.panel-title {
  font-size: 18px;
  font-weight: 600;
  color: #d4d4d8;
}

.add-btn {
  padding: 6px 14px;
  border: 1px solid #3f3f46;
  border-radius: 6px;
  background: transparent;
  color: #a1a1aa;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
}

.add-btn:hover {
  background: #27272a;
  color: #d4d4d8;
  border-color: #52525b;
}

.empty-hint {
  color: #52525b;
  font-size: 14px;
  text-align: center;
  padding: 60px 0;
}

.act-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.act-block {
  background: #09090b;
  border: 1px solid #27272a;
  border-radius: 8px;
  padding: 12px;
}

.act-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.color-picker {
  width: 28px;
  height: 28px;
  border: 1px solid #3f3f46;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  padding: 1px;
  flex-shrink: 0;
}

.color-picker-sm {
  width: 22px;
  height: 22px;
}

.label-input {
  flex: 1;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 4px;
  color: #d4d4d8;
  padding: 4px 8px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.15s;
}

.label-input:hover {
  border-color: #3f3f46;
}

.label-input:focus {
  border-color: #a78bfa;
}

.act-label-input {
  font-weight: 600;
}

.seq-label-input {
  font-size: 13px;
}

.remove-btn {
  width: 26px;
  height: 26px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: #52525b;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.15s;
}

.remove-btn:hover {
  background: #27272a;
  color: #ef4444;
}

.remove-btn-sm {
  width: 22px;
  height: 22px;
  font-size: 14px;
}

.seq-list {
  margin: 8px 0 4px 20px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.seq-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.add-seq-btn {
  margin: 6px 0 0 20px;
  padding: 3px 10px;
  border: 1px dashed #3f3f46;
  border-radius: 4px;
  background: transparent;
  color: #71717a;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
}

.add-seq-btn:hover {
  background: #27272a;
  color: #a1a1aa;
  border-color: #52525b;
}
</style>
