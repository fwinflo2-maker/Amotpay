import { request } from './http';
import type { Eligibility } from './types';

export const eligibilityApi = {
  get: () => request<Eligibility>('/eligibility'),
};

export function isFeatureAvailable(feature: { status: string }): boolean {
  return feature.status === 'AVAILABLE' || feature.status === 'LIMITED';
}

export function isFeaturePending(feature: { status: string }): boolean {
  return feature.status === 'PENDING_KYC' || feature.status === 'PENDING_PROVIDER';
}
