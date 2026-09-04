import { API_BASE, PAGE_SIZE } from "./config.js";

export class CisionClient {
  constructor({ login, password, fetchImpl = fetch }) {
    if (!login || !password) {
      throw new Error("CISION_LOGIN and CISION_PASSWORD are required");
    }
    this.login = login;
    this.password = password;
    this.fetch = fetchImpl;
    this.token = null;
    this.expiresAt = 0;
  }

  async authenticate() {
    const response = await this.fetch(`${API_BASE}/api/v1.0/auth/login`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Client": this.login
      },
      body: JSON.stringify({ login: this.login, pwd: this.password })
    });
    const payload = await readJson(response);
    if (!response.ok || !payload.auth_token) {
      throw apiError("Cision authentication failed", response, payload);
    }
    this.token = payload.auth_token;
    this.expiresAt = parseCisionDate(payload.expires)?.getTime() || Date.now() + 150 * 60_000;
    return payload;
  }

  async request(path, { retryAuth = true } = {}) {
    if (!this.token || Date.now() > this.expiresAt - 5 * 60_000) {
      await this.authenticate();
    }
    const response = await this.fetch(`${API_BASE}${path}`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${this.token}`,
        "X-Client": this.login
      }
    });
    if (response.status === 401 && retryAuth) {
      this.token = null;
      await this.authenticate();
      return this.request(path, { retryAuth: false });
    }
    const payload = await readJson(response);
    if (!response.ok) throw apiError(`Cision request failed: ${path}`, response, payload);
    return payload;
  }

  async getAllReleases(params) {
    const releases = [];
    let offset = 0;
    while (true) {
      const query = new URLSearchParams({ ...params, from: String(offset), size: String(PAGE_SIZE) });
      const payload = await this.request(`/api/v1.0/releases?${query}`);
      const page = Array.isArray(payload.data) ? payload.data : [];
      releases.push(...page);
      const total = Number(payload.pagination?.total_items ?? releases.length);
      if (!page.length || releases.length >= total || page.length < PAGE_SIZE) break;
      offset += page.length;
    }
    return releases;
  }

  async getRelease(releaseId) {
    const payload = await this.request(`/api/v1.0/releases/${encodeURIComponent(releaseId)}`);
    return payload.data;
  }

  async getCodes(type) {
    const allowed = new Set(["industry", "subject", "geography", "exchange", "language"]);
    if (!allowed.has(type)) throw new Error(`Unsupported Cision code type: ${type}`);
    return this.request(`/api/v1.0/codes/${type}`);
  }
}

async function readJson(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { message: text.slice(0, 500) };
  }
}

function apiError(prefix, response, payload) {
  const detail = payload?.message || payload?.error || response.statusText;
  const error = new Error(`${prefix} (${response.status}): ${detail}`);
  error.status = response.status;
  return error;
}

export function parseCisionDate(value) {
  if (!value) return null;
  const match = String(value).match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})([+-])(\d{2})(\d{2})$/);
  if (!match) return null;
  const [, y, mo, d, h, mi, s, sign, oh, om] = match;
  const offsetMinutes = (Number(oh) * 60 + Number(om)) * (sign === "+" ? 1 : -1);
  const utc = Date.UTC(+y, +mo - 1, +d, +h, +mi, +s) - offsetMinutes * 60_000;
  return new Date(utc);
}

export function formatCisionDate(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}+0000`;
}
