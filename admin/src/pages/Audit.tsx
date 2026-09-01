import { useEffect, useState } from 'react';
import { api } from '../api';

export function AuditPage() {
  const [items, setItems] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    api<{ items: Record<string, unknown>[] }>('/admin/audits').then(d => setItems(d.items));
  }, []);

  return (
    <>
      <h1>Audit logs</h1>
      <table className="card">
        <thead><tr><th>Action</th><th>Resource</th><th>IP</th><th>At</th></tr></thead>
        <tbody>
          {items.map((a) => (
            <tr key={String(a.id)}>
              <td>{String(a.action)}</td>
              <td>{String(a.resource_type)}:{String(a.resource_id ?? '—')}</td>
              <td className="muted">{String(a.ip_address)}</td>
              <td className="muted">{String(a.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
