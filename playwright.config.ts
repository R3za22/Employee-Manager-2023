import { defineConfig, devices } from '@playwright/test'

const PORT = 5188
const baseURL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: 'e2e',
  retries: 0,
  workers: 1,
  use: { baseURL, headless: true },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `node node_modules/vite/bin/vite.js --port ${PORT} --strictPort`,
    url: baseURL,
    reuseExistingServer: true,
  },
})
