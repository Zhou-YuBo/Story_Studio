import { isCJK } from '../text-metrics'

function charWidth(code: number): number {
  return isCJK(code) ? 2 : 1
}

export function wrapTextLines(text: string, charsPerLine: number): string[] {
  if (!text || text.length === 0) return ['']

  const lines: string[] = []
  let line = ''
  let lineWidth = 0

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]
    const width = charWidth(text.charCodeAt(i))
    lineWidth += width

    if (lineWidth > charsPerLine) {
      lines.push(line)
      line = char
      lineWidth = width
    } else {
      line += char
    }
  }

  lines.push(line)
  return lines
}
