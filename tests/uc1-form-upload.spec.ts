import { test, expect } from '@playwright/test';
import * as path from 'node:path';
import { LoginPage } from '@pages/LoginPage';
import { AutomationPage } from '@pages/AutomationPage';
import { FormBuilderPage } from '@pages/FormBuilderPage';
import { env } from '@utils/env';

/**
 * Use Case 1 — Form with Upload Flow (UI Automation).
 *
 * Mirrors the assignment steps 1–8 and asserts:
 *   • UI element visibility and functionality
 *   • File upload status and confirmation
 *   • Form submission behaviour (save confirmation)
 */
test.describe('UC1 · Form with Upload Flow (UI)', () => {
  const runId = Date.now().toString().slice(-6);
  const FORM_NAME = `AutomatedForm_UC1_${runId}`;
  const SAMPLE_TEXT = 'Hello from Playwright automation';
  const uploadPath = path.resolve(process.cwd(), env.uploadFilePath);
  const uploadFileName = path.basename(uploadPath);

  let login: LoginPage;
  let automation: AutomationPage;
  let formBuilder: FormBuilderPage;

  test.beforeEach(async ({ page }) => {
    login = new LoginPage(page);
    automation = new AutomationPage(page);
    formBuilder = new FormBuilderPage(page);
  });

  test('logs in, builds a form with Textbox + File Upload, uploads a doc, and saves', async () => {
    // Step 1 — log in.
    await login.open();
    await login.login();

    // Steps 2–4 — Automation → Create → Form → fill mandatory details → Create.
    await automation.navigateToAutomation();
    await automation.openCreateForm();
    await automation.fillFormDetailsAndCreate(FORM_NAME);

    // Step 5 — drag Textbox and Select File onto the canvas.
    await formBuilder.addTextboxAndSelectFile();

    // Assert: both controls are visible/functional on the canvas.
    await formBuilder.expectControlsVisible();

    // Step 6 — click each element and verify the right-hand properties panel.
    await formBuilder.selectControlAndVerifyPanel('textbox');
    await formBuilder.selectControlAndVerifyPanel('file');

    // Step 7 — enter text and upload a document.
    await formBuilder.enterText(SAMPLE_TEXT);
    await formBuilder.uploadDocument(uploadPath);

    // Assert: file upload status / confirmation.
    await formBuilder.expectUploadConfirmed(uploadFileName);

    // Step 8 — save and verify submission behaviour.
    await formBuilder.save();
    await formBuilder.expectSaved();
  });
});
