import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { env } from '@utils/env';

/**
 * Automation Anywhere Control Room login page.
 *
 * The AA Community Edition SPA loads a large JS bundle that can take 30–45s
 * to render the login form. The login inputs use custom React/Rio components
 * with `name="username"` and `name="password"` attributes.
 *
 * VERIFIED against live Community Edition DOM (community.cloud.automationanywhere.digital).
 */
export class LoginPage extends BasePage {
  /** Label used for the login form header. */
  private readonly loginHeader: Locator;

  constructor(page: Page) {
    super(page);
    this.loginHeader = page.locator('.login-page__header, [class*="login"]').filter({ hasText: /Log\s*in/i }).first();
  }

  async open(): Promise<void> {
    await this.goto('/#/login');
    // The AA SPA can take a long time to render the login form.
    // Wait for the login form to appear (the form element with name="login").
    await this.page.waitForSelector('form[name="login"], .login-page', { timeout: 60_000 });
  }

  async login(username = env.username, password = env.password): Promise<void> {
    // Wait for the username input to appear. The AA SPA uses name="username"
    // on the actual input, but also has a hidden autocomplete input — so we
    // target the visible textinput component.
    const usernameInput = this.page.locator('input[name="username"]').last();
    const passwordInput = this.page.locator('input[name="password"]').last();
    const submitButton = this.page.getByRole('button', { name: /Log\s*in|Sign\s*in/i });

    await usernameInput.waitFor({ state: 'attached', timeout: 30_000 });

    // AA inputs have tabindex=-1 and use custom Rio focus handling.
    // Click first to activate the input, then fill.
    await usernameInput.click({ force: true });
    await usernameInput.fill(username);

    await passwordInput.click({ force: true });
    await passwordInput.fill(password);

    await submitButton.click();

    // Successful login leaves the login route; wait for that to be true.
    await expect(this.page).not.toHaveURL(/login/i, { timeout: 60_000 });
  }

  async expectLoginError(): Promise<void> {
    const errorBanner = this.page.locator('.error, [role="alert"], [data-has-error="true"]');
    await this.expectVisible(errorBanner);
  }
}
