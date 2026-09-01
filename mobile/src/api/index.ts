import { authApi } from './auth';
import { eligibilityApi } from './eligibility';
import { kycApi } from './kyc';
import { transfersApi } from './transfers';
import { walletsApi } from './wallets';

export const api = {
  ...authApi,
  ...kycApi,
  ...eligibilityApi,
  ...transfersApi,
  ...walletsApi,
  // Legacy aliases used by SendScreen
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
export { authApi, kycApi, eligibilityApi, transfersApi, walletsApi };
export { isFeatureAvailable, isFeaturePending } from './eligibility';
