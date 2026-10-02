/** The admin panel's API client (talks to src/server/adminApi.ts). */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public problems: string[] = [],
    public version?: number
  ) {
    super(message);
  }
}

export async function api<T = unknown>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(`/api/admin/${path}`, {
    method: init.method ?? "GET",
    credentials: "same-origin",
    headers: init.body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string; problems?: string[]; version?: number };
  if (!res.ok) throw new ApiError(data.error ?? `Request failed (${res.status})`, res.status, data.problems ?? [], data.version);
  return data as T;
}

/** Client-side navigation inside /admin. */
export function navigate(to: string) {
  history.pushState(null, "", to);
  window.dispatchEvent(new PopStateEvent("popstate"));
}
