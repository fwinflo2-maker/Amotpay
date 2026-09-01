import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getKycStatus, type KycState, type KycStatusResponse } from '../api/kyc';
import { SumsubVerification } from '../features/kyc/SumsubVerification';
import { LanguageSwitcher } from '../components/LanguageSwitcher';

type View = 'loading' | 'intro' | 'sdk' | 'submitted' | 'verified' | 'rejected' | 'blocked' | 'error';

function resolveView(status: KycState, sdkActive: boolean, submittedLocally: boolean): View {
  if (sdkActive) return 'sdk';
  if (status === 'VERIFIED') return 'verified';
  if (status === 'REJECTED' || status === 'RETRY_REQUIRED') return 'rejected';
  if (status === 'SUSPENDED') return 'blocked';
  if (status === 'EXPIRED') return 'intro';
  if (submittedLocally || status === 'PENDING' || status === 'IN_REVIEW') return 'submitted';
  return 'intro';
}

function needsNewVerification(status: KycState): boolean {
  return ['NOT_STARTED', 'RETRY_REQUIRED', 'REJECTED', 'EXPIRED'].includes(status);
}

export function VerificationPage() {
  const { t } = useTranslation();
  const [kyc, setKyc] = useState<KycStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [sdkActive, setSdkActive] = useState(false);
  const [submittedLocally, setSubmittedLocally] = useState(false);
  const [startError, setStartError] = useState(false);

  const refreshStatus = useCallback(async () => {
    try {
      const data = await getKycStatus();
      setKyc(data);
      if (data.status === 'VERIFIED') {
        setSubmittedLocally(false);
        setSdkActive(false);
      }
    } catch {
      setStartError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  useEffect(() => {
    if (!submittedLocally && kyc?.status !== 'PENDING' && kyc?.status !== 'IN_REVIEW') return;
    const id = window.setInterval(() => {
      void refreshStatus();
    }, 8000);
    return () => window.clearInterval(id);
  }, [submittedLocally, kyc?.status, refreshStatus]);

  const handleStart = () => {
    setStartError(false);
    setSdkActive(true);
  };

  const handleSubmitted = () => {
    setSubmittedLocally(true);
    setSdkActive(false);
    void refreshStatus();
  };

  const handleSdkError = () => {
    setSdkActive(false);
    setStartError(true);
  };

  if (loading && !kyc) {
    return (
      <div className="verification-page">
        <div className="card premium-card loading-card">
          <div className="spinner" aria-hidden />
        </div>
      </div>
    );
  }

  const status = kyc?.status ?? 'NOT_STARTED';
  const view = startError ? 'error' : resolveView(status, sdkActive, submittedLocally);

  return (
    <div className="verification-page">
      <header className="verification-header">
        <span className="brand-mark">{t('brand')}</span>
        <LanguageSwitcher />
      </header>

      {view === 'intro' && (
        <section className="card premium-card">
          <p className="eyebrow">KYC</p>
          <h1>{t('verification.title')}</h1>
          <p className="lede">{t('verification.subtitle')}</p>
          <div className="checklist">
            <p className="checklist-title">{t('verification.needTitle')}</p>
            <ul>
              <li>{t('verification.needDoc')}</li>
              <li>{t('verification.needCamera')}</li>
              <li>{t('verification.needTime')}</li>
            </ul>
          </div>
          <p className="secure-note">{t('verification.secure')}</p>
          {needsNewVerification(status) && (
            <button type="button" className="primary-btn" onClick={handleStart}>
              {t('verification.start')}
            </button>
          )}
        </section>
      )}

      {view === 'sdk' && (
        <section className="card premium-card sdk-card">
          <SumsubVerification onSubmitted={handleSubmitted} onFatalError={handleSdkError} />
        </section>
      )}

      {view === 'submitted' && (
        <section className="card premium-card status-card">
          <div className="status-icon pending" aria-hidden />
          <h1>{t('verification.submittedTitle')}</h1>
          <p>{t('verification.submittedBody')}</p>
        </section>
      )}

      {view === 'verified' && (
        <section className="card premium-card status-card">
          <div className="status-icon success" aria-hidden />
          <h1>{t('verification.verifiedTitle')}</h1>
          <p>{t('verification.verifiedBody')}</p>
        </section>
      )}

      {view === 'rejected' && (
        <section className="card premium-card status-card">
          <div className="status-icon error" aria-hidden />
          <h1>{t('verification.rejectedTitle')}</h1>
          <p>{t('verification.rejectedBody')}</p>
          <button type="button" className="primary-btn" onClick={handleStart}>
            {t('verification.retry')}
          </button>
        </section>
      )}

      {view === 'blocked' && (
        <section className="card premium-card status-card">
          <h1>{t('verification.suspended')}</h1>
        </section>
      )}

      {view === 'error' && (
        <section className="card premium-card status-card">
          <div className="status-icon error" aria-hidden />
          <h1>{t('verification.errorTitle')}</h1>
          <p>{t('verification.errorBody')}</p>
          <button type="button" className="primary-btn" onClick={() => { setStartError(false); handleStart(); }}>
            {t('verification.retry')}
          </button>
        </section>
      )}
    </div>
  );
}
