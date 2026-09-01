import { useEffect, useState } from 'react';
import { api } from '../api';
import { DataTable, EmptyState, LoadingState, PageHeader } from '../components/ui';

export function LedgerPage() {
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ items: Record<string, unknown>[] }>('/admin/ledger')
      .then((d) => setItems(d.items))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState label="Loading ledger…" />;

  return (
    <>
      <PageHeader title="Ledger" subtitle="Double-entry accounting — debits must equal credits." />

      {items.length === 0 ? (
        <EmptyState title="Ledger empty" description="Entries are created after transfer settlement." />
      ) : (
        <DataTable>
          <thead>
            <tr>
              <th>Reference</th>
              <th>Operation</th>
              <th>Account</th>
              <th>Type</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((e, i) => (
              <tr key={i}>
                <td>
                  <code>{String(e.reference)}</code>
                </td>
                <td>{String(e.operation_type)}</td>
                <td>
                  {String(e.account_type)}:{String(e.account_id)}
                </td>
                <td>{String(e.entry_type)}</td>
                <td>
                  <strong>
                    {String(e.amount)} {String(e.currency)}
                  </strong>
                </td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      )}
    </>
  );
}
