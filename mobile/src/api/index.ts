import { authApi } from './auth';
import { eligibilityApi } from './eligibility';
import { kycApi } from './kyc';
import { onboardingApi } from './onboarding';
import { transfersApi } from './transfers';
import { transfersV2Api } from './transfersV2';
import { walletsApi } from './wallets';

export const api = {
  ...authApi,
  ...kycApi,
  ...eligibilityApi,
  ...transfersApi,
  ...walletsApi,
  ...transfersV2Api,
  ...onboardingApi,
  countries: transfersApi.countries,
  corridors: transfersApi.corridors,
  paymentMethods: transfersApi.paymentMethods,
  checkBeneficiary: transfersApi.checkBeneficiary,
  fiatQuote: transfersApi.fiatQuote,
  createTransfer: transfersApi.createTransfer,
  transfers: transfersApi.list,
  eligibility: eligibilityApi.get,
  kycStatus: kycApi.status,
  kycStart: kycApi.start,
  wallets: walletsApi.list,
};

export * from './types';
export * from './http';
export * from './transfersV2';
export { authApi, kycApi, eligibilityApi, transfersApi, walletsApi, transfersV2Api, onboardingApi };
export { isFeatureAvailable, isFeaturePending } from './eligibility';
