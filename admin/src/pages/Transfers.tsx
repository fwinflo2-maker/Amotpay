import { useEffect, useState } from 'react';
import { api } from '../api';
import { Badge, DataTable, EmptyState, LoadingState, PageHeader } from '../components/ui';

export function TransfersPage() {
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ items: Record<string, unknown>[] }>('/admin/transfers/v2')
      .then((d) => setItems(d.items))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState label="Loading transfers…" />;

  return (
    <>
      <PageHeader title="Transfers" subtitle="Universal send v2 — sandbox and production execution log." />

      {items.length === 0 ? (
        <EmptyState title="No transfers yet" description="Completed transfers will appear here with provider references." />
      ) : (
        <DataTable>
          <thead>
            <tr>
              <th>Reference</th>
              <th>User</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Provider ref</th>
            </tr>
          </thead>
          <tbody>
            {items.map((t) => (
              <tr key={String(t.reference)}>
                <td>
                  <code>{String(t.reference)}</code>
                </td>
                <td>{String(t.user_id)}</td>
                <td>
                  <strong>
                    {String(t.source_amount)} {String(t.source_currency)}
                  </strong>
                </td>
                <td>
                  <Badge tone="accent">{String(t.status)}</Badge>
                </td>
                <td className="muted">{String(t.provider_reference ?? '—')}</td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      )}
    </>
  );
}
