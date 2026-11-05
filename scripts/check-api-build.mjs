import { spawnSync } from 'node:child_process'
import { mkdtemp, mkdir, readFile, readdir, rm } from 'node:fs/promises'
import path from 'node:path'

const temporaryRoot = process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'Temp', 'opencode') : path.resolve('node_modules/.audit-builds')
await mkdir(temporaryRoot, { recursive: true })
const output = await mkdtemp(path.join(temporaryRoot, 'marketstack-api-check-'))
try {
  const result = spawnSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build', '--outDir', output], {
    env: { ...process.env, VITE_ANALYTICS_SOURCE: 'api', VITE_API_URL: '/api' }, encoding: 'utf8',
  })
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || 'API build failed')
  const files = (await readdir(path.join(output, 'assets'))).filter(file => file.endsWith('.js'))
  for (const file of files) {
    const source = await readFile(path.join(output, 'assets', file), 'utf8')
    if (source.includes('MOCK-PACK-') || source.includes('MOCK-PROMO-')) throw new Error(`Mock fixtures leaked into API output: ${file}`)
  }
  console.log(`API build passed: ${files.length} JavaScript assets contain no mock product/receipt generator`)
} finally {
  // Only remove this script's own newly-created temporary output, never a shared directory.
  await rm(output, { recursive: true, force: true })
}
