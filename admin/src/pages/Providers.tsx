import { useEffect, useState } from 'react';
import { api } from '../api';

type ProviderCard = {
  configured?: boolean;
  status?: string;
  credentials?: Record<string, { configured: boolean; masked: string | null }>;
};

type Overview = {
  app_url?: string;
  webhooks?: Record<string, string>;
  cashramp?: ProviderCard;
  sumsub?: ProviderCard;
};

export function ProvidersPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [msg, setMsg] = useState('');
  const [cashrampForm, setCashrampForm] = useState({
    CASHRAMP_API_URL: 'https://staging.api.useaccrue.com/cashramp/api/graphql',
    CASHRAMP_PUBLIC_KEY: '',
    CASHRAMP_SECRET_KEY: '',
    CASHRAMP_WEBHOOK_SECRET: '',
    CASHRAMP_ENVIRONMENT: 'sandbox',
  });
  const [sumsubForm, setSumsubForm] = useState({
    SUMSUB_BASE_URL: 'https://api.sumsub.com',
    SUMSUB_APP_TOKEN: '',
    SUMSUB_SECRET_KEY: '',
    SUMSUB_WEBHOOK_SECRET: '',
    SUMSUB_LEVEL_NAME: 'id-and-liveness',
  });

  async function load() {
    setData(await api<Overview>('/admin/providers/overview'));
  }

  useEffect(() => {
    load();
  }, []);

  async function test(provider: string) {
    setMsg('');
    try {
      const r = await api<{ status: string; latency_ms: number }>(
        `/admin/providers/${provider.toLowerCase()}/test`,
        { method: 'POST', body: '{}' },
      );
      setMsg(`${provider}: ${r.status} (${r.latency_ms}ms)`);
      load();
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  async function save(provider: 'cashramp' | 'sumsub') {
    setMsg('');
    try {
      const body = provider === 'cashramp' ? cashrampForm : sumsubForm;
      await api(`/admin/providers/${provider}`, { method: 'PUT', body: JSON.stringify(body) });
      setMsg(`${provider} credentials saved (encrypted server-side)`);
      if (provider === 'cashramp') {
        setCashrampForm((f) => ({ ...f, CASHRAMP_SECRET_KEY: '', CASHRAMP_WEBHOOK_SECRET: '' }));
      } else {
        setSumsubForm((f) => ({ ...f, SUMSUB_SECRET_KEY: '', SUMSUB_WEBHOOK_SECRET: '', SUMSUB_APP_TOKEN: '' }));
      }
      load();
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  async function sync() {
    setMsg('');
    try {
      const r = await api('/admin/capabilities/sync', { method: 'POST', body: '{}' });
      setMsg('Sync: ' + JSON.stringify(r));
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  function renderMasked(card?: ProviderCard) {
    if (!card?.credentials) return null;
    return (
      <ul>
        {Object.entries(card.credentials).map(([key, val]) => (
          <li key={key}>
            <code>{key}</code>: {val.configured ? val.masked ?? '••••' : 'not set'}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <>
      <h1>Providers</h1>
      {msg && <p className="card">{msg}</p>}

      {data?.webhooks && (
        <div className="card">
          <h2>Webhooks</h2>
          <ul>
            {Object.entries(data.webhooks).map(([k, v]) => (
              <li key={k}>
                <strong>{k}</strong>: <code>{v}</code>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="row">
        <button onClick={() => test('cashramp')}>Test Cashramp</button>
        <button onClick={() => test('sumsub')}>Test Sumsub</button>
        <button onClick={sync}>Sync capabilities</button>
      </div>

      <div className="card">
        <h2>Cashramp — {data?.cashramp?.status ?? 'unknown'}</h2>
        {renderMasked(data?.cashramp ?? undefined)}
        <label>
          Public key
          <input
            value={cashrampForm.CASHRAMP_PUBLIC_KEY}
            onChange={(e) => setCashrampForm({ ...cashrampForm, CASHRAMP_PUBLIC_KEY: e.target.value })}
          />
        </label>
        <label>
          Secret key
          <input
            type="password"
            value={cashrampForm.CASHRAMP_SECRET_KEY}
            onChange={(e) => setCashrampForm({ ...cashrampForm, CASHRAMP_SECRET_KEY: e.target.value })}
          />
        </label>
        <label>
          Webhook secret
          <input
            type="password"
            value={cashrampForm.CASHRAMP_WEBHOOK_SECRET}
            onChange={(e) => setCashrampForm({ ...cashrampForm, CASHRAMP_WEBHOOK_SECRET: e.target.value })}
          />
        </label>
        <button onClick={() => save('cashramp')}>Save Cashramp</button>
      </div>

      <div className="card">
        <h2>Sumsub — {data?.sumsub?.status ?? 'unknown'}</h2>
        {renderMasked(data?.sumsub ?? undefined)}
        <label>
          App token
          <input
            type="password"
            value={sumsubForm.SUMSUB_APP_TOKEN}
            onChange={(e) => setSumsubForm({ ...sumsubForm, SUMSUB_APP_TOKEN: e.target.value })}
          />
        </label>
        <label>
          Secret key
          <input
            type="password"
            value={sumsubForm.SUMSUB_SECRET_KEY}
            onChange={(e) => setSumsubForm({ ...sumsubForm, SUMSUB_SECRET_KEY: e.target.value })}
          />
        </label>
        <label>
          Webhook secret
          <input
            type="password"
            value={sumsubForm.SUMSUB_WEBHOOK_SECRET}
            onChange={(e) => setSumsubForm({ ...sumsubForm, SUMSUB_WEBHOOK_SECRET: e.target.value })}
          />
        </label>
        <button onClick={() => save('sumsub')}>Save Sumsub</button>
      </div>
    </>
  );
}
