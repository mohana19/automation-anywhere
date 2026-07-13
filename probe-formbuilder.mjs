import { chromium } from '@playwright/test';
import 'dotenv/config';
import * as path from 'node:path';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

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

const frame = page.frameLocator('iframe').first();
const canvas = frame.locator('.formbuilder-formcanvas').first();
await frame.getByRole('button', { name: /Text\s*Box/i }).dragTo(canvas);
await page.waitForTimeout(1000);
await frame.getByRole('button', { name: /Select\s*File/i }).dragTo(canvas);
await page.waitForTimeout(2000);

const uploadPath = path.resolve('fixtures/sample-upload.txt');
const fileName = path.basename(uploadPath);

// Upload via browse link + file chooser
const browse = canvas.locator('.preview-label__browseText');
console.log('browse visible:', await browse.isVisible());

const [fileChooser] = await Promise.all([
  page.waitForEvent('filechooser', { timeout: 10_000 }).catch(() => null),
  browse.click(),
]);
if (fileChooser) {
  await fileChooser.setFiles(uploadPath);
  console.log('file chooser used');
} else {
  console.log('no file chooser, trying hidden input');
  const hidden = frame.locator('input[type="file"]');
  console.log('hidden count', await hidden.count());
  if (await hidden.count()) await hidden.first().setInputFiles(uploadPath);
}

await page.waitForTimeout(2000);
const canvasText = await canvas.innerHTML();
console.log('uploaded in html:', canvasText.includes(fileName) || /sample-upload/i.test(canvasText));

// Save from design mode
await frame.getByRole('button', { name: /^Save$/i }).click();
await page.waitForTimeout(3000);
const toast = frame.locator('[role="alert"], [role="status"], [class*="toast"], [class*="notification"], [class*="snackbar"]');
console.log('toast count:', await toast.count());
for (const t of await toast.all()) {
  console.log('toast:', (await t.textContent())?.trim());
}

await browser.close();
