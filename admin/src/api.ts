const API = import.meta.env.VITE_API_URL ?? 'https://amotpay-api.nexustechnologies.cloud';

let token: string | null = localStorage.getItem('amotpay_admin_token');
let accountStatus: {
  password_change_required?: boolean;
  totp_enabled?: boolean;
  username?: string;
} | null = null;

export function setToken(t: string | null) {
  token = t;
  if (t) localStorage.setItem('amotpay_admin_token', t);
  else localStorage.removeItem('amotpay_admin_token');
}

export function getToken() {
  return token;
}

export function setAccountStatus(status: typeof accountStatus) {
  accountStatus = status;
  if (status?.password_change_required) {
    localStorage.setItem('amotpay_admin_password_change', '1');
  } else {
    localStorage.removeItem('amotpay_admin_password_change');
  }
}

export function passwordChangeRequired(): boolean {
  return accountStatus?.password_change_required === true
    || localStorage.getItem('amotpay_admin_password_change') === '1';
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API}/api${path}`, { ...options, headers });
  const json = await res.json();
  if (!res.ok || !json.success) {
    const code = json.error?.code as string | undefined;
    const err = new Error(json.error?.message ?? 'Request failed') as Error & { code?: string };
    err.code = code;
    throw err;
  }
  return json.data as T;
}

export type LoginResult = {
  token: string;
  username: string;
  account_status: string;
  password_change_required: boolean;
  totp_enabled: boolean;
};

export async function login(username: string, password: string, totpCode?: string): Promise<LoginResult> {
  const res = await fetch(`${API}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username,
      password,
      ...(totpCode ? { totp_code: totpCode } : {}),
    }),
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    const err = new Error(json.error?.message ?? 'Login failed') as Error & { code?: string };
    err.code = json.error?.code;
    throw err;
  }
  const data = json.data as LoginResult;
  setToken(data.token);
  setAccountStatus({
    password_change_required: data.password_change_required,
    totp_enabled: data.totp_enabled,
    username: data.username,
  });
  return data;
}

export async function logout() {
  try {
    if (token) await api('/admin/logout', { method: 'POST', body: '{}' });
  } finally {
    setToken(null);
    setAccountStatus(null);
  }
}
