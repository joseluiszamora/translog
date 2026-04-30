export async function apiFetch(path, options = {}) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(payload.error || `Error ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const apiGet = (path) => apiFetch(path);
export const apiPost = (path, body) =>
  apiFetch(path, { method: "POST", body: JSON.stringify(body) });
export const apiPut = (path, body) =>
  apiFetch(path, { method: "PUT", body: JSON.stringify(body) });
export const apiDelete = (path) => apiFetch(path, { method: "DELETE" });
