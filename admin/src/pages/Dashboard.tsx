import { useEffect, useState } from 'react';
import { api } from '../api';
import { Badge, Card, LoadingState, PageHeader, StatCard } from '../components/ui';

function providerTone(status: string): 'success' | 'warning' | 'error' | 'neutral' {
  const s = status.toLowerCase();
  if (s === 'connected' || s === 'configured') return 'success';
  if (s === 'unavailable' || s === 'not_configured') return 'warning';
  if (s === 'error') return 'error';
  return 'neutral';
}

export function DashboardPage() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    api<Record<string, unknown>>('/admin/dashboard').then(setData).catch(console.error);
  }, []);

  if (!data) return <LoadingState label="Loading dashboard…" />;

  const providers = (data.providers as Record<string, string>) ?? {};

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Real-time overview of platform operations and provider health."
      />

      <div className="stat-grid">
        <StatCard label="Transfers today" value={String(data.transactions_today ?? '—')} />
        <StatCard label="KYC pending" value={String(data.kyc_pending ?? '—')} tone="warning" />
        <StatCard
          label="Cashramp"
          value={<Badge tone={providerTone(providers.cashramp ?? '')}>{providers.cashramp ?? 'unknown'}</Badge>}
        />
        <StatCard
          label="Sumsub"
          value={<Badge tone={providerTone(providers.sumsub ?? '')}>{providers.sumsub ?? 'unknown'}</Badge>}
        />
      </div>

      <Card>
        <h2 style={{ margin: '0 0 0.75rem', fontSize: '1rem' }}>System snapshot</h2>
        <pre className="json-preview" style={{ borderRadius: 'var(--radius-md)', maxHeight: 280 }}>
          {JSON.stringify(data, null, 2)}
        </pre>
      </Card>
    </>
  );
}
