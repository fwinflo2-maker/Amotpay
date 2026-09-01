import { useEffect, useState } from 'react';
import { api } from '../api';
import { DataTable, EmptyState, LoadingState, PageHeader } from '../components/ui';

export function AuditPage() {
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ items: Record<string, unknown>[] }>('/admin/audits')
      .then((d) => setItems(d.items))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState label="Loading audit logs…" />;

  return (
    <>
      <PageHeader title="Audit" subtitle="Immutable log of admin actions and security events." />

      {items.length === 0 ? (
        <EmptyState title="No audit entries" description="Admin actions will be recorded here automatically." />
      ) : (
        <DataTable>
          <thead>
            <tr>
              <th>Action</th>
              <th>Resource</th>
              <th>IP</th>
              <th>At</th>
            </tr>
          </thead>
          <tbody>
            {items.map((a) => (
              <tr key={String(a.id)}>
                <td>
                  <strong>{String(a.action)}</strong>
                </td>
                <td>
                  {String(a.resource_type)}:{String(a.resource_id ?? '—')}
                </td>
                <td className="muted">
                  <code>{String(a.ip_address)}</code>
                </td>
                <td className="muted">{String(a.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      )}
    </>
  );
}
