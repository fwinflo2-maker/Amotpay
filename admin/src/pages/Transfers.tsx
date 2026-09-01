import { useEffect, useState } from 'react';
import { api } from '../api';

export function TransfersPage() {
  const [items, setItems] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    api<{ items: Record<string, unknown>[] }>('/admin/transfers/v2').then(d => setItems(d.items));
  }, []);

  return (
    <>
      <h1>Transfers (v2)</h1>
      <table className="card">
        <thead><tr><th>Ref</th><th>User</th><th>Amount</th><th>Status</th><th>Provider ref</th></tr></thead>
        <tbody>
          {items.map((t) => (
            <tr key={String(t.reference)}>
              <td>{String(t.reference)}</td>
              <td>{String(t.user_id)}</td>
              <td>{String(t.source_amount)} {String(t.source_currency)}</td>
              <td>{String(t.status)}</td>
              <td className="muted">{String(t.provider_reference ?? '—')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
