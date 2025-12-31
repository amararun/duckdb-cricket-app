// API calls go through Vercel serverless function (no API key exposed in frontend)
const API_BASE = '/api/duckdb';

// For local dev file uploads, we need direct backend access (Vite proxy has issues with multipart)
// This is only used in local dev and is NOT exposed in production builds
const DEV_BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

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
  table_row_counts: Record<string, number>;
  updated_at: string;
  share_token: string | null;
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

// ============== Table-level operations ==============

export async function renameAdminTable(
  filename: string,
  tableName: string,
  newTableName: string
): Promise<{ message: string; new_table_name: string }> {
  return fetchApi(
    `action=admin-table-rename&filename=${encodeURIComponent(filename)}&table=${encodeURIComponent(tableName)}`,
    {
      method: 'PUT',
      body: JSON.stringify({ new_table_name: newTableName }),
    }
  );
}

export async function deleteAdminTable(
  filename: string,
  tableName: string
): Promise<{ message: string; deleted_rows: number }> {
  return fetchApi(
    `action=admin-table-delete&filename=${encodeURIComponent(filename)}&table=${encodeURIComponent(tableName)}`,
    {
      method: 'DELETE',
    }
  );
}

// ============== File Sharing ==============

export interface ShareResponse {
  message: string;
  token: string;
  share_url: string;
  filename: string;
}

export async function shareAdminFile(filename: string): Promise<ShareResponse> {
  return fetchApi(`action=admin-share&filename=${encodeURIComponent(filename)}`, {
    method: 'POST',
  });
}

export async function unshareAdminFile(filename: string): Promise<{ message: string; filename: string }> {
  return fetchApi(`action=admin-unshare&filename=${encodeURIComponent(filename)}`, {
    method: 'DELETE',
  });
}

export function getShareDownloadUrl(token: string): string {
  // Use duckdb-upload subdomain for share downloads (bypasses Cloudflare)
  return `https://duckdb-upload.tigzig.com/s/${token}`;
}

// ============== Upload ==============

export interface UploadResponse {
  message: string;
  filename: string;
  size_bytes: number;
  size_mb: number;
}

export interface UploadTokenResponse {
  token: string;
  filename: string;
  expires_in: number;
  upload_url: string;
  max_size_mb: number;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

/**
 * Get an upload token for direct upload (bypasses Vercel 4.5MB limit)
 */
export async function getUploadToken(
  filename: string,
  contentLength?: number
): Promise<UploadTokenResponse> {
  return fetchApi('action=admin-upload-token', {
    method: 'POST',
    body: JSON.stringify({ filename, content_length: contentLength }),
  });
}

/**
 * Upload a file directly to the backend using a pre-generated token
 * This bypasses Vercel's 4.5MB payload limit
 */
export async function uploadAdminFileDirect(
  file: File,
  customName?: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResponse> {
  const filename = customName || file.name.replace(/\.duckdb$/i, '');

  // Step 1: Get upload token via Vercel proxy (small JSON request)
  const tokenResponse = await getUploadToken(filename, file.size);

  // Step 2: Upload directly to backend using the token (bypasses Vercel)
  // Use duckdb-upload subdomain which bypasses Cloudflare proxy (DNS only)
  // This avoids Cloudflare's 100MB upload limit on free tier
  const backendUrl = DEV_BACKEND_URL || 'https://duckdb-upload.tigzig.com';
  const uploadUrl = `${backendUrl}${tokenResponse.upload_url}`;

  const formData = new FormData();
  formData.append('file', file);

  return new Promise<UploadResponse>((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress({
          loaded: event.loaded,
          total: event.total,
          percentage: Math.round((event.loaded / event.total) * 100),
        });
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch {
          reject(new Error('Invalid response from server'));
        }
      } else {
        try {
          const error = JSON.parse(xhr.responseText);
          reject(new Error(error.error || error.detail || `HTTP ${xhr.status}`));
        } catch {
          reject(new Error(`Upload failed: HTTP ${xhr.status}`));
        }
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Network error during upload'));
    });

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload cancelled'));
    });

    xhr.open('POST', uploadUrl);
    xhr.send(formData);
  });
}

/**
 * Upload a file - uses direct upload for large files, proxy for small files
 */
export async function uploadAdminFile(
  file: File,
  customName?: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResponse> {
  const VERCEL_LIMIT = 4 * 1024 * 1024; // 4MB (safe margin below 4.5MB limit)

  // For local dev, always use direct backend call
  const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  // Use direct upload for:
  // 1. Large files (> 4MB) - bypasses Vercel limit
  // 2. When progress tracking is needed
  // 3. Local dev environment
  if (file.size > VERCEL_LIMIT || onProgress || isLocalDev) {
    return uploadAdminFileDirect(file, customName, onProgress);
  }

  // Small files can go through Vercel proxy (simpler, no CORS issues)
  const formData = new FormData();
  formData.append('file', file);
  if (customName) {
    formData.append('custom_name', customName);
  }

  const response = await fetch(`${API_BASE}?action=admin-upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error(error.error || error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}
