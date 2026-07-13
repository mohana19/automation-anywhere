/** Minimal typings for the AA Control Room API responses we consume. */

export interface AuthResponse {
  token: string;
  user: {
    id: number;
    username: string;
    // ...other fields omitted
  };
  tenantUuid?: string;
}

export interface RepositoryFile {
  id: string;
  name: string;
  type?: string;
  parentId?: string;
  path?: string;
}

/** A "list files/folders" response is paginated with a `list` array. */
export interface ListResponse<T> {
  page: { offset: number; total: number; totalFilter: number };
  list: T[];
}

export interface CreateFileResponse {
  id: string;
  name: string;
  type: string;
  parentId: string;
}

/** A single field inside a form definition. */
export interface FormField {
  type: 'TextBox' | 'TextArea' | 'Number';
  label: string;
  variableName: string;
}
