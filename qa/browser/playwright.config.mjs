import { defineConfig } from '@playwright/test';
import path from 'node:path';
if (!process.env.QA_APP_ROOT) throw new Error('QA_APP_ROOT must identify the immutable candidate checkout');
if (!['baseline', 'preview', 'catalog', 'storage'].includes(process.env.QA_CANDIDATE)) throw new Error('Unknown QA_CANDIDATE');
export default defineConfig({
  testDir: '.', testMatch: '*.spec.mjs', fullyParallel: false, workers: 1,
  retries: 0, timeout: 90_000, expect: { timeout: 10_000 },
  outputDir: 'test-results',
  reporter: [['list'], ['html', { open: 'never' }], ['json', { outputFile: 'test-results/results.json' }]],
  metadata: { candidate: process.env.QA_CANDIDATE, sourceSha: process.env.QA_SOURCE_SHA ?? 'local-unverified' },
  use: { baseURL: 'http://127.0.0.1:4173/kanshu-arena/', browserName: 'chromium',
    screenshot: 'only-on-failure', trace: 'retain-on-failure', video: 'off',
    launchOptions: process.env.QA_CHROMIUM_PATH ? { executablePath: process.env.QA_CHROMIUM_PATH } : {},
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 1000 } } },
    { name: 'phone', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
  webServer: {
    command: process.env.QA_CANDIDATE === 'storage'
      ? 'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4173 --strictPort'
      : 'node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4173 --strictPort',
    cwd: path.resolve(process.env.QA_APP_ROOT),
    url: 'http://127.0.0.1:4173/kanshu-arena/',
    reuseExistingServer: false, timeout: 60_000,
  },
});
