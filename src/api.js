const API_URL = (import.meta.env?.VITE_API_URL?.trim() || "http://localhost:3001/api").replace(/\/+$/, "");

async function request(path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: { ...(options.body ? { "Content-Type": "application/json" } : {}), ...(options.headers || {}) },
      signal: controller.signal
    });
    const body = await response.text();
    let data = null;
    try { data = body ? JSON.parse(body) : null; }
    catch {
      throw new Error(`Resposta inválida da API em ${API_URL}${path} (HTTP ${response.status}). Verifique VITE_API_URL e a rota do backend.`);
    }
    if (!response.ok) throw new Error(data?.message || `Erro HTTP ${response.status}`);
    return data;
  } catch (error) {
    if (error.name === "AbortError") throw new Error(`O backend em ${API_URL} não respondeu em 15 segundos. Tente novamente.`);
    if (error instanceof TypeError) throw new Error(`Não foi possível conectar ao backend em ${API_URL}. Verifique se o servidor está ativo, a URL e o CORS. (${error.message})`);
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export const api = {
  health: () => request("/health"),
  login: (credentials) => request("/auth/login", { method: "POST", body: JSON.stringify(credentials) }),
  notebook: {
    list: () => request("/notebook/pages"),
    create: (body) => request("/notebook/pages", { method: "POST", body: JSON.stringify(body) }),
    update: (id, body) => request(`/notebook/pages/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(body) }),
    remove: (id) => request(`/notebook/pages/${encodeURIComponent(id)}`, { method: "DELETE" })
  },
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
