import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * The "Automation" area of the Control Room (left-hand menu).
 * Handles: navigate to Automation → open the Create dropdown → choose Form →
 * fill the mandatory "create form" dialog → submit.
 *
 * Selectors verified against live Community Edition DOM.
 */
export class AutomationPage extends BasePage {
  private readonly automationMenuItem: Locator;
  private readonly createDropdown: Locator;
  private readonly createFormOption: Locator;

  constructor(page: Page) {
    super(page);
    // VERIFIED: left-nav link labelled "Automation".
    this.automationMenuItem = page.getByRole('link', { name: /^Automation$/ });
    // VERIFIED: the "+ Create" split button in the top-right header area.
    // Scope to the heading region to avoid the "Create" button in the file-list toolbar.
    this.createDropdown = page.locator('h1').getByRole('button', { name: /Create/ });
    // VERIFIED: dropdown items are buttons, text is "Form…" (with ellipsis).
    this.createFormOption = page.getByRole('button', { name: /Form…/ });
  }

  async navigateToAutomation(): Promise<void> {
    await this.automationMenuItem.click();
    await this.waitForAppReady();
  }

  async openCreateForm(): Promise<void> {
    await this.createDropdown.click();
    await this.createFormOption.waitFor({ state: 'visible', timeout: 10_000 });
    await this.createFormOption.click();
  }

  /**
   * Fill the mandatory fields in the create-form dialog and submit.
   *
   * VERIFIED: after clicking "Form…" a modal appears (`data-modal-id=
   * repository-action-file-create`) with:
   *   - textbox "Name" / input[name="name"] — mandatory
   *   - textbox "Description (optional)" — optional
   *   - button "Create & edit" (name="submit") — opens the form builder
   */
  async fillFormDetailsAndCreate(formName: string): Promise<void> {
    const dialog = this.page.locator('[data-modal-id="repository-action-file-create"]');
    await dialog.waitFor({ state: 'visible', timeout: 15_000 });

    const nameInput = dialog.getByRole('textbox', { name: /^Name$/ });
    await nameInput.click({ force: true });
    await nameInput.fill(formName);

    await dialog.getByRole('button', { name: /Create\s*&\s*edit/i }).click();

    // Wait for the form builder to open (URL changes to the form editor).
    await expect(this.page).toHaveURL(/form\/edit/i, { timeout: 30_000 });
  }
}
