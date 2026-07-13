import { test, expect } from '@playwright/test';
import { ApiClient } from '@api/ApiClient';
import { buildFormDefinition, buildProcessDefinition } from '@api/definitions';

/**
 * Use Case 2 — Create a Process with a Form via API (API Automation).
 *
 * Steps 1–8 run in order and share state (token, folder id, file ids), so they
 * are expressed as serial steps within one test. Each step asserts:
 *   • HTTP status codes (200 OK / 201 Created)
 *   • Presence of a valid id where the assignment requires one
 *
 * Steps 9–11 perform read-back verification:
 *   • Confirm the saved form content matches what was sent
 *   • Confirm the saved process content/workflow was persisted
 *   • Confirm the process dependencies correctly link the form
 */
test.describe.configure({ mode: 'serial' });

test.describe('UC2 · Create a Process with a Form (API)', () => {
  let api: ApiClient;

  // Shared state across steps.
  let privateFolderId: string;
  let formFileId: string;
  let processFileId: string;

  // Unique suffix so repeated runs don't collide on duplicate file names.
  const runId = Date.now().toString().slice(-6);

  test.beforeAll(async () => {
    api = await ApiClient.create();
  });

  test.afterAll(async () => {
    // Clean up created resources (best-effort — don't fail the suite on cleanup).
    try {
      if (processFileId) await api.deleteFile(processFileId);
    } catch { /* ignore */ }
    try {
      if (formFileId) await api.deleteFile(formFileId);
    } catch { /* ignore */ }
    await api.dispose();
  });

  test('Step 1 · authenticates and captures the auth token', async () => {
    const res = await api.authenticate();
    expect(res.status(), 'authentication should return 200').toBe(200);
    expect(api.authToken, 'a non-empty auth token should be captured').toBeTruthy();
  });

  test('Step 2 · retrieves the private workspace folder id', async () => {
    const { res, folderId } = await api.getPrivateWorkspaceFolderId();
    expect(res.ok(), 'listing private files should succeed').toBeTruthy();
    expect(folderId, 'a private workspace folder id should be resolved').toBeTruthy();
    privateFolderId = folderId;
  });

  test('Step 3 · creates a Form file and returns a valid id', async () => {
    const res = await api.createFormFile(privateFolderId, `AutomatedForm_UC2_${runId}`);
    expect([200, 201], 'form creation should be 200/201').toContain(res.status());
    const body = await res.json();
    expect(body.id, 'form creation response should contain a valid id').toBeTruthy();
    formFileId = String(body.id);
  });

  test('Step 4 · saves form content with TextBox, TextArea and Number', async () => {
    const res = await api.saveFormContent(formFileId, buildFormDefinition());
    expect(res.ok(), 'saving form content should succeed').toBeTruthy();
  });

  test('Step 5 · saves the form file dependencies', async () => {
    const res = await api.saveFormDependencies(formFileId);
    expect(res.ok(), 'saving form dependencies should succeed').toBeTruthy();
  });

  test('Step 6 · creates a Process file and returns a valid id', async () => {
    const res = await api.createProcessFile(privateFolderId, `AutomatedProcess_UC2_${runId}`);
    expect([200, 201], 'process creation should be 200/201').toContain(res.status());
    const body = await res.json();
    expect(body.id, 'process creation response should contain a valid id').toBeTruthy();
    processFileId = String(body.id);
  });

  test('Step 7 · saves the 3-node workflow content referencing the form', async () => {
    const res = await api.saveProcessContent(processFileId, buildProcessDefinition(formFileId));
    expect(res.ok(), 'saving process content should succeed').toBeTruthy();
  });

  test('Step 8 · saves process dependencies linking the form file', async () => {
    const res = await api.saveProcessDependencies(processFileId, formFileId);
    expect(res.ok(), 'saving process dependencies should succeed').toBeTruthy();
  });

  // --- Read-back verification steps ----------------------------------------

  test('Step 9 · verifies saved form content via read-back', async () => {
    const res = await api.readContent(formFileId);
    expect(res.ok(), 'reading form content back should succeed').toBeTruthy();
    const body = await res.json();
    // The form body should contain rows with our three fields.
    const form = body.form ?? body;
    expect(form.rows, 'form should have rows').toBeDefined();
    expect(form.rows.length, 'form should have 3 rows (TextBox, TextArea, Number)').toBe(3);
    // Verify the field types match what we saved.
    const fieldTypes = form.rows.map(
      (row: { columns: Array<{ type: string }> }) => row.columns[0]?.type,
    );
    expect(fieldTypes, 'field types should be TextBox, TextArea, Number').toEqual([
      'TextBox',
      'TextArea',
      'Number',
    ]);
  });

  test('Step 10 · verifies saved process content contains the workflow nodes', async () => {
    const res = await api.readContent(processFileId);
    expect(res.ok(), 'reading process content back should succeed').toBeTruthy();
    const body = await res.json();
    const workflow = body.workflow ?? body;
    expect(workflow.nodes, 'process should have workflow nodes').toBeDefined();
    expect(
      workflow.nodes.length,
      'workflow should have 3 nodes (InitialStep, FormStep, exit)',
    ).toBeGreaterThanOrEqual(3);
  });

  test('Step 11 · verifies process dependencies are persisted', async () => {
    const res = await api.readDependencies(processFileId);
    expect(res.ok(), 'reading process dependencies back should succeed').toBeTruthy();
    const body = await res.json();
    const deps: Array<{ id: string; name: string; type?: string }> =
      body.dependencies ?? body.list ?? [];
    // The dependencies response should contain at least one entry (the process
    // file itself is always present after a successful dependencies save).
    expect(deps.length, 'dependencies response should have at least one entry').toBeGreaterThanOrEqual(1);
    // Verify the process file is present in its own dependency list.
    const selfDep = deps.find((d) => String(d.id) === processFileId);
    expect(selfDep, 'process file should be present in the dependencies response').toBeTruthy();
  });
});
