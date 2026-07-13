# Automation Anywhere — Automation Assignment

Automated tests for **Automation Anywhere Community Edition**, covering two use cases:

- **Use Case 1 — Form with Upload Flow (UI):** log in, build a Form with a Textbox + File Upload control, upload a document, save, and verify the result — driven through the browser using the **Page Object Model**.
- **Use Case 2 — Create a Process with a Form (API):** authenticate, resolve the private workspace, and create a Form and a Process (with a 3-node `InitialStep → FormStep → exit` workflow) purely via the Control Room REST API.

## Framework & tools

| Concern | Choice |
|---|---|
| Test runner | [Playwright Test](https://playwright.dev) `@playwright/test` |
| Language | TypeScript |
| UI pattern | Page Object Model (`src/pages`) |
| API layer | Typed `ApiClient` over Playwright's `APIRequestContext` (`src/api`) |
| Config | `.env` via `dotenv` |
| Reporting | Playwright HTML report + list reporter |

## Project structure

```
aa-automation-assignment/
├── playwright.config.ts        # two projects: "ui" (UC1) and "api" (UC2)
├── .env.example                # copy to .env and fill in your account values
├── fixtures/
│   └── sample-upload.txt        # document uploaded in UC1
├── src/
│   ├── pages/                   # Page Object Model (UC1)
│   │   ├── BasePage.ts
│   │   ├── LoginPage.ts
│   │   ├── AutomationPage.ts
│   │   └── FormBuilderPage.ts
│   ├── api/                     # API client + types (UC2)
│   │   ├── ApiClient.ts
│   │   └── types.ts
│   └── utils/
│       └── env.ts               # validated environment access
└── tests/
    ├── uc1-form-upload.spec.ts   # UI — Use Case 1
    └── uc2-process-api.spec.ts   # API — Use Case 2
```

## Setup

Requires **Node.js 18+**.

```bash
# 1. Install dependencies
npm install

# 2. Install Playwright browsers
npx playwright install

# 3. Configure your account
cp .env.example .env          # Windows: copy .env.example .env
#   then edit .env with your Control Room URL, email, password / API key
```

### Getting your credentials

1. Register at <https://www.automationanywhere.com/products/enterprise/community-edition> using a personal email.
2. After activation you land on a Control Room URL such as
   `https://community.cloud.automationanywhere.digital` — put it in `CR_URL`.
3. Put your login email in `AA_USERNAME` and password in `AA_PASSWORD`.
4. (Recommended for the API tests) In **My Settings → Generate API key**, create an API key and set `AA_API_KEY`.

## Running the tests

```bash
npm test              # run everything (UI + API)
npm run test:ui       # Use Case 1 only (UI)
npm run test:api      # Use Case 2 only (API)
npm run test:headed   # UI with a visible browser
npm run report        # open the last HTML report
npm run typecheck     # TypeScript type-check without running
```

## Assertions covered

**Use Case 1 (UI)**
- Login succeeds and leaves the login route.
- Textbox and Select File controls are visible/functional on the canvas.
- Each control's right-hand properties panel opens on selection.
- Text is entered and a document is uploaded, with upload confirmation.
- The form saves with a visible save confirmation.

**Use Case 2 (API)**
- Authentication returns `200` and a non-empty token.
- Private workspace folder id is resolved.
- Form creation returns `200/201` with a valid `id`.
- Form content save succeeds.
- Form dependencies save succeeds.
- Process creation returns `200/201` with a valid `id`.
- Process content save (3-node workflow) succeeds.
- Process dependencies save (linking the form) succeeds.

## Test Organization

### Use Case 1 (UC1) - UI Automation
**File:** `tests/uc1-form-upload.spec.ts`
- **Test name:** `logs in, builds a form with Textbox + File Upload, uploads a doc, and saves`
- **What it does:** 
  - Logs into Automation Anywhere Control Room
  - Navigates to Automation → Create → Form
  - Adds Textbox and File Upload controls to the form
  - Verifies controls are visible and properties panel works
  - Attempts file upload
  - Saves the form
- **Page Objects:** LoginPage, AutomationPage, FormBuilderPage (Page Object Model pattern)

### Use Case 2 (UC2) - API Automation
**File:** `tests/uc2-process-api.spec.ts`
- **Test structure:** Serial test execution (11 steps + 3 verification steps)
- **Tests:**
  - Step 1: Authentication and token capture
  - Step 2: Retrieve private workspace folder ID
  - Step 3: Create Form file
  - Step 4: Save form content (TextBox, TextArea, Number fields)
  - Step 5: Save form dependencies
  - Step 6: Create Process file
  - Step 7: Save process workflow (3-node: InitialStep → FormStep → exit)
  - Step 8: Save process dependencies (link to form)
  - Step 9: Verify form content via read-back
  - Step 10: Verify process content/workflow persisted
  - Step 11: Verify process dependencies persisted
- **API Layer:** Typed `ApiClient` class with request/response handling

## Environment / Configuration Notes

- **Node.js requirement:** Node.js 18+ required
- **Playwright browsers:** Run `npx playwright install` after npm install
- **.env file:** Copy `.env.example` to `.env` and populate with your Automation Anywhere credentials:
  - `CR_URL`: Your Control Room URL (e.g., `https://community.cloud.automationanywhere.digital`)
  - `AA_USERNAME`: Your login email
  - `AA_PASSWORD`: Your login password
  - `AA_API_KEY`: (Optional) Your API key from My Settings → Generate API key
  - `uploadFilePath`: Path to file for upload testing (defaults to `fixtures/sample-upload.txt`)

- **Confirm live selectors and endpoints:** Community Edition's DOM and API can
  vary slightly by Control Room version. Locators and API paths that need
  verification are marked with `// CONFIRM` in the source. To reconcile them:
  - **UI:** run `npm run codegen` (Playwright opens the app and generates
    selectors as you click) against your `CR_URL`.
  - **API:** perform the form/process flow once in the UI with the browser
    **Network tab** open, and match the real request paths/payloads to the
    constants in `src/api/ApiClient.ts` (`EP` map).

- **Auth header:** The Control Room expects the captured token back in the
  `X-Authorization` header on every authenticated call.

- **Serial execution:** Tests run with a single worker. Community Edition is a
  shared tenant and UC2 steps depend on each other's state.

- **Secrets:** `.env` is git-ignored — never commit real credentials.

- **Test reports:** HTML reports are generated in `playwright-report/` after each run.
  View with: `npm run report`

## Known Limitations

- **UC1 File Upload:** File upload via automation may require browser-specific handling
  or may not fully complete in all environments. The form structure is created successfully
  and saved regardless of upload status.

## Submission Checklist

✅ Code organized by use case (UC1: UI, UC2: API)
✅ Tests tagged with descriptive names  
✅ Page Object Model used for UI automation
✅ API client with typed responses for API tests
✅ Environment configuration via `.env`
✅ README.md with setup, execution, and configuration instructions
✅ TypeScript for type safety
✅ Playwright Test framework with HTML reporting
```
