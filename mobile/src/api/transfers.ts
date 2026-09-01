import { request } from './http';
import type {
  BeneficiaryCheck,
  BeneficiaryCheckRequest,
  Corridor,
  Country,
  FiatQuote,
  PaymentMethod,
  QuoteRequest,
  Transfer,
  TransferRequest,
} from './types';

export const transfersApi = {
  countries: () => request<Country[]>('/countries'),
  corridors: () => request<Corridor[]>('/corridors'),
  paymentMethods: (country: string, provider = 'CASHRAMP') =>
    request<PaymentMethod[]>(
      `/payment-methods?country=${encodeURIComponent(country)}&provider=${encodeURIComponent(provider)}`,
    ),
  checkBeneficiary: (body: BeneficiaryCheckRequest) =>
    request<BeneficiaryCheck>('/beneficiary/check', { method: 'POST', body: JSON.stringify(body) }),
  fiatQuote: (body: QuoteRequest) =>
    request<FiatQuote>('/quote', { method: 'POST', body: JSON.stringify(body) }),
  createTransfer: (body: TransferRequest, idempotencyKey: string) =>
    request<Transfer>('/transfers', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'X-Idempotency-Key': idempotencyKey },
    }),
  list: () => request<Transfer[]>('/transfers'),
};
