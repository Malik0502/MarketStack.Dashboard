import { expect, test } from '@playwright/test'
import { writeFile } from 'node:fs/promises'

test('page navigation snapshots preserve content proportions between short and long routes', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  // Warm data first: otherwise a cold route may only snapshot its small loading state.
  await page.goto('/products')
  await expect(page.getByRole('heading', { name: 'ABC-Verteilung', exact: true })).toBeVisible()
  await page.locator('.header-user-link').click()
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Benutzer')
  await page.waitForFunction(() => !document.documentElement.matches(':active-view-transition'))
  await page.evaluate(() => {
    const samples: Record<string, unknown>[] = []
    Object.assign(window, { layoutSamples: samples })
    const original = document.startViewTransition.bind(document)
    document.startViewTransition = ((options: Parameters<typeof original>[0]) => {
      const transition = original(options)
      void transition.ready.then(() => {
        let frames = 0
        const sample = () => {
          const group = getComputedStyle(document.documentElement, '::view-transition-group(page-content)')
          const image = getComputedStyle(document.documentElement, '::view-transition-new(page-content)')
          const oldImage = getComputedStyle(document.documentElement, '::view-transition-old(page-content)')
          const content = document.querySelector('.route-view')!
          samples.push({ frame: frames, contentHeight: content.getBoundingClientRect().height,
            groupHeight: group.height, imageHeight: image.height, oldImageHeight: oldImage.height, fit: image.objectFit,
            animations: document.getAnimations().map(animation => ({
              pseudo: (animation.effect as KeyframeEffect | null)?.pseudoElement,
              keyframes: (animation.effect as KeyframeEffect | null)?.getKeyframes(),
            })),
          })
          if (++frames < 8) requestAnimationFrame(sample)
        }
        sample()
      }, () => {})
      return transition
    }) as typeof document.startViewTransition
  })
  await page.locator('.sidebar-link[href="/products"]').click()
  await expect(page.locator('.analytics-layout')).not.toHaveAttribute('data-loading', 'true')
  await expect.poll(() => page.evaluate(() => (window as typeof window & { layoutSamples: unknown[] }).layoutSamples.length)).toBeGreaterThanOrEqual(8)
  const samples = await page.evaluate(() => (window as typeof window & { layoutSamples: Record<string, unknown>[] }).layoutSamples)
  const file = testInfo.outputPath('layout-samples.json')
  await writeFile(file, JSON.stringify(samples, null, 2))
  await testInfo.attach('layout-samples', { path: file, contentType: 'application/json' })
  const resizing = samples.some(sample => (sample.animations as { pseudo?: string; keyframes?: Record<string, unknown>[] }[]).some(animation =>
    animation.pseudo === '::view-transition-group(page-content)' && animation.keyframes?.some(frame => 'height' in frame)))
  expect(resizing, 'page transition must not interpolate the heights of different-length routes').toBe(false)
  expect(samples.every(sample => sample.fit === 'contain')).toBe(true)
})

for (const width of [320, 768, 1440]) test(`cold-load layout has its final width from the first visible frame at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 })
  await page.addInitScript(() => {
    const frames: { main: number; page: number; header: number }[] = []
    Object.assign(window, { startupFrames: frames })
    let running = true
    const sample = () => {
      const main = document.querySelector('.app-main'), content = document.querySelector('.dashboard-page'), header = document.querySelector('.app-header')
      if (main && content && header && content.getBoundingClientRect().width > 0) {
        frames.push({ main: main.getBoundingClientRect().width, page: content.getBoundingClientRect().width, header: header.getBoundingClientRect().width })
        if (frames.length >= 20) running = false
      }
      if (running) requestAnimationFrame(sample)
    }
    requestAnimationFrame(sample)
  })
  await page.goto('/products')
  await expect(page.getByRole('heading', { name: 'ABC-Verteilung', exact: true })).toBeVisible()
  await expect.poll(() => page.evaluate(() => (window as typeof window & { startupFrames: unknown[] }).startupFrames.length)).toBeGreaterThanOrEqual(20)
  const frames = await page.evaluate(() => (window as typeof window & { startupFrames: { main: number; page: number; header: number }[] }).startupFrames)
  const expectedWidth = width < 768 ? width : width < 1200 ? width - 76 : width - 228
  expect(frames.every(frame => Math.abs(frame.main - expectedWidth) <= 1 && Math.abs(frame.page - expectedWidth) <= 1 && Math.abs(frame.header - expectedWidth) <= 1)).toBe(true)
})
