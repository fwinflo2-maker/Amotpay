import { useEffect, useState } from 'react';
import { api } from '../api';
import { Badge, DataTable, EmptyState, LoadingState, PageHeader } from '../components/ui';

export function CapabilitiesPage() {
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ items: Record<string, unknown>[] }>('/admin/capabilities')
      .then((d) => setItems(d.items))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState label="Loading capabilities…" />;

  return (
    <>
      <PageHeader
        title="Capabilities"
        subtitle="Cashramp-sourced corridors, currencies, and payment methods."
      />

      {items.length === 0 ? (
        <EmptyState title="No capabilities synced" description="Run a provider sync from the Providers page." />
      ) : (
        <DataTable>
          <thead>
            <tr>
              <th>Type</th>
              <th>Key</th>
              <th>Country</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map((c, i) => (
              <tr key={i}>
                <td>{String(c.capability_type)}</td>
                <td>
                  <code>{String(c.capability_key)}</code>
                </td>
                <td>{String(c.country_code ?? '—')}</td>
                <td>
                  <Badge tone="success">{String(c.status)}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      )}
    </>
  );
}
