import { api } from './client';

export type KycState =
  | 'NOT_STARTED'
  | 'PENDING'
  | 'IN_REVIEW'
  | 'VERIFIED'
  | 'REJECTED'
  | 'RETRY_REQUIRED'
  | 'EXPIRED'
  | 'SUSPENDED';

export type KycStatusResponse = {
  status: KycState;
  verified: boolean;
  display_status: string;
  action_required: boolean;
};

export type KycStartResponse = {
  access_token: string;
  status: KycState;
  level_name?: string;
};

export function getKycStatus() {
  return api<KycStatusResponse>('/kyc/status');
}

export function startKyc() {
  return api<KycStartResponse>('/kyc/start', { method: 'POST' });
}
