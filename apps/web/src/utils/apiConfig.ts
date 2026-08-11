export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
export const API_BASE_URL = API_URL;

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken') || localStorage.getItem('token') || null;
}

export async function fetchReportApi(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options.headers as Record<string, string>) || {}),
  };

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  // Try direct route first since NestJS controller uses @Controller('admin/reports')
  let targetUrl = `${API_URL}${cleanEndpoint}`;
  let res = await fetch(targetUrl, { ...options, headers });

  // Fallback to /api prefix if 404
  if (!res.ok && res.status === 404) {
    targetUrl = `${API_URL}/api${cleanEndpoint}`;
    res = await fetch(targetUrl, { ...options, headers });
  }

  return res;
}
