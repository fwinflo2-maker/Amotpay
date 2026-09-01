const API = import.meta.env.VITE_API_URL ?? 'https://amotpay-api.nexustechnologies.cloud';

let token: string | null = sessionStorage.getItem('amotpay_token');

export function setToken(t: string | null) {
  token = t;
  if (t) sessionStorage.setItem('amotpay_token', t);
  else sessionStorage.removeItem('amotpay_token');
}

export function getToken() {
  return token;
}

type ApiEnvelope<T> = {
  success: boolean;
  data?: T;
  error?: { message?: string; code?: string };
};

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API}/api${path}`, { ...options, headers });
  const json = (await res.json()) as ApiEnvelope<T>;
  if (!res.ok || !json.success) {
    const err = new Error(json.error?.message ?? 'Request failed') as Error & { code?: string };
    err.code = json.error?.code;
    throw err;
  }
  return json.data as T;
}

export async function login(phone: string, password: string) {
  const res = await fetch(`${API}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, password }),
  });
  const json = (await res.json()) as ApiEnvelope<{ token: string }>;
  if (!res.ok || !json.success || !json.data?.token) {
    throw new Error(json.error?.message ?? 'Login failed');
  }
  setToken(json.data.token);
}
