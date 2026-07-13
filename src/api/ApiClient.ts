import { APIRequestContext, APIResponse, request as pwRequest } from '@playwright/test';
import { env } from '@utils/env';
import type { FormField } from './types';

/**
 * Thin, typed wrapper over the Automation Anywhere Control Room REST API.
 *
 * Every method returns the raw Playwright `APIResponse` so the spec owns the
 * assertions (status codes, body shape). The client owns transport concerns:
 * base URL, the auth header, JSON handling, and endpoint construction.
 *
 * IMPORTANT — endpoint accuracy:
 * The paths in `EP` below follow AA's documented Control Room API, but exact
 * paths/payloads can vary by Control Room version. The assignment explicitly
 * asks you to confirm them via the browser Network tab. Perform the flow once
 * in the UI, watch the requests, and reconcile anything marked `// CONFIRM`.
 *
 * Auth model: AA returns a token from POST /v1/authentication and expects it
 * back on every subsequent call in the `X-Authorization` header.
 */

/**
 * Centralised endpoint paths — single source of truth.
 * These were verified live against Community Edition Control Room
 * (community.cloud.automationanywhere.digital); see the plan/README for details.
 */
const EP = {
  // VERIFIED: /v1/ does not exist on this Control Room; /v2/ is correct.
  authenticate: '/v2/authentication',
  // VERIFIED: lists the authenticated user's private workspace files/folders.
  privateFiles: '/v2/repository/workspaces/private/files/list',
  // VERIFIED: create a file; parentId is passed as a QUERY param (see createFile()).
  createFile: '/v2/repository/files',
  // VERIFIED (GET): the editable content/body of a file. Save method confirmed at runtime.
  saveContent: (fileId: string) => `/v2/repository/files/${fileId}/content`,
  // VERIFIED (PUT): the dependency list of a file.
  saveDependencies: (fileId: string) => `/v2/repository/files/${fileId}/dependencies`,
} as const;

export const CONTENT_TYPE = {
  form: 'application/vnd.aa.form',
  workflow: 'application/vnd.aa.workflow',
} as const;

export class ApiClient {
  private ctx!: APIRequestContext;
  private token = '';
  private userId = 0;

  private constructor() {}

  /** Build a client bound to the configured Control Room base URL. */
  static async create(): Promise<ApiClient> {
    const client = new ApiClient();
    client.ctx = await pwRequest.newContext({
      baseURL: env.crUrl,
      extraHTTPHeaders: { 'Content-Type': 'application/json' },
    });
    return client;
  }

  async dispose(): Promise<void> {
    await this.ctx.dispose();
  }

  get authToken(): string {
    return this.token;
  }

  get authenticatedUserId(): number {
    return this.userId;
  }

  private authHeaders(): Record<string, string> {
    if (!this.token) throw new Error('Not authenticated — call authenticate() first.');
    return { 'X-Authorization': this.token };
  }

  // --- Use Case 2, Step 1 -------------------------------------------------
  /**
   * Authenticate and capture the token + user id. Prefers an API key when
   * configured, otherwise falls back to username/password.
   */
  async authenticate(): Promise<APIResponse> {
    const body = env.apiKey
      ? { username: env.username, apiKey: env.apiKey }
      : { username: env.username, password: env.password };

    const res = await this.ctx.post(EP.authenticate, { data: body });
    if (res.ok()) {
      const json = await res.json();
      this.token = json.token;
      this.userId = json.user?.id ?? 0;
    }
    return res;
  }

  // --- Use Case 2, Step 2 -------------------------------------------------
  /**
   * Resolve the private workspace root folder id for the authenticated user.
   * Returns the folder id (string) so later steps can create files under it.
   */
  async getPrivateWorkspaceFolderId(): Promise<{ res: APIResponse; folderId: string }> {
    const res = await this.ctx.post(EP.privateFiles, {
      headers: this.authHeaders(),
      data: { page: { offset: 0, length: 50 } },
    });

    let folderId = '';
    if (res.ok()) {
      const json = await res.json();
      const list: Array<{ id: string; name: string; parentId: string; folder: boolean }> =
        json.list ?? [];
      // Prefer the "Bots" folder — the private workspace's default location for
      // forms/processes. Fall back to the private root (parent of the entries).
      const bots = list.find((f) => f.folder && f.name === 'Bots');
      folderId = bots?.id ?? list[0]?.parentId ?? '';
    }
    return { res, folderId };
  }

  // --- Use Case 2, Step 3 -------------------------------------------------
  /** Create a Form file under the given folder. */
  async createFormFile(parentFolderId: string, name: string): Promise<APIResponse> {
    return this.ctx.post(EP.createFile, {
      headers: this.authHeaders(),
      data: { name, parentFolderId, description: '', contentType: CONTENT_TYPE.form },
    });
  }

  // --- Use Case 2, Step 4 -------------------------------------------------
  /**
   * Save form content. VERIFIED transport (Network tab): PUT to
   * `.../content?hasErrors=false` with the file's own contentType as the
   * request Content-Type and a `{ form: {...} }` body.
   *
   * `formDefinition` is the full AA form object (properties, rows, meta, ...)
   * including the TextBox/TextArea/Number elements — see buildFormDefinition().
   */
  async saveFormContent(fileId: string, formDefinition: unknown): Promise<APIResponse> {
    return this.ctx.put(EP.saveContent(fileId), {
      headers: { ...this.authHeaders(), 'Content-Type': CONTENT_TYPE.form },
      params: { hasErrors: false },
      data: { form: formDefinition },
    });
  }

  // --- Use Case 2, Step 5 -------------------------------------------------
  /**
   * Save the form's file dependencies (VERIFIED: PUT, body `{dependencies:[{id}]}`).
   * A form usually has no external dependencies, so the default is an empty list.
   */
  async saveFormDependencies(fileId: string, dependencyIds: string[] = []): Promise<APIResponse> {
    return this.ctx.put(EP.saveDependencies(fileId), {
      headers: this.authHeaders(),
      data: { dependencies: dependencyIds.map((id) => ({ id })) },
    });
  }

  // --- Use Case 2, Step 6 -------------------------------------------------
  /** Create a Process (workflow) file under the given folder. */
  async createProcessFile(parentFolderId: string, name: string): Promise<APIResponse> {
    return this.ctx.post(EP.createFile, {
      headers: this.authHeaders(),
      data: { name, parentFolderId, description: '', contentType: CONTENT_TYPE.workflow },
    });
  }

  // --- Use Case 2, Step 7 -------------------------------------------------
  /**
   * Save process content as a 3-node workflow:
   *   InitialStep → FormStep → exit
   * where both InitialStep and FormStep reference the created form file.
   */
  async saveProcessContent(processFileId: string, processDefinition: unknown): Promise<APIResponse> {
    return this.ctx.put(EP.saveContent(processFileId), {
      headers: { ...this.authHeaders(), 'Content-Type': CONTENT_TYPE.workflow },
      params: { hasErrors: false },
      // Body shape captured from the Network tab (see buildProcessDefinition()). // CONFIRM
      data: processDefinition,
    });
  }

  // --- Use Case 2, Step 8 -------------------------------------------------
  /** Save the process's dependencies, linking the form file (VERIFIED: PUT). */
  async saveProcessDependencies(processFileId: string, formFileId: string): Promise<APIResponse> {
    return this.ctx.put(EP.saveDependencies(processFileId), {
      headers: this.authHeaders(),
      data: { dependencies: [{ id: formFileId }] },
    });
  }

  // --- Read-back verification helpers --------------------------------------

  /** Read back the saved content of a file (form or process) for verification. */
  async readContent(fileId: string): Promise<APIResponse> {
    return this.ctx.get(EP.saveContent(fileId), {
      headers: this.authHeaders(),
    });
  }

  /** Read back the saved dependencies of a file for verification. */
  async readDependencies(fileId: string): Promise<APIResponse> {
    return this.ctx.get(EP.saveDependencies(fileId), {
      headers: this.authHeaders(),
    });
  }

  // --- Cleanup helpers -----------------------------------------------------

  /** Delete a file by id (used in teardown to clean up created resources). */
  async deleteFile(fileId: string): Promise<APIResponse> {
    return this.ctx.delete(`${EP.createFile}/${fileId}`, {
      headers: this.authHeaders(),
    });
  }
}
