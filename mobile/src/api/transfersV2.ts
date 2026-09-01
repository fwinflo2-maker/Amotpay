import { request } from './http';

export type V2Quote = {
  you_send: { amount: string; currency: string };
  recipient_gets: { amount: string; currency: string };
  fee: { provider: string | null; platform: string | null; total: string | null; currency: string };
  exchange_rate: string;
  expires_at: string;
  quote_id: string;
  provider: string;
};

export type V2Transfer = {
  reference: string;
  status: string;
  provider: string;
  ledger_reference?: string | null;
};

export type V2QuoteRequest = {
  source_amount: number;
  source_currency: string;
  destination_country: string;
  destination_currency: string;
  payment_method: string;
  payout_method?: string;
};

export type V2TransferRequest = {
  quote_id: string;
  quote_ref?: string;
  payout_method?: string;
  recipient: {
    phone: string;
    first_name: string;
    last_name: string;
    country_code?: string;
  };
};

export const transfersV2Api = {
  quote: (body: V2QuoteRequest) =>
    request<V2Quote>('/v2/quote', { method: 'POST', body: JSON.stringify(body) }),
  create: (body: V2TransferRequest, idempotencyKey: string) =>
    request<V2Transfer>('/v2/transfers', {
      method: 'POST',
      body: JSON.stringify({ ...body, quote_ref: body.quote_id }),
      headers: { 'X-Idempotency-Key': idempotencyKey },
    }),
};
