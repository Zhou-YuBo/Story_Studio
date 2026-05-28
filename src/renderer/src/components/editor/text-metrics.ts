export function isCJK(code: number): boolean {
  return (
    (code >= 0x2e80 && code <= 0x9fff) ||
    (code >= 0xf900 && code <= 0xfaff) ||
    (code >= 0xfe30 && code <= 0xfe4f) ||
    (code >= 0xff01 && code <= 0xff60) ||
    (code >= 0xffe0 && code <= 0xffe6)
  )
}

function charWidth(code: number): number {
  return isCJK(code) ? 2 : 1
}

export function textWidth(text: string): number {
  let width = 0
  for (let i = 0; i < text.length; i += 1) {
    width += charWidth(text.charCodeAt(i))
  }
  return width
}

export function countTextLines(text: string, charsPerLine: number): number {
  if (!text || text.length === 0) return 1

  let lines = 1
  let lineWidth = 0

  for (let i = 0; i < text.length; i += 1) {
    const width = charWidth(text.charCodeAt(i))
    lineWidth += width
    if (lineWidth > charsPerLine) {
      lines += 1
      lineWidth = width
    }
  }

  return lines
}

export function textLineOffset(text: string, charsPerLine: number): number {
  let lines = 0
  let lineWidth = 0

  for (let i = 0; i < text.length; i += 1) {
    const width = charWidth(text.charCodeAt(i))
    lineWidth += width
    if (lineWidth > charsPerLine) {
      lines += 1
      lineWidth = width
    }
  }

  return lines
}
