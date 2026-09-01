import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

const API = Constants.expoConfig?.extra?.apiUrl ?? 'https://amotpay-api.nexustechnologies.cloud';

let token: string | null = null;

export async function loadAdminToken() {
  token = await SecureStore.getItemAsync('amotpay_admin_token');
  return token;
}

export async function saveAdminToken(t: string) {
  token = t;
  await SecureStore.setItemAsync('amotpay_admin_token', t);
}

async function req(path: string, options: RequestInit = {}) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { ...options, headers });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message ?? 'Erreur');
  return json.data ?? json;
}

export const adminApi = {
  login: (pin: string) => req('/admin/login', { method: 'POST', body: JSON.stringify({ pin }) }),
  getProviders: () => req('/admin/providers'),
  saveProviders: (body: object) => req('/admin/providers', { method: 'PUT', body: JSON.stringify(body) }),
  healthCheck: () => req('/admin/health-check'),
};

export type MagmaSetup = {
  webhook_url: string;
  success_url: string;
  error_url: string;
  server_outbound_ip: string | null;
  key_expiry_max_days: number;
  secret_key_rules: { min_length: number; must_include: string };
};
