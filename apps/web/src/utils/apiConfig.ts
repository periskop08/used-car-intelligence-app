export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export async function fetchReportApi(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options.headers as Record<string, string>) || {}),
  };

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  // Try with /api/admin/reports prefix first
  let targetUrl = `${API_URL}/api${cleanEndpoint}`;
  let res = await fetch(targetUrl, { ...options, headers });

  // Fallback to direct URL without extra /api if 404
  if (!res.ok && res.status === 404) {
    targetUrl = `${API_URL}${cleanEndpoint}`;
    res = await fetch(targetUrl, { ...options, headers });
  }

  return res;
}
