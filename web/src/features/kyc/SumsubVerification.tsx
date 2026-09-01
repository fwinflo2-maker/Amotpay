import { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import snsWebSdk from '@sumsub/websdk';
import { startKyc } from '../../api/kyc';
import { mapLangToSumsub } from '../../i18n/sumsubLang';

type SumsubInstance = {
  launch: (target: string | HTMLElement) => void;
  destroy?: () => void;
};

type Props = {
  onSubmitted?: () => void;
  onFatalError?: () => void;
};

const SUBMITTED_EVENTS = new Set([
  'idCheck.onApplicantSubmitted',
  'idCheck.applicantStatus',
  'onApplicantSubmitted',
]);

export function SumsubVerification({ onSubmitted, onFatalError }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sdkRef = useRef<SumsubInstance | null>(null);
  const bootingRef = useRef(false);
  const submittedRef = useRef(false);
  const { i18n } = useTranslation();

  const getNewAccessToken = useCallback(async (): Promise<string> => {
    const data = await startKyc();
    if (!data.access_token) {
      throw new Error('KYC_START_FAILED');
    }
    return data.access_token;
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      if (!containerRef.current || bootingRef.current || sdkRef.current) return;
      bootingRef.current = true;

      try {
        const accessToken = await getNewAccessToken();
        if (cancelled || !containerRef.current) return;

        const instance = snsWebSdk
          .init(accessToken, () => getNewAccessToken())
          .withConf({ lang: mapLangToSumsub(i18n.language) })
          .on('idCheck.onError', (error: unknown) => {
            console.error('Sumsub error', error);
          })
          .onMessage((type: string, payload: unknown) => {
            console.log('Sumsub event', type, payload);
            if (!submittedRef.current && SUBMITTED_EVENTS.has(type)) {
              submittedRef.current = true;
              onSubmitted?.();
            }
          })
          .build() as SumsubInstance;

        sdkRef.current = instance;
        instance.launch(containerRef.current);
      } catch (error) {
        console.error('KYC_START_FAILED', error);
        onFatalError?.();
      } finally {
        bootingRef.current = false;
      }
    }

    void boot();

    return () => {
      cancelled = true;
      bootingRef.current = false;
      submittedRef.current = false;
      const instance = sdkRef.current;
      if (instance?.destroy) {
        try {
          instance.destroy();
        } catch {
          /* ignore cleanup errors */
        }
      }
      sdkRef.current = null;
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [getNewAccessToken, i18n.language, onSubmitted, onFatalError]);

  return <div ref={containerRef} className="sumsub-container" aria-label="Identity verification" />;
}
