const json = async (res) => {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (_) {
    return { raw: text };
  }
};

const request = async (method, path, body) => {
  const res = await fetch(path, {
    method,
    credentials: "include",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await json(res);
  if (!res.ok) {
    const message = data?.error || data?.message || `HTTP ${res.status}`;
    const err = new Error(message);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
};

export const api = {
  health: () => request("GET", "/api/health"),
  me: () => request("GET", "/api/me"),
  login: ({ email, password }) => request("POST", "/api/login", { email, password }),
  logout: () => request("POST", "/api/logout"),
  orders: () => request("GET", "/api/orders"),
};

