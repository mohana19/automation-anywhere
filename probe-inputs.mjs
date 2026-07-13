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
await page.waitForTimeout(3000);

const dialog = page.locator('[data-modal-id="repository-action-file-create"]');
console.log('dialog visible:', await dialog.isVisible());

const inputs = await page.locator('input').all();
console.log('Visible inputs:');
for (const inp of inputs) {
  if (!(await inp.isVisible())) continue;
  console.log(
    JSON.stringify({
      name: await inp.getAttribute('name'),
      type: await inp.getAttribute('type'),
      placeholder: await inp.getAttribute('placeholder'),
      id: await inp.getAttribute('id'),
    }),
  );
}

const nameByRole = page.getByRole('textbox', { name: /^Name$/ });
console.log('nameByRole visible:', await nameByRole.isVisible());

const nameInput = page.locator('input[name="name"]');
console.log('input[name=name] count:', await nameInput.count(), 'visible:', await nameInput.isVisible().catch(() => false));

await browser.close();
