/** Starts a browser download for a text file. Nothing is uploaded: the file is built from a local Blob. */
export function downloadTextFile(fileName: string, text: string, mimeType: string): void {
  downloadBlob(fileName, new Blob([text], { type: mimeType }))
}

/** Starts a browser download for a Blob created on this device. */
export function downloadBlob(fileName: string, blob: Blob): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  link.remove()
  // Give the browser a moment to start the download before the URL is released.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Reads a file as UTF-8 text. */
export function readFileText(file: File): Promise<string> {
  if (typeof file.text === 'function') return file.text()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error ?? new Error('read failed'))
    reader.readAsText(file)
  })
}
