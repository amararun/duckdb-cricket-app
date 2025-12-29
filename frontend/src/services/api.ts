// API calls go through Vercel serverless function (no API key exposed in frontend)
const API_BASE = '/api/duckdb';

interface QueryResponse {
  columns: string[];
  rows: (string | number | boolean | null)[][];
  row_count: number;
  truncated: boolean;
}

interface TablesResponse {
  tables: string[];
}

interface SchemaColumn {
  column_name: string;
  column_type: string;
  nullable: boolean;
}

interface SchemaResponse {
  table: string;
  schema: SchemaColumn[];
}

async function fetchApi(params: string, options: RequestInit = {}) {
  const response = await fetch(`${API_BASE}?${params}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

export async function getTables(): Promise<TablesResponse> {
  return fetchApi('action=tables');
}

export async function getSchema(tableName: string): Promise<SchemaResponse> {
  return fetchApi(`action=schema&table=${encodeURIComponent(tableName)}`);
}

export async function executeQuery(sql: string, limit?: number): Promise<QueryResponse> {
  return fetchApi('action=query', {
    method: 'POST',
    body: JSON.stringify({ sql, limit }),
  });
}

export async function getTableSample(tableName: string, limit: number = 5): Promise<QueryResponse> {
  return executeQuery(`SELECT * FROM ${tableName} LIMIT ${limit}`);
}

// ============== Admin API ==============

export interface AdminFile {
  name: string;
  size_bytes: number;
  size_mb: number;
  row_count: number;
  tables: string[];
  updated_at: string;
}

export interface AdminFilesResponse {
  files: AdminFile[];
  count: number;
}

export interface AdminPreviewTable {
  columns: string[];
  rows: (string | number | boolean | null)[][];
  row_count: number;
}

export interface AdminPreviewResponse {
  filename: string;
  tables: Record<string, AdminPreviewTable>;
}

export async function getAdminFiles(): Promise<AdminFilesResponse> {
  return fetchApi('action=admin-files');
}

export async function getAdminFilePreview(filename: string): Promise<AdminPreviewResponse> {
  return fetchApi(`action=admin-preview&filename=${encodeURIComponent(filename)}`);
}

export async function deleteAdminFile(filename: string): Promise<{ message: string }> {
  return fetchApi(`action=admin-delete&filename=${encodeURIComponent(filename)}`, {
    method: 'DELETE',
  });
}

export async function renameAdminFile(filename: string, newName: string): Promise<{ message: string; new_name: string }> {
  return fetchApi(`action=admin-rename&filename=${encodeURIComponent(filename)}`, {
    method: 'PUT',
    body: JSON.stringify({ new_name: newName }),
  });
}

export async function refreshAdminFileMetadata(filename: string): Promise<{ message: string; metadata: AdminFile }> {
  return fetchApi(`action=admin-refresh&filename=${encodeURIComponent(filename)}`, {
    method: 'POST',
  });
}

export function getAdminFileDownloadUrl(filename: string): string {
  return `${API_BASE}?action=admin-download&filename=${encodeURIComponent(filename)}`;
}
