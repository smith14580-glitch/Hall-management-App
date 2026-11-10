const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function authHeaders() {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (typeof window !== "undefined") {
    const t = localStorage.getItem("access_token");
    if (t) headers["Authorization"] = `Bearer ${t}`;
  }
  return headers;
}

export async function apiRequest<T = any>(
  path: string,
  { method = "GET", body, query }: { method?: string; body?: any; query?: Record<string, string | number> } = {},
): Promise<T> {
  let url = `${API_URL}/api/v1${path}`;
  if (query) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) qs.set(k, String(v));
    url += `?${qs.toString()}`;
  }
  const res = await fetch(url, {
    method,
    headers: authHeaders(),
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (res.status === 401) {
    if (typeof window !== "undefined") window.location.href = "/login";
    throw new Error("Session expired");
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error?.message || `Request failed (${res.status})`);
  return json?.success ? json.data : json;
}
