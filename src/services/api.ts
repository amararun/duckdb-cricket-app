const API_URL = import.meta.env.VITE_API_URL || 'https://duckdb-cricket-backend.tigzig.com';
const API_KEY = import.meta.env.VITE_API_KEY || '';

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

async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

export async function getTables(): Promise<TablesResponse> {
  return fetchWithAuth('/api/v1/tables');
}

export async function getSchema(tableName: string): Promise<SchemaResponse> {
  return fetchWithAuth(`/api/v1/schema/${tableName}`);
}

export async function executeQuery(sql: string, limit?: number): Promise<QueryResponse> {
  return fetchWithAuth('/api/v1/query', {
    method: 'POST',
    body: JSON.stringify({ sql, limit }),
  });
}

export async function getTableSample(tableName: string, limit: number = 5): Promise<QueryResponse> {
  return executeQuery(`SELECT * FROM ${tableName} LIMIT ${limit}`);
}
