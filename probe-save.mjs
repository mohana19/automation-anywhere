import { chromium } from '@playwright/test';
import 'dotenv/config';

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
await page.waitForTimeout(500);
await frame.getByRole('button', { name: /Select\s*File/i }).dragTo(canvas);
await page.waitForTimeout(1000);

const saveBtn = frame.getByRole('button', { name: /^Save$/i });
console.log('save enabled before:', await saveBtn.isEnabled());
await saveBtn.click();
await page.waitForTimeout(5000);

const formFrame = page.frames().find((f) => f.url().includes('/modules/attended/'));
const html = await formFrame.content();
const keywords = ['saved', 'success', 'Saved', 'Success', 'complete', 'updated'];
for (const k of keywords) {
  if (html.includes(k)) console.log('html contains:', k);
}

const allVisible = await formFrame.evaluate(() =>
  [...document.querySelectorAll('*')]
    .filter((el) => {
      const style = getComputedStyle(el);
      return style.display !== 'none' && el.children.length === 0 && el.textContent?.trim();
    })
    .map((el) => el.textContent.trim())
    .filter((t) => /save|success|complete|error/i.test(t))
    .slice(0, 20),
);
console.log('visible text matches:', allVisible);

await browser.close();
