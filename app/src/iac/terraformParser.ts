/** Release 14 stage A — a purpose-built Terraform resource-block extractor,
 *  deliberately not a full HCL2 grammar/expression evaluator. Considered
 *  `@evops/hcl-terraform-parser` (the main npm option) first and rejected
 *  it: last published 2020, no TypeScript types, a 6-star/2-open-issue
 *  repo — too much risk of silent misbehavior on modern Terraform syntax
 *  for a dependency this load-bearing. This scanner instead handles the
 *  one thing that actually matters for "generate a starter diagram from a
 *  .tf file": correctly finding `resource "type" "name" { ... }` block
 *  boundaries (string/heredoc-aware brace counting, so a `{`/`}` inside a
 *  quoted string or a heredoc body like `user_data = <<-EOF ... EOF`
 *  doesn't corrupt the scan — both are extremely common in real files and
 *  naive regex/line-based brace counting breaks on them), plus shallow
 *  top-level attribute/`depends_on` extraction and cross-resource
 *  reference detection. It does not evaluate expressions, functions,
 *  `for_each`/`count`, or resolve `module` calls or `variable`
 *  interpolation — those are left as opaque raw text, not guessed at. */

export interface TerraformResource {
  type: string
  name: string
  /** `${type}.${name}` — how Terraform itself addresses a resource, and
   *  what shows up in another resource's attribute value/depends_on when
   *  it references this one. */
  address: string
  /** Shallow, top-level `key = value` pairs only — nested blocks (e.g. a
   *  `vpc_config { ... }` sub-block) are not descended into; their raw
   *  text is skipped for attribute extraction but still scanned for
   *  cross-resource references (see `references` below). Values are raw
   *  trimmed text, not evaluated. */
  attributes: Record<string, string>
  /** Explicit `depends_on = [...]` entries, addresses as given (quotes
   *  stripped). */
  dependsOn: string[]
  /** Every other declared resource's address found anywhere in this
   *  resource's body text (attributes and nested blocks both) — the
   *  common "implicit dependency via attribute reference" pattern
   *  Terraform itself relies on, detected here without evaluating the
   *  expression it appears in. */
  references: string[]
}

/** Character classes the scanner below tracks — only `Normal` positions
 *  count toward depth or get treated as comments; `String` positions are
 *  copied through as-is and never contribute to depth, so a stray
 *  `{`/`}`/`[`/`]`/`#` inside a string literal can't desynchronize the
 *  block-boundary scan. Heredocs aren't a scan state at all — see below,
 *  they're consumed as a single opaque placeholder instead. */
type ScanState = 'normal' | 'string'

interface ScanResult {
  /** Comment-stripped, heredoc-collapsed text — `//`/`#` line comments and
   *  `/* *\/` block comments are removed, and every heredoc
   *  (`<<EOF ... EOF` / `<<-EOF ... EOF`) is replaced with a single
   *  `__HEREDOC__` placeholder token. Not the same length or column
   *  alignment as the input — nothing downstream needs exact source
   *  positions, only correct brace/bracket nesting and statement
   *  boundaries. Heredoc *content* is opaque past this point: any
   *  cross-resource reference written inside one (e.g. an interpolated
   *  ARN in a JSON policy heredoc) won't be detected — an accepted v1
   *  scope limit, not a bug, since resolving that would mean parsing
   *  arbitrary embedded content, not just HCL structure. */
  text: string
  /** Cumulative depth *after* including each character of `text` —
   *  increments on `{`/`[`, decrements on `}`/`]`, both merged into one
   *  counter since HCL always nests them properly (never crossing), which
   *  is all `findMatchingBrace`/`topLevelStatements` below actually need.
   *  Only changes while in the `normal` state. Same length as `text`. */
  depth: number[]
}

/** Single linear pass doing all three jobs at once (comment stripping,
 *  heredoc collapsing, depth tracking) so the fiddly, bug-prone detection
 *  logic exists exactly once. */
function scan(source: string): ScanResult {
  const out: string[] = []
  const depth: number[] = []
  let state: ScanState = 'normal'
  let currentDepth = 0
  let i = 0

  const push = (s: string) => {
    for (const c of s) {
      out.push(c)
      depth.push(currentDepth)
    }
  }

  while (i < source.length) {
    const ch = source[i]

    if (state === 'string') {
      push(ch)
      if (ch === '\\' && i + 1 < source.length) {
        push(source[i + 1])
        i += 2
        continue
      }
      if (ch === '"') state = 'normal'
      i++
      continue
    }

    // state === 'normal'
    if (ch === '"') {
      state = 'string'
      push(ch)
      i++
      continue
    }
    if (ch === '#' || (ch === '/' && source[i + 1] === '/')) {
      const lineEnd = source.indexOf('\n', i)
      i = lineEnd === -1 ? source.length : lineEnd
      continue
    }
    if (ch === '/' && source[i + 1] === '*') {
      const end = source.indexOf('*/', i + 2)
      i = end === -1 ? source.length : end + 2
      continue
    }
    const heredocMatch = /^<<-?(\w+)/.exec(source.slice(i))
    if (heredocMatch) {
      const terminator = heredocMatch[1]
      const searchFrom = i + heredocMatch[0].length
      // The terminator must start a line (optionally indented, for the
      // `<<-` form) — anchor on the preceding newline rather than doing a
      // bare substring search, so a terminator-shaped word appearing
      // mid-line inside the heredoc body doesn't end it early.
      const terminatorRe = new RegExp(`\\n[ \\t]*${terminator}\\b`)
      const found = terminatorRe.exec(source.slice(searchFrom))
      i = found ? searchFrom + found.index + found[0].length : source.length
      push('__HEREDOC__')
      continue
    }
    if (ch === '{' || ch === '[') currentDepth++
    if (ch === '}' || ch === ']') currentDepth--
    push(ch)
    i++
  }

  return { text: out.join(''), depth }
}

/** Given `text`/`depth` from `scan()` and the index of an opening `{`,
 *  returns the index of its matching `}` — the first later position whose
 *  depth has returned to one less than the opening brace's own depth. */
function findMatchingBrace(depth: number[], openIndex: number): number {
  const target = depth[openIndex] - 1
  for (let j = openIndex + 1; j < depth.length; j++) {
    if (depth[j] === target) return j
  }
  return -1
}

/** Splits a resource body into top-level `key = value` statements — a
 *  nested block (`identifier {` through its own matching `}`) is captured
 *  as a single opaque statement rather than descended into, so it never
 *  produces a spurious top-level attribute. */
function topLevelStatements(body: string): { key: string; value: string }[] {
  const { depth } = scan(body)
  const statements: { key: string; value: string }[] = []
  let start = 0
  for (let i = 0; i < body.length; i++) {
    const atTopLevel = depth[i] === 0
    if (body[i] === '\n' && atTopLevel) {
      const stmt = body.slice(start, i).trim()
      start = i + 1
      const match = /^([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*([\s\S]+)$/.exec(stmt)
      if (match) statements.push({ key: match[1], value: match[2].trim() })
    }
  }
  return statements
}

function parseDependsOn(rawValue: string): string[] {
  const inner = rawValue.replace(/^\[/, '').replace(/\]$/, '')
  return inner
    .split(',')
    .map((s) => s.trim().replace(/^"|"$/g, ''))
    .filter(Boolean)
}

/** Parses every top-level `resource "type" "name" { ... }` block out of a
 *  single Terraform source file. `data`/`variable`/`provider`/`module`/
 *  `output`/`locals` blocks are ignored — only declared resources map to
 *  diagram elements. */
export function parseTerraformResources(source: string): TerraformResource[] {
  const { text, depth } = scan(source)
  const parsed: { resource: TerraformResource; body: string }[] = []
  const resourceRegex = /resource\s+"([^"]+)"\s+"([^"]+)"\s*\{/g
  let match: RegExpExecArray | null
  while ((match = resourceRegex.exec(text))) {
    const openIndex = match.index + match[0].length - 1
    const closeIndex = findMatchingBrace(depth, openIndex)
    if (closeIndex === -1) continue
    const body = text.slice(openIndex + 1, closeIndex)
    parsed.push({
      resource: {
        type: match[1],
        name: match[2],
        address: `${match[1]}.${match[2]}`,
        attributes: {},
        dependsOn: [],
        references: [],
      },
      body,
    })
  }

  const addresses = parsed.map((p) => p.resource.address)

  for (const { resource, body } of parsed) {
    for (const { key, value } of topLevelStatements(body)) {
      if (key === 'depends_on') {
        resource.dependsOn.push(...parseDependsOn(value))
      } else {
        resource.attributes[key] = value
      }
    }

    for (const address of addresses) {
      if (address === resource.address) continue
      // Word-boundary-ish check — an address is `type.name`; require it
      // not be immediately preceded/followed by an identifier character,
      // so e.g. `aws_instance.web` doesn't spuriously match inside
      // `aws_instance.web_server`.
      const escaped = address.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const re = new RegExp(`(^|[^\\w.])${escaped}([^\\w]|$)`)
      if (re.test(body)) resource.references.push(address)
    }
  }

  return parsed.map((p) => p.resource)
}
