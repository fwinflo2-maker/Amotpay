import { useEffect, useState } from 'react';
import { api } from '../api';

export function ReconciliationPage() {
  const [items, setItems] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    api<{ items: Record<string, unknown>[] }>('/admin/reconciliation').then(d => setItems(d.items));
  }, []);

  return (
    <>
      <h1>Reconciliation</h1>
      <table className="card">
        <thead><tr><th>Transfer</th><th>Provider ref</th><th>Status</th><th>At</th></tr></thead>
        <tbody>
          {items.map((r, i) => (
            <tr key={i}>
              <td>{String(r.transfer_order_id ?? '—')}</td>
              <td>{String(r.provider_reference ?? '—')}</td>
              <td>{String(r.status)}</td>
              <td className="muted">{String(r.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
