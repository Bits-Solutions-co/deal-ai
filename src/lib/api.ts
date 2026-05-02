// New Allrounder API client — calls the workspace-scoped backend routes.
// Always uses fetch with `credentials: "include"` so the JWT cookie is sent.

const BASE = process.env.NEXT_PUBLIC_SERVER_BASE_URL ?? "";

type ApiResponse<T> = { ok: true; data: T } | { ok: false; error: { code: string; message: string; fields?: any } };

async function request<T = unknown>(
  path: string,
  init: RequestInit = {}
): Promise<ApiResponse<T>> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  let body: any;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  if (!res.ok) {
    return body?.error
      ? { ok: false, error: body.error }
      : { ok: false, error: { code: `HTTP_${res.status}`, message: res.statusText } };
  }
  return body as ApiResponse<T>;
}

export const api = {
  session: {
    issue: (userId: string, sessionId: string) =>
      request("/api/session", { method: "POST", body: JSON.stringify({ userId, sessionId }) }),
    get: () => request("/api/session"),
    end: () => request("/api/session", { method: "DELETE" }),
  },
  workspaces: {
    list: () => request<any[]>("/api/workspaces"),
    create: (body: { slug: string; name: string; region?: string; locale?: string; verticalPacks?: string[] }) =>
      request("/api/workspaces", { method: "POST", body: JSON.stringify(body) }),
    get: (slug: string) => request<any>(`/api/workspaces/${slug}`),
    update: (slug: string, body: any) =>
      request(`/api/workspaces/${slug}`, { method: "PATCH", body: JSON.stringify(body) }),
    remove: (slug: string) => request(`/api/workspaces/${slug}`, { method: "DELETE" }),
    members: {
      list: (slug: string) => request<any[]>(`/api/workspaces/${slug}/members`),
      invite: (slug: string, email: string, role: string) =>
        request(`/api/workspaces/${slug}/members`, {
          method: "POST",
          body: JSON.stringify({ email, role }),
        }),
      update: (slug: string, memberId: string, role: string) =>
        request(`/api/workspaces/${slug}/members/${memberId}`, {
          method: "PATCH",
          body: JSON.stringify({ role }),
        }),
      remove: (slug: string, memberId: string) =>
        request(`/api/workspaces/${slug}/members/${memberId}`, { method: "DELETE" }),
    },
  },
  templates: {
    list: () => request<any[]>("/api/templates"),
    get: (slug: string) => request<any>(`/api/templates/${slug}`),
  },
  brand: {
    get: (slug: string) => request<any>(`/api/workspaces/${slug}/brand`),
    update: (slug: string, body: any) =>
      request(`/api/workspaces/${slug}/brand`, { method: "PATCH", body: JSON.stringify(body) }),
  },
  documents: {
    list: (slug: string) => request<any[]>(`/api/workspaces/${slug}/documents`),
    register: (slug: string, body: any) =>
      request(`/api/workspaces/${slug}/documents`, { method: "POST", body: JSON.stringify(body) }),
    get: (slug: string, id: string) => request<any>(`/api/workspaces/${slug}/documents/${id}`),
    remove: (slug: string, id: string) =>
      request(`/api/workspaces/${slug}/documents/${id}`, { method: "DELETE" }),
  },
  campaigns: {
    list: (slug: string) => request<any[]>(`/api/workspaces/${slug}/campaigns`),
    create: (slug: string, body: any) =>
      request<any>(`/api/workspaces/${slug}/campaigns`, { method: "POST", body: JSON.stringify(body) }),
    get: (slug: string, id: string) => request<any>(`/api/workspaces/${slug}/campaigns/${id}`),
    update: (slug: string, id: string, body: any) =>
      request(`/api/workspaces/${slug}/campaigns/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    regenerate: (slug: string, id: string) =>
      request(`/api/workspaces/${slug}/campaigns/${id}/regenerate`, { method: "POST" }),
    strategy: {
      get: (slug: string, id: string) => request<any>(`/api/workspaces/${slug}/campaigns/${id}/strategy`),
      update: (slug: string, id: string, body: any) =>
        request(`/api/workspaces/${slug}/campaigns/${id}/strategy`, {
          method: "PATCH",
          body: JSON.stringify(body),
        }),
      approve: (slug: string, id: string) =>
        request(`/api/workspaces/${slug}/campaigns/${id}/strategy/approve`, { method: "POST" }),
    },
  },
  posts: {
    list: (slug: string, params?: { campaignId?: string; from?: string; to?: string; status?: string; platform?: string }) => {
      const qs = new URLSearchParams(params as any).toString();
      return request<any[]>(`/api/workspaces/${slug}/posts${qs ? "?" + qs : ""}`);
    },
    get: (slug: string, id: string) => request<any>(`/api/workspaces/${slug}/posts/${id}`),
    update: (slug: string, id: string, body: any) =>
      request(`/api/workspaces/${slug}/posts/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    approve: (slug: string, id: string) =>
      request(`/api/workspaces/${slug}/posts/${id}/approve`, { method: "POST" }),
    reject: (slug: string, id: string, reason: string) =>
      request(`/api/workspaces/${slug}/posts/${id}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      }),
    schedule: (slug: string, id: string, scheduledFor: string) =>
      request(`/api/workspaces/${slug}/posts/${id}/schedule`, {
        method: "POST",
        body: JSON.stringify({ scheduledFor }),
      }),
    regenerateText: (slug: string, id: string) =>
      request(`/api/workspaces/${slug}/posts/${id}/regenerate-text`, { method: "POST" }),
    regenerateImage: (slug: string, id: string, prompt?: string) =>
      request(`/api/workspaces/${slug}/posts/${id}/regenerate-image`, {
        method: "POST",
        body: JSON.stringify({ prompt }),
      }),
    versions: (slug: string, id: string) =>
      request<any[]>(`/api/workspaces/${slug}/posts/${id}/versions`),
    restoreVersion: (slug: string, id: string, version: number) =>
      request(`/api/workspaces/${slug}/posts/${id}/versions/${version}/restore`, { method: "POST" }),
    comments: {
      list: (slug: string, id: string) =>
        request<any[]>(`/api/workspaces/${slug}/posts/${id}/comments`),
      add: (slug: string, id: string, body: string) =>
        request(`/api/workspaces/${slug}/posts/${id}/comments`, {
          method: "POST",
          body: JSON.stringify({ body }),
        }),
    },
  },
};

export default api;
