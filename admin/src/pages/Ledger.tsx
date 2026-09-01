import { useEffect, useState } from 'react';
import { api } from '../api';

export function LedgerPage() {
  const [items, setItems] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    api<{ items: Record<string, unknown>[] }>('/admin/ledger').then(d => setItems(d.items));
  }, []);

  return (
    <>
      <h1>Ledger</h1>
      <table className="card">
        <thead><tr><th>Ref</th><th>Op</th><th>Account</th><th>Type</th><th>Amount</th></tr></thead>
        <tbody>
          {items.map((e, i) => (
            <tr key={i}>
              <td>{String(e.reference)}</td>
              <td>{String(e.operation_type)}</td>
              <td>{String(e.account_type)}:{String(e.account_id)}</td>
              <td>{String(e.entry_type)}</td>
              <td>{String(e.amount)} {String(e.currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
