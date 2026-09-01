import { useEffect, useState } from 'react';
import { api } from '../api';
import { Badge, DataTable, EmptyState, LoadingState, PageHeader } from '../components/ui';

export function ReconciliationPage() {
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ items: Record<string, unknown>[] }>('/admin/reconciliation')
      .then((d) => setItems(d.items))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState label="Loading reconciliation…" />;

  return (
    <>
      <PageHeader
        title="Reconciliation"
        subtitle="Match AMOTPay transfers against Cashramp and ledger entries."
      />

      {items.length === 0 ? (
        <EmptyState title="Nothing to reconcile" description="Reconciliation runs after transfer completion." />
      ) : (
        <DataTable>
          <thead>
            <tr>
              <th>Transfer</th>
              <th>Status</th>
              <th>Cashramp</th>
              <th>Ledger</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {items.map((r, i) => (
              <tr key={i}>
                <td>
                  <code>{String(r.transfer_reference ?? r.reference ?? '—')}</code>
                </td>
                <td>
                  <Badge tone={String(r.status) === 'MATCHED' ? 'success' : 'warning'}>
                    {String(r.status ?? '—')}
                  </Badge>
                </td>
                <td className="muted">{String(r.cashramp_reference ?? '—')}</td>
                <td className="muted">{String(r.ledger_reference ?? '—')}</td>
                <td className="muted">{String(r.updated_at ?? '—')}</td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      )}
    </>
  );
}
