import { useEffect, useState } from 'react';
import { api } from '../api';
import {
  Alert,
  Badge,
  Button,
  Card,
  DataTable,
  EmptyState,
  Field,
  LoadingState,
  PageHeader,
} from '../components/ui';

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

function statusTone(status?: string): 'success' | 'warning' | 'error' | 'neutral' {
  const s = (status ?? '').toLowerCase();
  if (s === 'connected') return 'success';
  if (s === 'unavailable' || s === 'not_configured') return 'warning';
  if (s === 'error') return 'error';
  return 'neutral';
}

export function ProvidersPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [msg, setMsg] = useState('');
  const [msgTone, setMsgTone] = useState<'info' | 'success' | 'error'>('info');
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
      setMsgTone(r.status === 'CONNECTED' ? 'success' : 'info');
      setMsg(`${provider}: ${r.status} (${r.latency_ms}ms)`);
      load();
    } catch (e) {
      setMsgTone('error');
      setMsg((e as Error).message);
    }
  }

  async function save(provider: 'cashramp' | 'sumsub') {
    setMsg('');
    try {
      const body = provider === 'cashramp' ? cashrampForm : sumsubForm;
      await api(`/admin/providers/${provider}`, { method: 'PUT', body: JSON.stringify(body) });
      setMsgTone('success');
      setMsg(`${provider} credentials saved (encrypted server-side)`);
      if (provider === 'cashramp') {
        setCashrampForm((f) => ({ ...f, CASHRAMP_SECRET_KEY: '', CASHRAMP_WEBHOOK_SECRET: '' }));
      } else {
        setSumsubForm((f) => ({ ...f, SUMSUB_SECRET_KEY: '', SUMSUB_WEBHOOK_SECRET: '', SUMSUB_APP_TOKEN: '' }));
      }
      load();
    } catch (e) {
      setMsgTone('error');
      setMsg((e as Error).message);
    }
  }

  async function sync() {
    setMsg('');
    try {
      const r = await api('/admin/capabilities/sync', { method: 'POST', body: '{}' });
      setMsgTone('success');
      setMsg('Capabilities synced: ' + JSON.stringify(r));
    } catch (e) {
      setMsgTone('error');
      setMsg((e as Error).message);
    }
  }

  function renderMasked(card?: ProviderCard) {
    if (!card?.credentials) return null;
    return (
      <ul className="credential-list">
        {Object.entries(card.credentials).map(([key, val]) => (
          <li key={key}>
            <code>{key}</code>
            <span>{val.configured ? val.masked ?? '••••' : 'not set'}</span>
          </li>
        ))}
      </ul>
    );
  }

  if (!data) return <LoadingState label="Loading providers…" />;

  return (
    <>
      <PageHeader
        title="Providers"
        subtitle="Configure Cashramp and Sumsub sandbox credentials. Secrets are encrypted server-side."
        actions={
          <>
            <Button variant="secondary" onClick={() => test('cashramp')}>Test Cashramp</Button>
            <Button variant="secondary" onClick={() => test('sumsub')}>Test Sumsub</Button>
            <Button onClick={sync}>Sync capabilities</Button>
          </>
        }
      />

      {msg && <Alert tone={msgTone === 'error' ? 'error' : msgTone === 'success' ? 'success' : 'info'}>{msg}</Alert>}

      {data.webhooks && (
        <Card className="provider-card" style={{ marginBottom: '1.25rem' }}>
          <h2>Webhook endpoints</h2>
          <ul className="credential-list">
            {Object.entries(data.webhooks).map(([k, v]) => (
              <li key={k}>
                <strong>{k}</strong>
                <code>{v}</code>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="provider-grid">
        <Card className="provider-card">
          <h2>
            Cashramp
            <Badge tone={statusTone(data.cashramp?.status)}>{data.cashramp?.status ?? 'unknown'}</Badge>
          </h2>
          {renderMasked(data.cashramp)}
          <Field label="Public key">
            <input
              value={cashrampForm.CASHRAMP_PUBLIC_KEY}
              onChange={(e) => setCashrampForm({ ...cashrampForm, CASHRAMP_PUBLIC_KEY: e.target.value })}
            />
          </Field>
          <Field label="Secret key" hint="Never stored in the browser after save">
            <input
              type="password"
              value={cashrampForm.CASHRAMP_SECRET_KEY}
              onChange={(e) => setCashrampForm({ ...cashrampForm, CASHRAMP_SECRET_KEY: e.target.value })}
            />
          </Field>
          <Field label="Webhook secret">
            <input
              type="password"
              value={cashrampForm.CASHRAMP_WEBHOOK_SECRET}
              onChange={(e) => setCashrampForm({ ...cashrampForm, CASHRAMP_WEBHOOK_SECRET: e.target.value })}
            />
          </Field>
          <Button onClick={() => save('cashramp')}>Save Cashramp</Button>
        </Card>

        <Card className="provider-card">
          <h2>
            Sumsub
            <Badge tone={statusTone(data.sumsub?.status)}>{data.sumsub?.status ?? 'unknown'}</Badge>
          </h2>
          {renderMasked(data.sumsub)}
          <Field label="App token">
            <input
              type="password"
              value={sumsubForm.SUMSUB_APP_TOKEN}
              onChange={(e) => setSumsubForm({ ...sumsubForm, SUMSUB_APP_TOKEN: e.target.value })}
            />
          </Field>
          <Field label="Secret key">
            <input
              type="password"
              value={sumsubForm.SUMSUB_SECRET_KEY}
              onChange={(e) => setSumsubForm({ ...sumsubForm, SUMSUB_SECRET_KEY: e.target.value })}
            />
          </Field>
          <Field label="Webhook secret">
            <input
              type="password"
              value={sumsubForm.SUMSUB_WEBHOOK_SECRET}
              onChange={(e) => setSumsubForm({ ...sumsubForm, SUMSUB_WEBHOOK_SECRET: e.target.value })}
            />
          </Field>
          <Button onClick={() => save('sumsub')}>Save Sumsub</Button>
        </Card>
      </div>
    </>
  );
}
