export type User = {
  id: number;
  first_name: string;
  last_name: string;
  phone: string;
  country_code: string;
  currency: string;
  kyc_status?: string;
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

export type KycState =
  | 'NOT_STARTED'
  | 'PENDING'
  | 'IN_REVIEW'
  | 'VERIFIED'
  | 'REJECTED'
  | 'RETRY_REQUIRED'
  | 'EXPIRED'
  | 'SUSPENDED';

export type KycStatus = {
  status: KycState;
  verified: boolean;
  display_status: string;
  action_required: boolean;
};

export type KycStart = {
  access_token: string;
  status: KycState;
  level_name?: string;
};

export type FeatureEligibility = {
  status: string;
  reason: string | null;
  capability?: Record<string, unknown>;
};

export type Eligibility = {
  kyc_status: KycState;
  kyc_verified: boolean;
  country_code: string;
  features: {
    international_transfer: FeatureEligibility;
    crypto: FeatureEligibility;
    usd_account: FeatureEligibility;
    eur_account: FeatureEligibility;
    virtual_card: FeatureEligibility;
    onchain_withdrawal: FeatureEligibility;
  };
};

export type Wallet = {
  asset: string;
  network: string;
  address: string | null;
  balance: string | number;
  available_balance: string | number;
  pending_balance: string | number;
  status: string;
};
