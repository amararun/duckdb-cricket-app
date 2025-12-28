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
