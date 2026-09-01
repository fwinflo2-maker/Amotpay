import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.apiUrl ?? 'https://amotpay-api.nexustechnologies.cloud';

let authToken: string | null = null;

export async function loadToken(): Promise<string | null> {
  authToken = await SecureStore.getItemAsync('amotpay_token');
  return authToken;
}

export async function saveToken(token: string): Promise<void> {
  authToken = token;
  await SecureStore.setItemAsync('amotpay_token', token);
}

export async function clearToken(): Promise<void> {
  authToken = null;
  await SecureStore.deleteItemAsync('amotpay_token');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  const text = await res.text();
  let json: { data?: T; error?: { message?: string }; message?: string } = {};
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error('Réponse invalide du serveur');
    }
  }

  if (!res.ok) {
    throw new Error(json.error?.message ?? json.message ?? `Erreur serveur (${res.status})`);
  }
  return (json.data ?? json) as T;
}

export const api = {
  register: (body: object) => request<{ token: string; user: User }>('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (phone: string, password: string) => request<{ token: string; user: User }>('/auth/login', { method: 'POST', body: JSON.stringify({ phone, password }) }),
  logout: () => request<void>('/auth/logout', { method: 'POST' }),
  me: () => request<User>('/me'),
  countries: () => request<Country[]>('/countries'),
  corridors: () => request<Corridor[]>('/corridors'),
  paymentMethods: (country: string, provider = 'MAGMA') =>
    request<PaymentMethod[]>(`/payment-methods?country=${encodeURIComponent(country)}&provider=${encodeURIComponent(provider)}`),
  checkBeneficiary: (body: BeneficiaryCheckRequest) =>
    request<BeneficiaryCheck>('/beneficiary/check', { method: 'POST', body: JSON.stringify(body) }),
  fiatQuote: (body: QuoteRequest) => request<FiatQuote>('/quote', { method: 'POST', body: JSON.stringify(body) }),
  createTransfer: (body: TransferRequest, idempotencyKey: string) =>
    request<Transfer>('/transfers', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'X-Idempotency-Key': idempotencyKey },
    }),
  transfers: () => request<Transfer[]>('/transfers'),
};

export type User = {
  id: number;
  first_name: string;
  last_name: string;
  phone: string;
  country_code: string;
  currency: string;
};

export type Country = {
  code: string;
  name: string;
  currency: string;
  phone_prefix: string;
};

export type Corridor = {
  destination_country: string;
  provider: string;
};

export type PaymentMethod = {
  provider_code: string;
  name: string;
  type: string;
  currency: string;
  min_amount: number;
  max_amount: number;
};

export type BeneficiaryCheckRequest = {
  phone_number: string;
  country_code: string;
  operator_code: string;
  payment_method: string;
  channel: string;
};

export type BeneficiaryCheck = Record<string, unknown>;

export type QuoteRequest = {
  destination_country: string;
  payment_method: string;
  amount: number;
};

export type TransferRequest = QuoteRequest & {
  recipient_phone: string;
  recipient_first_name: string;
  recipient_last_name: string;
  channel: string;
};

export type FiatQuote = {
  source_country: string;
  source_currency: string;
  destination_country: string;
  destination_currency: string;
  payment_method: string;
  source_amount: number;
  provider_fee: number;
  application_fee: number;
  exchange_rate: number;
  destination_amount: number;
  total_payable: number;
  provider: string;
  expires_at: string;
};

export type Transfer = FiatQuote & {
  id: number;
  reference: string;
  recipient_phone: string;
  recipient_first_name: string;
  recipient_last_name: string;
  provider_reference?: string | null;
  status: string;
  created_at: string;
  updated_at?: string;
};
