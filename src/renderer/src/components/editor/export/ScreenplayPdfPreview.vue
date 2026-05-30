<script setup lang="ts">
import { computed } from 'vue'
import {
  ELEMENT_LAYOUT,
  FONT_FAMILY,
  FONT_SIZE_PT,
  LINE_HEIGHT_PX,
  PAGE_HEIGHT_IN,
  PAGE_NUMBER_FONT_SIZE_PT,
  PAGE_PADDING_BOTTOM_IN,
  PAGE_PADDING_LEFT_IN,
  PAGE_PADDING_RIGHT_IN,
  PAGE_PADDING_TOP_IN,
  PAGE_WIDTH_IN
} from '../page-layout/page-config'
import { buildExportPages } from './build-export-pages'
import type { ExportBlockFragment } from './export-types'

const props = defineProps<{
  sceneDoc: Record<string, unknown> | null | undefined
}>()

const pagination = computed(() => buildExportPages(props.sceneDoc))

defineExpose({ pagination })

function layoutFor(type: string): (typeof ELEMENT_LAYOUT)[string] {
  return ELEMENT_LAYOUT[type] ?? ELEMENT_LAYOUT.general
}

function fragmentStyle(fragment: ExportBlockFragment): Record<string, string> {
  const layout = layoutFor(fragment.type)
  return {
    top: `${fragment.lineInPage * LINE_HEIGHT_PX}px`,
    left: '0',
    right: '0',
    paddingLeft: `${layout.paddingLeftPx ?? 0}px`,
    paddingRight: `${layout.paddingRightPx ?? 0}px`,
    textAlign: layout.textAlign ?? 'left',
    fontWeight: layout.bold ? '700' : '400',
    fontStyle: layout.italic ? 'italic' : 'normal',
    textDecoration: layout.underline ? 'underline' : 'none',
    textTransform: layout.uppercase ? 'uppercase' : 'none'
  }
}
</script>

<template>
  <div class="pdf-export-root">
    <section v-for="page in pagination.pages" :key="page.pageIndex" class="pdf-page">
      <div v-if="page.showPageNumber" class="pdf-page-number">{{ page.pageNumber }}.</div>
      <div class="pdf-page-content">
        <div v-if="page.contd" class="pdf-contd">{{ page.contd }}</div>
        <div
          v-for="fragment in page.blocks"
          :key="`${page.pageIndex}-${fragment.blockIndex}-${fragment.lineInPage}`"
          class="pdf-block"
          :class="`pdf-${fragment.type}`"
          :style="fragmentStyle(fragment)"
        >
          <div v-for="line in fragment.lines" :key="line.lineIndexInBlock" class="pdf-line">
            {{ line.text || ' ' }}
          </div>
        </div>
        <div v-if="page.more" class="pdf-more">{{ page.more }}</div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.pdf-export-root {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  color: #000;
}

.pdf-page {
  position: relative;
  box-sizing: border-box;
  width: v-bind('`${PAGE_WIDTH_IN}in`');
  height: v-bind('`${PAGE_HEIGHT_IN}in`');
  padding: v-bind('`${PAGE_PADDING_TOP_IN}in ${PAGE_PADDING_RIGHT_IN}in ${PAGE_PADDING_BOTTOM_IN}in ${PAGE_PADDING_LEFT_IN}in`');
  overflow: hidden;
  background: #fff;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35);
  break-after: page;
  page-break-after: always;
}

.pdf-page:last-child {
  break-after: auto;
  page-break-after: auto;
}

.pdf-page-content {
  position: relative;
  height: 100%;
  font-family: v-bind('FONT_FAMILY');
  font-size: v-bind('`${FONT_SIZE_PT}pt`');
  line-height: v-bind('`${LINE_HEIGHT_PX}px`');
  white-space: pre;
}

.pdf-page-number {
  position: absolute;
  top: 0.5in;
  right: 1in;
  font-family: v-bind('FONT_FAMILY');
  font-size: v-bind('`${PAGE_NUMBER_FONT_SIZE_PT}pt`');
  line-height: v-bind('`${LINE_HEIGHT_PX}px`');
}

.pdf-block {
  position: absolute;
  box-sizing: border-box;
  font-family: v-bind('FONT_FAMILY');
  font-size: v-bind('`${FONT_SIZE_PT}pt`');
  line-height: v-bind('`${LINE_HEIGHT_PX}px`');
}

.pdf-line {
  height: v-bind('`${LINE_HEIGHT_PX}px`');
  overflow: hidden;
  white-space: pre;
}

.pdf-more {
  position: absolute;
  left: 96px;
  right: 144px;
  bottom: 0;
  height: v-bind('`${LINE_HEIGHT_PX}px`');
  font-family: v-bind('FONT_FAMILY');
  font-size: v-bind('`${FONT_SIZE_PT}pt`');
  line-height: v-bind('`${LINE_HEIGHT_PX}px`');
  text-align: center;
}

.pdf-contd {
  position: absolute;
  top: 0;
  left: 211px;
  right: 0;
  height: v-bind('`${LINE_HEIGHT_PX}px`');
  font-family: v-bind('FONT_FAMILY');
  font-size: v-bind('`${FONT_SIZE_PT}pt`');
  font-weight: 700;
  line-height: v-bind('`${LINE_HEIGHT_PX}px`');
  text-transform: uppercase;
}

@media print {
  .pdf-export-root {
    display: block;
    gap: 0;
  }

  .pdf-page {
    box-shadow: none;
  }
}
</style>
