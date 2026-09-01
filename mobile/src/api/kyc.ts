import { request } from './http';
import type { KycStart, KycStatus } from './types';

export const kycApi = {
  status: () => request<KycStatus>('/kyc/status'),
  start: () => request<KycStart>('/kyc/start', { method: 'POST' }),
};
