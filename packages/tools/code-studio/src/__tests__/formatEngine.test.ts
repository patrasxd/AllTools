import { describe, it, expect } from 'vitest'
import { formatCode, isFormattable, minifyJson } from '../utils/formatEngine'

describe('isFormattable', () => {
  it('knows which languages have a formatter', () => {
    for (const id of ['javascript', 'typescript', 'json', 'css', 'html', 'markdown', 'yaml', 'sql']) {
      expect(isFormattable(id)).toBe(true)
    }
    for (const id of ['plaintext', 'python', 'java', 'cpp', 'shell', 'xml']) {
      expect(isFormattable(id)).toBe(false)
    }
  })
})

describe('formatCode', () => {
  it('formats JavaScript', async () => {
    const result = await formatCode('const a={b:1,c:[1,2,3]};function f(x){return x+1}', 'javascript', { tabSize: 2 })
    expect(result).toEqual({
      ok: true,
      text: 'const a = { b: 1, c: [1, 2, 3] };\nfunction f(x) {\n  return x + 1;\n}\n',
    })
  })

  it('formats TypeScript', async () => {
    const result = await formatCode('interface A{a:number}\nconst x:A={a:1}', 'typescript', { tabSize: 2 })
    expect(result).toEqual({ ok: true, text: 'interface A {\n  a: number;\n}\nconst x: A = { a: 1 };\n' })
  })

  it('formats JSON and respects the tab size', async () => {
    const result = await formatCode('{"a":{"b":1}}', 'json', { tabSize: 4 })
    expect(result).toEqual({ ok: true, text: '{ "a": { "b": 1 } }\n' })
    const wide = await formatCode(
      '{"a":{"b":[1,2,3],"c":"a long string to force the object to break onto several lines","d":null}}',
      'json',
      {
        tabSize: 4,
      },
    )
    expect(wide.ok && wide.text.includes('\n    "a"')).toBe(true)
  })

  it('formats CSS, SCSS and LESS by file extension', async () => {
    expect(await formatCode('a{color:red}', 'css', { tabSize: 2, fileName: 'a.css' })).toEqual({
      ok: true,
      text: 'a {\n  color: red;\n}\n',
    })
    const scss = await formatCode('.a{.b{color:red}}', 'css', { tabSize: 2, fileName: 'a.scss' })
    expect(scss.ok).toBe(true)
    const less = await formatCode('@c:red;.a{color:@c}', 'css', { tabSize: 2, fileName: 'a.less' })
    expect(less.ok).toBe(true)
  })

  it('formats HTML, Markdown and YAML', async () => {
    const html = await formatCode('<div><p>hi</p></div>', 'html', { tabSize: 2 })
    expect(html.ok).toBe(true)
    expect(await formatCode('# T\n\n\n\ntext', 'markdown', { tabSize: 2 })).toEqual({ ok: true, text: '# T\n\ntext\n' })
    expect(await formatCode('a:   1\nb:\n    - x', 'yaml', { tabSize: 2 })).toEqual({
      ok: true,
      text: 'a: 1\nb:\n  - x\n',
    })
  })

  it('formats SQL with upper-case keywords', async () => {
    const result = await formatCode('select a,b from t where a=1', 'sql', { tabSize: 2 })
    expect(result.ok && result.text).toContain('SELECT')
    expect(result.ok && result.text).toContain('FROM')
  })

  it('reports invalid code instead of changing it', async () => {
    const result = await formatCode('function (', 'javascript', { tabSize: 2 })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.message.length).toBeGreaterThan(0)
      expect(result.message).not.toContain('\n')
    }
  })

  it('reports unsupported languages', async () => {
    expect(await formatCode('x', 'python', { tabSize: 2 })).toEqual({ ok: false, message: 'Unsupported language' })
  })
})

describe('minifyJson', () => {
  it('collapses valid JSON to one line', () => {
    expect(minifyJson('{\n  "a": [1, 2],\n  "b": null\n}')).toBe('{"a":[1,2],"b":null}')
  })

  it('returns null for invalid JSON', () => {
    expect(minifyJson('{"a":')).toBeNull()
  })
})
