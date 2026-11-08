/** Save text as a file in the browser (no server involved). */
export function downloadText(filename: string, text: string, mime: string, bom = false): void {
  const blob = new Blob([bom ? '\uFEFF' : '', text], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
