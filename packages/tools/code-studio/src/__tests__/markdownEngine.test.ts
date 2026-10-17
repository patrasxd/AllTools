import { describe, it, expect } from 'vitest'
import { renderMarkdown } from '../utils/markdownEngine'

describe('renderMarkdown', () => {
  it('renders common GitHub flavoured markdown', () => {
    const html = renderMarkdown(
      '# Title\n\nSome **bold** and `code`.\n\n- [x] done\n- [ ] todo\n\n| a | b |\n| - | - |\n| 1 | 2 |\n',
    )
    expect(html).toContain('<h1>Title</h1>')
    expect(html).toContain('<strong>bold</strong>')
    expect(html).toContain('<code>code</code>')
    expect(html).toContain('<table>')
  })

  it('removes scripts and event handlers', () => {
    const html = renderMarkdown(
      '<script>alert(1)</script>\n\n<img src="x" onerror="alert(1)">\n\n<a href="javascript:alert(1)">x</a>',
    )
    expect(html).not.toContain('<script')
    expect(html).not.toContain('onerror')
    expect(html).not.toContain('javascript:')
  })

  it('removes styles and form controls', () => {
    const html = renderMarkdown(
      '<style>body{display:none}</style>\n\n<form action="/x"><input name="a"><button>go</button></form>',
    )
    expect(html).not.toContain('<style')
    expect(html).not.toContain('<form')
    expect(html).not.toContain('<input')
    expect(html).not.toContain('<button')
  })

  it('opens links safely in a new tab', () => {
    const html = renderMarkdown('[site](https://example.com)')
    expect(html).toContain('href="https://example.com"')
    expect(html).toContain('rel="noopener noreferrer"')
    expect(html).toContain('target="_blank"')
  })

  it('replaces remote images with their alt text', () => {
    const html = renderMarkdown('![Logo](https://example.com/logo.png)')
    expect(html).not.toContain('<img')
    expect(html).toContain('[image: Logo]')
  })

  it('keeps embedded data images', () => {
    const html = renderMarkdown('![dot](data:image/png;base64,iVBORw0KGgo=)')
    expect(html).toContain('<img')
  })

  it('handles empty input', () => {
    expect(renderMarkdown('')).toBe('')
  })
})
