import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Centralised, validated access to environment configuration.
 * Throwing early (with a clear message) beats a cryptic failure deep in a test.
 */
function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(
      `Missing required environment variable "${name}". ` +
        `Copy .env.example to .env and fill it in.`,
    );
  }
  return value.trim();
}

function optional(name: string, fallback = ''): string {
  return (process.env[name] ?? fallback).trim();
}

export const env = {
  get crUrl(): string {
    return required('CR_URL').replace(/\/+$/, ''); // strip trailing slash
  },
  get username(): string {
    return required('AA_USERNAME');
  },
  get password(): string {
    return required('AA_PASSWORD');
  },
  /** API key if provided; otherwise empty string (caller falls back to password auth). */
  get apiKey(): string {
    return optional('AA_API_KEY');
  },
  get uploadFilePath(): string {
    return optional('UPLOAD_FILE_PATH', 'fixtures/sample-upload.txt');
  },
};
