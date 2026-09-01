import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

export const API_URL =
  Constants.expoConfig?.extra?.apiUrl ?? 'https://amotpay-api.nexustechnologies.cloud';

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

export type ApiErrorCode =
  | 'NETWORK'
  | 'AUTH'
  | 'KYC_REQUIRED'
  | 'FEATURE_UNAVAILABLE'
  | 'PROVIDER_UNAVAILABLE'
  | 'PROVIDER_NOT_CONFIGURED'
  | 'QUOTE_EXPIRED'
  | 'LIMIT_EXCEEDED'
  | 'TRANSACTION_FAILED'
  | 'TRANSFER_NOT_ELIGIBLE'
  | 'CUSTOMER_NOT_READY'
  | 'UNKNOWN';

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly requestId?: string;

  constructor(message: string, code: ApiErrorCode, status = 0, requestId?: string) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.requestId = requestId;
  }
}

function mapError(status: number, serverCode?: string, message?: string): ApiError {
  const msg = message ?? 'Request failed';
  if (status === 401) return new ApiError(msg, 'AUTH', status);
  if (serverCode === 'KYC_NOT_CONFIGURED' || serverCode === 'KYC_REQUIRED') {
    return new ApiError(msg, 'KYC_REQUIRED', status);
  }
  if (serverCode === 'FEATURE_DISABLED' || serverCode === 'NOT_AVAILABLE') {
    return new ApiError(msg, 'FEATURE_UNAVAILABLE', status);
  }
  if (serverCode === 'PROVIDER_UNAVAILABLE' || status === 503) {
    return new ApiError(msg, 'PROVIDER_UNAVAILABLE', status);
  }
  if (serverCode === 'PROVIDER_NOT_CONFIGURED') {
    return new ApiError(msg, 'PROVIDER_NOT_CONFIGURED', status);
  }
  if (serverCode === 'TRANSFER_NOT_ELIGIBLE') {
    return new ApiError(msg, 'TRANSFER_NOT_ELIGIBLE', status);
  }
  if (serverCode === 'CUSTOMER_NOT_READY') {
    return new ApiError(msg, 'CUSTOMER_NOT_READY', status);
  }
  if (serverCode === 'QUOTE_EXPIRED') return new ApiError(msg, 'QUOTE_EXPIRED', status);
  if (serverCode === 'LIMIT_EXCEEDED') return new ApiError(msg, 'LIMIT_EXCEEDED', status);
  if (status >= 500) return new ApiError(msg, 'PROVIDER_UNAVAILABLE', status);
  return new ApiError(msg, 'UNKNOWN', status);
}

type Envelope<T> = {
  success?: boolean;
  data?: T;
  error?: { message?: string; code?: string; request_id?: string };
  message?: string;
};

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  const normalized = path.startsWith('/api') ? path : `/api${path}`;

  let res: Response;
  try {
    res = await fetch(`${API_URL}${normalized}`, { ...options, headers });
  } catch {
    throw new ApiError('Network unavailable', 'NETWORK');
  }

  const text = await res.text();
  let json: Envelope<T> = {};
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      throw new ApiError('Invalid server response', 'UNKNOWN', res.status);
    }
  }

  if (!res.ok || json.success === false) {
    throw mapError(
      res.status,
      json.error?.code,
      json.error?.message ?? json.message,
    );
  }

  return (json.data ?? json) as T;
}
