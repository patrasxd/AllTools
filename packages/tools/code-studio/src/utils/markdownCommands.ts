/**
 * Pure Markdown editing commands. Each command takes the document text and the current selection and returns one
 * replacement (`from`..`to` becomes `insert`) plus the selection to set afterwards. The editor applies the result as
 * a single undoable transaction, and the same functions can be tested without any DOM.
 */

export interface EditContext {
  text: string
  from: number
  to: number
}

export interface EditResult {
  from: number
  to: number
  insert: string
  selectFrom: number
  selectTo: number
}

export type MarkdownCommand = (ctx: EditContext) => EditResult

export type MarkdownCommandId =
  | 'bold'
  | 'italic'
  | 'strike'
  | 'code'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'quote'
  | 'bullet'
  | 'numbered'
  | 'task'
  | 'link'
  | 'image'
  | 'codeBlock'
  | 'table'
  | 'rule'

const lineStart = (text: string, pos: number) => text.lastIndexOf('\n', pos - 1) + 1
const lineEnd = (text: string, pos: number) => {
  const index = text.indexOf('\n', pos)
  return index === -1 ? text.length : index
}

/** Wraps the selection in a marker (`**`, `*`, `~~`, `` ` ``) or removes it when the selection is already wrapped. */
export function wrapInline(marker: string, placeholder: string): MarkdownCommand {
  return ({ text, from, to }) => {
    const selected = text.slice(from, to)
    const len = marker.length

    // A single `*` must not be mistaken for half of a `**` bold marker.
    const partOfBold = marker === '*' && (text[from - len - 1] === '*' || text[to + len] === '*')
    const startsBold = marker === '*' && (selected.startsWith('**') || selected.endsWith('**'))

    // Markers just outside the selection: toggle off.
    if (
      !partOfBold &&
      from - len >= 0 &&
      text.slice(from - len, from) === marker &&
      text.slice(to, to + len) === marker
    ) {
      return { from: from - len, to: to + len, insert: selected, selectFrom: from - len, selectTo: to - len }
    }
    // Markers inside the selection: toggle off.
    if (!startsBold && selected.length >= len * 2 && selected.startsWith(marker) && selected.endsWith(marker)) {
      const inner = selected.slice(len, selected.length - len)
      return { from, to, insert: inner, selectFrom: from, selectTo: from + inner.length }
    }

    const body = selected || placeholder
    return {
      from,
      to,
      insert: `${marker}${body}${marker}`,
      selectFrom: from + len,
      selectTo: from + len + body.length,
    }
  }
}

const LIST_OR_HEADING_PREFIX = /^(\s{0,3}#{1,6}\s+|\s*[-*+]\s+\[[ xX]\]\s+|\s*[-*+]\s+|\s*\d+[.)]\s+|\s*>\s?)/

/** Applies a prefix to every selected line, or removes it again when all non-empty lines already have it. */
function toggleLines(
  prefixFor: (index: number) => string,
  matches: (line: string) => boolean,
  replaceOthers: boolean,
): MarkdownCommand {
  return ({ text, from, to }) => {
    const start = lineStart(text, from)
    const end = lineEnd(text, to === from ? from : Math.max(from, to - (text[to - 1] === '\n' ? 1 : 0)))
    const lines = text.slice(start, end).split('\n')
    const content = lines.filter((line) => line.trim() !== '')
    const allMatch = content.length > 0 && content.every(matches)

    let counter = 0
    const result = lines.map((line) => {
      if (line.trim() === '' && lines.length > 1) return line
      const stripped = allMatch || replaceOthers ? line.replace(LIST_OR_HEADING_PREFIX, '') : line
      if (allMatch) return stripped
      const prefix = prefixFor(counter)
      counter += 1
      return `${prefix}${stripped}`
    })
    const insert = result.join('\n')
    return { from: start, to: end, insert, selectFrom: start, selectTo: start + insert.length }
  }
}

const heading = (level: number): MarkdownCommand => {
  const prefix = `${'#'.repeat(level)} `
  return toggleLines(
    () => prefix,
    (line) => line.startsWith(prefix),
    true,
  )
}

const linkOrImage =
  (imagePrefix: string, labelPlaceholder: string): MarkdownCommand =>
  ({ text, from, to }) => {
    const label = text.slice(from, to) || labelPlaceholder
    const url = 'https://'
    const insert = `${imagePrefix}[${label}](${url})`
    const urlStart = from + imagePrefix.length + label.length + 3
    return { from, to, insert, selectFrom: urlStart, selectTo: urlStart + url.length }
  }

const codeBlock: MarkdownCommand = ({ text, from, to }) => {
  const selected = text.slice(from, to)
  const needsLeadingBreak = from > 0 && text[from - 1] !== '\n'
  const needsTrailingBreak = to < text.length && text[to] !== '\n'
  const head = `${needsLeadingBreak ? '\n' : ''}\`\`\`\n`
  const body = selected || ''
  const tail = `\n\`\`\`${needsTrailingBreak ? '\n' : ''}`
  const insert = `${head}${body}${tail}`
  const caret = from + head.length
  return { from, to, insert, selectFrom: caret, selectTo: caret + body.length }
}

const TABLE_TEMPLATE = '| Column 1 | Column 2 | Column 3 |\n| --- | --- | --- |\n| Cell | Cell | Cell |\n'

const table: MarkdownCommand = ({ text, from, to }) => {
  const prefix = from > 0 && text[from - 1] !== '\n' ? '\n\n' : ''
  const insert = `${prefix}${TABLE_TEMPLATE}`
  const firstHeaderStart = from + prefix.length + 2
  return { from, to, insert, selectFrom: firstHeaderStart, selectTo: firstHeaderStart + 'Column 1'.length }
}

const rule: MarkdownCommand = ({ text, from, to }) => {
  const prefix = from > 0 && text[from - 1] !== '\n' ? '\n\n' : from > 0 && text[from - 2] !== '\n' ? '\n' : ''
  const insert = `${prefix}---\n`
  const caret = from + insert.length
  return { from, to, insert, selectFrom: caret, selectTo: caret }
}

export const MARKDOWN_COMMANDS: Record<MarkdownCommandId, MarkdownCommand> = {
  bold: wrapInline('**', 'bold text'),
  italic: wrapInline('*', 'italic text'),
  strike: wrapInline('~~', 'strikethrough'),
  code: wrapInline('`', 'code'),
  h1: heading(1),
  h2: heading(2),
  h3: heading(3),
  quote: toggleLines(
    () => '> ',
    (line) => /^\s*>/.test(line),
    false,
  ),
  bullet: toggleLines(
    () => '- ',
    (line) => /^\s*[-*+]\s+(?!\[[ xX]\])/.test(line),
    true,
  ),
  numbered: toggleLines(
    (index) => `${index + 1}. `,
    (line) => /^\s*\d+[.)]\s+/.test(line),
    true,
  ),
  task: toggleLines(
    () => '- [ ] ',
    (line) => /^\s*[-*+]\s+\[[ xX]\]\s+/.test(line),
    true,
  ),
  link: linkOrImage('', 'link text'),
  image: linkOrImage('!', 'alt text'),
  codeBlock,
  table,
  rule,
}
