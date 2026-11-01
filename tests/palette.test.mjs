import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const css = await readFile(new URL('../src/index.css', import.meta.url), 'utf8')

function luminance(hex) {
  const rgb = hex.match(/[a-f\d]{2}/gi).map(value => {
    const channel = parseInt(value, 16) / 255
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  })
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722
}

for (const selector of [':root', '.dark']) {
  test(`${selector} palette keeps text and chart accents clearly distinguishable`, () => {
    const block = css.slice(css.indexOf(`${selector} {`)).split('}')[0]
    const tokens = Object.fromEntries([...block.matchAll(/--([\w-]+):\s*(#[a-f\d]{6});/gi)].map(match => [match[1], match[2]]))
    const contrast = (first, second) => {
      const a = luminance(tokens[first]), b = luminance(tokens[second])
      return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
    }
    for (const surface of ['background', 'card']) {
      assert.ok(contrast('foreground', surface) >= 7, `Main text on ${surface}`)
      assert.ok(contrast('muted-foreground', surface) >= 4.5, `Secondary text on ${surface}`)
    }
    assert.ok(contrast('chart-expense', 'card') >= 3, 'Expense series')
    assert.ok(contrast('chart-tax', 'card') >= 3, 'Tax series')
    assert.ok(contrast('primary', 'card') >= 4.5, 'Action text')
    assert.ok(contrast('primary-foreground', 'primary') >= 4.5, 'Primary button text')
    assert.ok(contrast('sidebar-muted', 'sidebar') >= 4.5, 'Sidebar text')
  })
}
