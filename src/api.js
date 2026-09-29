const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:3001/api").replace(/\/$/, "");

async function request(path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3500);
  try {
    const response = await fetch(`${API_URL}${path}`, {
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      ...options,
      signal: controller.signal
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error(data?.message || `Erro HTTP ${response.status}`);
    return data;
  } finally {
    clearTimeout(timeout);
  }
}

export const api = {
  health: () => request("/health"),
  login: (credentials) => request("/auth/login", { method: "POST", body: JSON.stringify(credentials) }),
  participants: {
    list: () => request("/participants"),
    create: (body) => request("/participants", { method: "POST", body: JSON.stringify(body) }),
    update: (id, body) => request(`/participants/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    remove: (id) => request(`/participants/${id}`, { method: "DELETE" })
  },
  meetings: {
    list: () => request("/meetings"),
    create: (body) => request("/meetings", { method: "POST", body: JSON.stringify(body) }),
    remove: (id) => request(`/meetings/${id}`, { method: "DELETE" }),
    attendance: (meetingId, participantId, present) => request(`/meetings/${meetingId}/attendance/${participantId}`, {
      method: "PATCH", body: JSON.stringify({ present })
    })
  },
  notes: {
    list: () => request("/notes"),
    save: (date, text) => request(`/notes/${date}`, { method: "PUT", body: JSON.stringify({ text }) }),
    remove: (date) => request(`/notes/${date}`, { method: "DELETE" })
  },
  finance: {
    get: () => request("/finance"),
    update: (balance) => request("/finance", { method: "PUT", body: JSON.stringify({ balance }) })
  },
  ideas: {
    list: () => request("/ideas"),
    create: (body) => request("/ideas", { method: "POST", body: JSON.stringify(body) }),
    status: (id, status) => request(`/ideas/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
    remove: (id) => request(`/ideas/${id}`, { method: "DELETE" })
  }
};
