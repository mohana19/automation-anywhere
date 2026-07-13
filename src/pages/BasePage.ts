import { Page, Locator, expect } from '@playwright/test';

/**
 * Shared behaviour for every page object.
 * Concrete pages extend this and expose intention-revealing methods/locators.
 */
export abstract class BasePage {
  constructor(protected readonly page: Page) {}

  /** Navigate to a path relative to the configured Control Room baseURL. */
  async goto(path = '/'): Promise<void> {
    await this.page.goto(path, { waitUntil: 'domcontentloaded' });
  }

  /** Wait for the SPA to settle (network idle is unreliable on AA's long-poll app). */
  async waitForAppReady(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded');
  }

  /** Assert an element is visible — thin wrapper so specs read declaratively. */
  async expectVisible(locator: Locator, message?: string): Promise<void> {
    await expect(locator, message).toBeVisible();
  }

  /**
   * The AA canvas uses HTML5 drag-and-drop. Playwright's dragTo works for most
   * palette→canvas interactions; if the app uses a custom DnD library that
   * ignores synthetic events, fall back to manual mouse steps (see dragToCanvas).
   */
  protected async dragToCanvas(source: Locator, target: Locator): Promise<void> {
    try {
      await source.dragTo(target);
    } catch {
      // Manual fallback: press → move in steps → release.
      const src = await source.boundingBox();
      const dst = await target.boundingBox();
      if (!src || !dst) throw new Error('Cannot resolve drag source/target bounding boxes.');
      await this.page.mouse.move(src.x + src.width / 2, src.y + src.height / 2);
      await this.page.mouse.down();
      await this.page.mouse.move(dst.x + dst.width / 2, dst.y + dst.height / 2, { steps: 10 });
      await this.page.mouse.up();
    }
  }
}
