import {
  ELEMENT_LAYOUT,
  FONT_FAMILY,
  FONT_SIZE_PT,
  LINE_HEIGHT_PX,
  PAGE_BACKGROUND,
  PAGE_CONTD_HEIGHT_PX,
  PAGE_GAP_BACKGROUND,
  PAGE_GAP_PX,
  PAGE_HEIGHT_IN,
  PAGE_MORE_HEIGHT_PX,
  PAGE_NUMBER_FONT_SIZE_PT,
  PAGE_PADDING_BOTTOM_IN,
  PAGE_PADDING_LEFT_IN,
  PAGE_PADDING_RIGHT_IN,
  PAGE_PADDING_TOP_IN,
  PAGE_WIDTH_IN
} from './page-config'

export type CssVars = Record<string, string>

function px(value: number): string {
  return `${value}px`
}

function lines(value: number): string {
  return px(value * LINE_HEIGHT_PX)
}

export function buildCssVars(): CssVars {
  const vars: CssVars = {
    '--page-width': `${PAGE_WIDTH_IN}in`,
    '--page-height': `${PAGE_HEIGHT_IN}in`,
    '--page-padding-top': `${PAGE_PADDING_TOP_IN}in`,
    '--page-padding-right': `${PAGE_PADDING_RIGHT_IN}in`,
    '--page-padding-bottom': `${PAGE_PADDING_BOTTOM_IN}in`,
    '--page-padding-left': `${PAGE_PADDING_LEFT_IN}in`,
    '--page-background': PAGE_BACKGROUND,
    '--page-gap': px(PAGE_GAP_PX),
    '--page-gap-bg': PAGE_GAP_BACKGROUND,
    '--page-more-height': px(PAGE_MORE_HEIGHT_PX),
    '--page-contd-height': px(PAGE_CONTD_HEIGHT_PX),
    '--line-height': px(LINE_HEIGHT_PX),
    '--font-family-screenplay': FONT_FAMILY,
    '--font-size-screenplay': `${FONT_SIZE_PT}pt`,
    '--page-number-font-size': `${PAGE_NUMBER_FONT_SIZE_PT}pt`
  }

  for (const [type, layout] of Object.entries(ELEMENT_LAYOUT)) {
    vars[`--margin-${type}`] = lines(layout.marginTopLines)
    if (layout.paddingLeftPx !== undefined) vars[`--pad-left-${type}`] = px(layout.paddingLeftPx)
    if (layout.paddingRightPx !== undefined) vars[`--pad-right-${type}`] = px(layout.paddingRightPx)
  }

  return vars
}

export function applyCssVars(el: HTMLElement, vars: CssVars): void {
  for (const [name, value] of Object.entries(vars)) {
    el.style.setProperty(name, value)
  }
}
