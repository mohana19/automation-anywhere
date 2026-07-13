import { chromium } from '@playwright/test';
import 'dotenv/config';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

// Login
await page.goto(process.env.CR_URL + '/#/login');
await page.waitForSelector('form[name="login"], .login-page', { timeout: 60000 });
const uInput = page.locator('input[name="username"]').last();
const pInput = page.locator('input[name="password"]').last();
await uInput.waitFor({ state: 'attached', timeout: 30000 });
await uInput.click({ force: true });
await uInput.fill(process.env.AA_USERNAME);
await pInput.click({ force: true });
await pInput.fill(process.env.AA_PASSWORD);
await page.getByRole('button', { name: /Log\s*in|Sign\s*in/i }).click();
await page.waitForURL(/(?!.*login).*/, { timeout: 60000 });
console.log('Logged in!');

// Navigate to Automation
await page.getByRole('link', { name: /^Automation$/ }).click();
await page.waitForLoadState('domcontentloaded');
await page.waitForTimeout(3000);

// Click Create → Form...
const createBtn = page.locator('h1').getByRole('button', { name: /Create/ });
await createBtn.click();
await page.waitForTimeout(1000);
await page.getByRole('button', { name: /Form/ }).click();
await page.waitForTimeout(5000);

// Find the dialog element and dump its HTML
const dialog = page.locator('[role="dialog"]').first();
const dialogHTML = await dialog.innerHTML().catch(() => 'no dialog innerHTML');
console.log('Dialog HTML (first 3000):', dialogHTML.substring(0, 3000));

// Find all buttons inside the dialog
const dialogButtons = await dialog.locator('button').all();
console.log('Buttons inside dialog:');
for (const btn of dialogButtons) {
  const text = await btn.textContent();
  const name = await btn.getAttribute('name');
  console.log('  Button:', JSON.stringify({ text: text?.trim(), name }));
}

// Also find all buttons on the entire page that say "Create"
const createButtons = await page.getByRole('button', { name: /Create/i }).all();
console.log('All Create buttons:', createButtons.length);
for (let i = 0; i < createButtons.length; i++) {
  const btn = createButtons[i];
  const text = await btn.textContent();
  const isVisible = await btn.isVisible();
  console.log(`  Create button[${i}]:`, JSON.stringify({ text: text?.trim(), visible: isVisible }));
}

await browser.close();
