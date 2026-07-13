import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';

// Load environment variables from .env (see .env.example).
dotenv.config();

/**
 * Two projects:
 *  - "ui"  → Use Case 1: browser-driven form-with-upload flow (Chromium, POM).
 *  - "api" → Use Case 2: headless API automation (no browser needed).
 *
 * Run all:   npm test
 * Run UI:    npm run test:ui
 * Run API:   npm run test:api
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: false, // Community Edition is a shared single tenant; keep runs serial to avoid state collisions.
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 180_000, // 3 minutes — AA SPA can take 30–45s just to render the login form.
  expect: { timeout: 30_000 },
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
  ],
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 30_000,
  },
  projects: [
    {
      name: 'ui',
      testMatch: /uc1-.*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        // Control Room URL assigned to your account after registration (see .env).
        baseURL: process.env.CR_URL,
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: 'api',
      testMatch: /uc2-.*\.spec\.ts/,
      use: {
        // API base URL — usually the same Control Room host as the UI.
        baseURL: process.env.CR_URL,
      },
    },
  ],
});

