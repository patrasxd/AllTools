import DOMPurify from 'dompurify'
import { Marked } from 'marked'

const marked = new Marked({ gfm: true, breaks: false })

let hooksInstalled = false

function installHooks() {
  if (hooksInstalled) return
  hooksInstalled = true

  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A') {
      node.setAttribute('rel', 'noopener noreferrer')
      node.setAttribute('target', '_blank')
    }
    // Remote images would be blocked by the app's CSP anyway; show the alt text so nothing silently disappears.
    if (node.tagName === 'IMG') {
      const src = node.getAttribute('src') ?? ''
      if (!src.startsWith('data:')) {
        const label = node.getAttribute('alt') || src
        const placeholder = node.ownerDocument.createElement('span')
        placeholder.className = 'cs-md-image-blocked'
        placeholder.textContent = `[image: ${label}]`
        node.replaceWith(placeholder)
      }
    }
  })
}

/**
 * Renders Markdown to sanitized HTML. The output is safe to inject into the page: scripts, event handlers,
 * styles, forms and remote images are removed.
 */
export function renderMarkdown(source: string): string {
  installHooks()
  const html = marked.parse(source, { async: false }) as string
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['style', 'form', 'input', 'button', 'textarea', 'select'],
    ADD_ATTR: ['target'],
  })
}
