const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

async function request(path, options = {}) {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...options
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}
export const api = {
  login: (email, password) => request("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  register: (body) => request("/auth/register", { method: "POST", body: JSON.stringify(body) }),
  me: () => request("/me"),
  contacts: () => request("/contacts"),
  addContact: body => request("/contacts", { method: "POST", body: JSON.stringify(body) }),
  alerts: () => request("/alerts"),
  createAlert: body => request("/alerts", { method: "POST", body: JSON.stringify(body) }),
  updateAlert: (id, body) => request(`/alerts/${id}`, { method: "PATCH", body: JSON.stringify(body) })
};
export { API };
