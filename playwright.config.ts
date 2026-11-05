import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/browser', fullyParallel: true, workers: 2,
  forbidOnly: !!process.env.CI, retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:5195', trace: 'retain-on-failure', reducedMotion: 'reduce', locale: 'de-DE' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    { command: 'npm run dev -- --host 127.0.0.1 --port 5195 --strictPort', url: 'http://127.0.0.1:5195', reuseExistingServer: !process.env.CI,
      env: { VITE_ANALYTICS_SOURCE: 'mock' }, timeout: 30000 },
    { command: 'npm run dev -- --host 127.0.0.1 --port 5196 --strictPort', url: 'http://127.0.0.1:5196', reuseExistingServer: !process.env.CI,
      env: { VITE_ANALYTICS_SOURCE: 'api', VITE_API_URL: '/api' }, timeout: 30000 },
  ],
})
