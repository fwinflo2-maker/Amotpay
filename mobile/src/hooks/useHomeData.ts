import { useCallback, useEffect, useState } from 'react';
import { api, ApiError, isFeatureAvailable } from '../api';
import type { Eligibility, KycStatus, Transfer, Wallet } from '../api/types';

export type HomeData = {
  eligibility: Eligibility | null;
  kyc: KycStatus | null;
  wallets: Wallet[];
  transfers: Transfer[];
  loading: boolean;
  error: ApiError | null;
  offline: boolean;
};

export function useHomeData() {
  const [data, setData] = useState<HomeData>({
    eligibility: null,
    kyc: null,
    wallets: [],
    transfers: [],
    loading: true,
    error: null,
    offline: false,
  });

  const load = useCallback(async () => {
    setData((d) => ({ ...d, loading: true, error: null, offline: false }));
    try {
      const [eligibility, kyc, wallets, transfers] = await Promise.all([
        api.eligibility(),
        api.kycStatus(),
        api.wallets().catch(() => [] as Wallet[]),
        api.transfers().catch(() => [] as Transfer[]),
      ]);
      setData({ eligibility, kyc, wallets, transfers, loading: false, error: null, offline: false });
    } catch (e) {
      const err = e instanceof ApiError ? e : new ApiError('Unknown error', 'UNKNOWN');
      setData((d) => ({
        ...d,
        loading: false,
        error: err,
        offline: err.code === 'NETWORK',
      }));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const cryptoAvailable = data.eligibility ? isFeatureAvailable(data.eligibility.features.crypto) : false;
  const digitalTotal = data.wallets.reduce((sum, w) => sum + Number(w.available_balance || 0), 0);
  const hasDigital = cryptoAvailable && data.wallets.length > 0 && digitalTotal > 0;
  const showKycBanner = data.kyc && !data.kyc.verified && data.kyc.action_required;

  return { ...data, reload: load, cryptoAvailable, digitalTotal, hasDigital, showKycBanner };
}
