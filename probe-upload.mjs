import { chromium } from '@playwright/test';
import 'dotenv/config';
import * as path from 'node:path';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

async function loginAndOpen() {
  await page.goto(process.env.CR_URL + '/#/login');
  await page.waitForSelector('form[name="login"]', { timeout: 60_000 });
  const username = page.locator('input[name="username"]').last();
  const password = page.locator('input[name="password"]').last();
  await username.click({ force: true });
  await username.fill(process.env.AA_USERNAME);
  await password.click({ force: true });
  await password.fill(process.env.AA_PASSWORD);
  await page.getByRole('button', { name: /Log\s*in/i }).click();
  await page.waitForURL(/(?!.*login).*/, { timeout: 60_000 });
  await page.getByRole('link', { name: /^Automation$/ }).click();
  await page.waitForTimeout(3000);
  await page.locator('h1').getByRole('button', { name: /Create/ }).click();
  await page.getByRole('button', { name: /Form/ }).click();
  const dialog = page.locator('[data-modal-id="repository-action-file-create"]');
  await dialog.waitFor({ state: 'visible', timeout: 15_000 });
  await dialog.getByRole('textbox', { name: /^Name$/ }).fill(`ProbeForm_${Date.now()}`);
  await dialog.getByRole('button', { name: /Create\s*&\s*edit/i }).click();
  await page.waitForURL(/form\/edit/i, { timeout: 30_000 });
  await page.waitForTimeout(5000);
}

await loginAndOpen();
const formFrame = page.frames().find((f) => f.url().includes('/modules/attended/'));
const frame = page.frameLocator('iframe').first();
const canvas = frame.locator('.formbuilder-formcanvas').first();
await frame.getByRole('button', { name: /Select\s*File/i }).dragTo(canvas);
await page.waitForTimeout(2000);

const uploadPath = path.resolve('fixtures/sample-upload.txt');
const fileName = path.basename(uploadPath);

// Strategy 1: mutation observer after browse click
const foundInput = await formFrame.evaluate(() => new Promise((resolve) => {
  const find = () => {
    const walk = (root) => {
      for (const el of root.querySelectorAll?.('input[type="file"]') ?? []) return el;
      for (const el of root.querySelectorAll?.('*') ?? []) {
        if (el.shadowRoot) {
          const hit = walk(el.shadowRoot);
          if (hit) return hit;
        }
      }
      return null;
    };
    return walk(document);
  };
  const observer = new MutationObserver(() => {
    if (find()) { observer.disconnect(); resolve(true); }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  document.querySelector('.formcanvas-col .preview-label__browseText')?.click();
  setTimeout(() => { observer.disconnect(); resolve(!!find()); }, 4000);
}));
console.log('mutation observer found file input:', foundInput);

// Strategy 2: preview + filechooser on frame locator scoped browse
await frame.getByRole('button', { name: /^Preview$/i }).click();
await page.waitForTimeout(3000);
let previewUpload = false;
try {
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser', { timeout: 5000 }),
    canvas.locator('.preview-fileupload .preview-label__browseText').first().click({ force: true }),
  ]);
  await chooser.setFiles(uploadPath);
  previewUpload = true;
  console.log('preview filechooser: OK');
} catch (e) {
  console.log('preview filechooser failed');
}

await page.waitForTimeout(2000);
const text = await formFrame.evaluate(() => document.body.innerText);
console.log('has filename after preview upload:', text.includes(fileName));

// Strategy 3: save without closing preview
if (!previewUpload) {
  await frame.getByRole('button', { name: /^Preview$/i }).click().catch(() => {});
  await page.waitForTimeout(1000);
}

try {
  await frame.getByRole('button', { name: /^Save$/i }).click({ timeout: 5000 });
  await page.waitForTimeout(3000);
  const toasts = await frame.locator('[role="alert"], [role="status"], [class*="toast"], [class*="notification"]').allTextContents();
  console.log('save toasts:', toasts.filter(Boolean).map((t) => t.trim()).slice(0, 5));
} catch (e) {
  console.log('save failed:', e.message?.slice(0, 80));
}

await browser.close();
