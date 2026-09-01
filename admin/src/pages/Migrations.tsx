import { useEffect, useState } from 'react';
import { api } from '../api';
import { Alert, Badge, Button, Card, DataTable, LoadingState, PageHeader } from '../components/ui';

type MigrationRow = {
  status: string;
  applied_at: string | null;
};

type MigrationStatus = {
  migrations: Record<string, MigrationRow>;
  tables: { present: string[]; missing: string[] };
  ready: boolean;
  note?: string;
};

export function MigrationsPage() {
  const [data, setData] = useState<MigrationStatus | null>(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    setData(await api<MigrationStatus>('/admin/migrations'));
  }

  useEffect(() => {
    load().catch((e) => setMsg((e as Error).message));
  }, []);

  async function apply() {
    setBusy(true);
    setMsg('');
    try {
      const result = await api<{ applied: string[]; status: MigrationStatus }>('/admin/migrations/apply', {
        method: 'POST',
        body: '{}',
      });
      setData(result.status);
      setMsg(result.applied.length ? `Applied: ${result.applied.join(', ')}` : 'No pending migrations.');
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!data) return <LoadingState label="Loading migrations…" />;

  return (
    <>
      <PageHeader
        title="Migrations"
        subtitle="Database schema status for AMOTPay API 2.2+"
        actions={<Button onClick={apply} disabled={busy}>{busy ? 'Applying…' : 'Apply pending'}</Button>}
      />

      {msg ? <Alert tone="info">{msg}</Alert> : null}

      <Card style={{ marginBottom: '1rem' }}>
        <Badge tone={data.ready ? 'success' : 'warning'}>{data.ready ? 'READY' : 'PENDING'}</Badge>
        {data.note ? <p style={{ marginTop: '0.75rem' }}>{data.note}</p> : null}
      </Card>

      <DataTable>
        <thead>
          <tr>
            <th>Migration</th>
            <th>Status</th>
            <th>Applied at</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(data.migrations).map(([name, row]) => (
            <tr key={name}>
              <td>{name}</td>
              <td>
                <Badge tone={row.status === 'APPLIED' ? 'success' : 'warning'}>{row.status}</Badge>
              </td>
              <td>{row.applied_at ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </DataTable>

      {data.tables.missing.length > 0 ? (
        <Alert tone="error">Missing tables: {data.tables.missing.join(', ')}</Alert>
      ) : null}
    </>
  );
}
