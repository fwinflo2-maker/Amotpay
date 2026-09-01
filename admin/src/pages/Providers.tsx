import { useEffect, useState } from 'react';
import { api } from '../api';
import {
  Alert,
  Badge,
  Button,
  Card,
  Field,
  LoadingState,
  PageHeader,
  PasswordInput,
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

function WebhookBox({ label, url, hint }: { label: string; url: string; hint: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="webhook-box">
      <span className="webhook-box-label">{label}</span>
      <div className="webhook-url-row">
        <code>{url}</code>
        <Button variant="secondary" onClick={copy}>
          {copied ? 'Copié' : 'Copier'}
        </Button>
      </div>
      <p className="webhook-box-hint">{hint}</p>
    </div>
  );
}

function MaskedCredentials({ card }: { card?: ProviderCard }) {
  if (!card?.credentials) return null;
  const labels: Record<string, string> = {
    CASHRAMP_PUBLIC_KEY: 'Clé API',
    CASHRAMP_SECRET_KEY: 'Clé secrète',
    CASHRAMP_WEBHOOK_SECRET: 'Webhook token',
    CASHRAMP_API_URL: 'URL API',
    CASHRAMP_ENVIRONMENT: 'Environnement',
    SUMSUB_APP_TOKEN: 'App token',
    SUMSUB_SECRET_KEY: 'Clé secrète',
    SUMSUB_WEBHOOK_SECRET: 'Secret webhook',
    SUMSUB_BASE_URL: 'URL API',
    SUMSUB_LEVEL_NAME: 'Level',
  };

  return (
    <ul className="credential-list">
      {Object.entries(card.credentials).map(([key, val]) => (
        <li key={key}>
          <span>{labels[key] ?? key}</span>
          <code>{val.configured ? val.masked ?? '••••' : 'non configuré'}</code>
        </li>
      ))}
    </ul>
  );
}

export function ProvidersPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [msg, setMsg] = useState('');
  const [msgTone, setMsgTone] = useState<'info' | 'success' | 'error'>('info');
  const [cashrampForm, setCashrampForm] = useState({
    CASHRAMP_API_URL: 'https://api.useaccrue.com/cashramp/api/graphql',
    CASHRAMP_PUBLIC_KEY: '',
    CASHRAMP_SECRET_KEY: '',
    CASHRAMP_WEBHOOK_SECRET: '',
    CASHRAMP_ENVIRONMENT: 'production',
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
      const body =
        provider === 'cashramp'
          ? { ...cashrampForm, CASHRAMP_ENVIRONMENT: 'production' }
          : sumsubForm;
      await api(`/admin/providers/${provider}`, { method: 'PUT', body: JSON.stringify(body) });
      setMsgTone('success');
      setMsg(`${provider} : identifiants enregistrés (chiffrés côté serveur)`);
      if (provider === 'cashramp') {
        setCashrampForm((f) => ({ ...f, CASHRAMP_PUBLIC_KEY: '', CASHRAMP_SECRET_KEY: '', CASHRAMP_WEBHOOK_SECRET: '' }));
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
      setMsg('Capabilities synchronisées : ' + JSON.stringify(r));
    } catch (e) {
      setMsgTone('error');
      setMsg((e as Error).message);
    }
  }

  if (!data) return <LoadingState label="Chargement des providers…" />;

  const cashrampWebhook =
    data.webhooks?.cashramp ?? 'https://amotpay-api.nexustechnologies.cloud/api/webhooks/cashramp';
  const sumsubWebhook =
    data.webhooks?.sumsub ?? 'https://amotpay-api.nexustechnologies.cloud/api/webhooks/sumsub';

  return (
    <>
      <PageHeader
        title="Providers"
        subtitle="Configurez Cashramp (finance) et Sumsub (KYC). Les secrets ne sont jamais stockés en clair dans le navigateur."
        actions={
          <>
            <Button variant="secondary" onClick={() => test('cashramp')}>Tester Cashramp</Button>
            <Button variant="secondary" onClick={() => test('sumsub')}>Tester Sumsub</Button>
            <Button onClick={sync}>Sync capabilities</Button>
          </>
        }
      />

      {msg && <Alert tone={msgTone === 'error' ? 'error' : msgTone === 'success' ? 'success' : 'info'}>{msg}</Alert>}

      <div className="provider-grid">
        <Card className="provider-card">
          <h2>
            Cashramp
            <Badge tone={statusTone(data.cashramp?.status)}>{data.cashramp?.status ?? 'unknown'}</Badge>
          </h2>

          <WebhookBox
            label="URL webhook — à coller dans le dashboard Cashramp"
            url={cashrampWebhook}
            hint="Dans Cashramp : Settings → Webhooks → ajoutez cette URL. Utilisez le même « Webhook token » que dans le dashboard Cashramp."
          />

          <MaskedCredentials card={data.cashramp} />

          <Field label="URL API GraphQL" hint="Production : api.useaccrue.com">
            <input
              value={cashrampForm.CASHRAMP_API_URL}
              onChange={(e) => setCashrampForm({ ...cashrampForm, CASHRAMP_API_URL: e.target.value })}
            />
          </Field>
          <Field label="Clé API (Public key)" hint="Clé publique production Cashramp">
            <PasswordInput
              autoComplete="off"
              placeholder="Saisir la clé API"
              value={cashrampForm.CASHRAMP_PUBLIC_KEY}
              onChange={(e) => setCashrampForm({ ...cashrampForm, CASHRAMP_PUBLIC_KEY: e.target.value })}
            />
          </Field>
          <Field label="Clé secrète (Secret key)" hint="Jamais affichée après enregistrement">
            <PasswordInput
              autoComplete="off"
              placeholder="Saisir la clé secrète"
              value={cashrampForm.CASHRAMP_SECRET_KEY}
              onChange={(e) => setCashrampForm({ ...cashrampForm, CASHRAMP_SECRET_KEY: e.target.value })}
            />
          </Field>
          <Field label="Webhook token" hint="Token configuré dans Cashramp (Settings → Webhooks). Jamais affiché après enregistrement.">
            <PasswordInput
              autoComplete="off"
              placeholder="Webhook token Cashramp"
              value={cashrampForm.CASHRAMP_WEBHOOK_SECRET}
              onChange={(e) => setCashrampForm({ ...cashrampForm, CASHRAMP_WEBHOOK_SECRET: e.target.value })}
            />
          </Field>
          <p className="field-hint">Environnement : production</p>
          <Button onClick={() => save('cashramp')}>Enregistrer Cashramp</Button>
        </Card>

        <Card className="provider-card">
          <h2>
            Sumsub
            <Badge tone={statusTone(data.sumsub?.status)}>{data.sumsub?.status ?? 'unknown'}</Badge>
          </h2>

          <WebhookBox
            label="URL webhook — à coller dans le dashboard Sumsub"
            url={sumsubWebhook}
            hint="Dans Sumsub : Settings → Webhooks. Utilisez le même secret que le champ « Secret webhook » ci-dessous."
          />

          <MaskedCredentials card={data.sumsub} />

          <Field label="URL API">
            <input
              value={sumsubForm.SUMSUB_BASE_URL}
              onChange={(e) => setSumsubForm({ ...sumsubForm, SUMSUB_BASE_URL: e.target.value })}
            />
          </Field>
          <Field label="App token (clé API)">
            <PasswordInput
              autoComplete="off"
              placeholder="Token Sumsub"
              value={sumsubForm.SUMSUB_APP_TOKEN}
              onChange={(e) => setSumsubForm({ ...sumsubForm, SUMSUB_APP_TOKEN: e.target.value })}
            />
          </Field>
          <Field label="Clé secrète (Secret key)">
            <PasswordInput
              autoComplete="off"
              placeholder="Secret Sumsub"
              value={sumsubForm.SUMSUB_SECRET_KEY}
              onChange={(e) => setSumsubForm({ ...sumsubForm, SUMSUB_SECRET_KEY: e.target.value })}
            />
          </Field>
          <Field label="Secret webhook">
            <PasswordInput
              autoComplete="off"
              placeholder="Secret webhook Sumsub"
              value={sumsubForm.SUMSUB_WEBHOOK_SECRET}
              onChange={(e) => setSumsubForm({ ...sumsubForm, SUMSUB_WEBHOOK_SECRET: e.target.value })}
            />
          </Field>
          <Field label="Level KYC">
            <input
              value={sumsubForm.SUMSUB_LEVEL_NAME}
              onChange={(e) => setSumsubForm({ ...sumsubForm, SUMSUB_LEVEL_NAME: e.target.value })}
            />
          </Field>
          <Button onClick={() => save('sumsub')}>Enregistrer Sumsub</Button>
        </Card>
      </div>
    </>
  );
}
