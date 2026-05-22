function isCJK(code: number): boolean {
  return (
    (code >= 0x2e80 && code <= 0x9fff) ||
    (code >= 0xf900 && code <= 0xfaff) ||
    (code >= 0xfe30 && code <= 0xfe4f) ||
    (code >= 0xff01 && code <= 0xff60) ||
    (code >= 0xffe0 && code <= 0xffe6)
  )
}

export function textWidth(text: string): number {
  let width = 0
  for (let i = 0; i < text.length; i++) {
    width += isCJK(text.charCodeAt(i)) ? 2 : 1
  }
  return width
}

export function countTextLines(text: string, charsPerLine: number): number {
  if (!text || text.length === 0) return 1

  let lines = 1
  let lineWidth = 0

  for (let i = 0; i < text.length; i++) {
    const w = isCJK(text.charCodeAt(i)) ? 2 : 1
    lineWidth += w
    if (lineWidth > charsPerLine) {
      lines++
      lineWidth = w
    }
  }

  return lines
}
