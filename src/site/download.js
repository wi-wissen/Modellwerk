// File downloads from the browser (CSV, images, project files).

export function download(blob, name) {
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = name
  link.click()
  setTimeout(() => URL.revokeObjectURL(link.href), 1000)
}

/** Saves an SVG string as .svg or, rendered at double resolution, as .png. */
export function downloadSvg(svg, baseName, kind = 'png') {
  const blob = new Blob([svg], { type: 'image/svg+xml' })
  if (kind === 'svg') {
    download(blob, `${baseName}.svg`)
    return
  }
  const img = new Image()
  img.onload = () => {
    const canvas = document.createElement('canvas')
    canvas.width = img.width * 2
    canvas.height = img.height * 2
    const ctx = canvas.getContext('2d')
    ctx.scale(2, 2)
    ctx.drawImage(img, 0, 0)
    URL.revokeObjectURL(img.src)
    canvas.toBlob((png) => download(png, `${baseName}.png`), 'image/png')
  }
  img.src = URL.createObjectURL(blob)
}

/** A file name from a title: letters and digits joined by dashes. */
export function fileBase(title, fallback = 'modellwerk') {
  return title.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || fallback
}
