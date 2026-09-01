import { useEffect, useState } from 'react';
import { api } from '../api';

export function CapabilitiesPage() {
  const [items, setItems] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    api<{ items: Record<string, unknown>[] }>('/admin/capabilities').then(d => setItems(d.items));
  }, []);

  return (
    <>
      <h1>Capabilities</h1>
      <table className="card">
        <thead><tr><th>Type</th><th>Key</th><th>Country</th><th>Status</th></tr></thead>
        <tbody>
          {items.map((c, i) => (
            <tr key={i}>
              <td>{String(c.capability_type)}</td>
              <td>{String(c.capability_key)}</td>
              <td>{String(c.country_code ?? '—')}</td>
              <td>{String(c.status)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
