export const API_BASE =
  import.meta.env.VITE_API_URL ||
  `${window.location.protocol}//${window.location.hostname}:${import.meta.env.VITE_API_PORT || 2195}/api`;
export const TOKEN_KEY = "pharma_token";

export const getToken = () => {
  try { return sessionStorage.getItem(TOKEN_KEY) || ""; } catch { return ""; }
};

const qs = (params) => {
  if (!params) return "";
  const p = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "");
  return p.length ? "?" + new URLSearchParams(p).toString() : "";
};

export async function request(method, path, { body, params } = {}) {
  const token = getToken();
  const url = `${API_BASE}${path}${qs(params)}`;
  let res;
  try {
    res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        "X-Soft-Errors": "1",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    throw new Error("Cannot reach the server. Check that the backend is running.", { cause: e });
  }
  const json = await res.json().catch(() => ({}));
  const status = Number(res.headers.get("X-Status")) || res.status;
  if (status === 401 && token && !path.startsWith("/auth/login")) {
    window.dispatchEvent(new Event("auth:expired"));
  }
  if (status >= 400 || json.success === false) {
    const err = new Error(json.error || `Request failed (${status})`);
    err.status = status;
    if (Array.isArray(json.errors)) err.errors = json.errors;
    throw err;
  }
  const exp = res.headers.get("X-Session-Expires");
  if (exp) window.dispatchEvent(new CustomEvent("auth:activity", { detail: exp }));
  return json;
}

export const api = {
  get: (path, params) => request("GET", path, { params }).then((j) => j.data),
  post: (path, body) => request("POST", path, { body }).then((j) => ({ data: j.data, message: j.message })),
  put: (path, body) => request("PUT", path, { body }).then((j) => ({ data: j.data, message: j.message })),
  del: (path, params) => request("DELETE", path, { params }).then((j) => ({ data: j.data, message: j.message })),
};

export default api;
