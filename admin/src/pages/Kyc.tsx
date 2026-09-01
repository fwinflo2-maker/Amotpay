import { useEffect, useState } from 'react';
import { api } from '../api';
import { Badge, DataTable, EmptyState, LoadingState, PageHeader } from '../components/ui';

function kycTone(status: string): 'success' | 'warning' | 'error' | 'neutral' {
  const s = status.toLowerCase();
  if (s === 'verified' || s === 'approved') return 'success';
  if (s === 'pending' || s === 'in_review') return 'warning';
  if (s === 'rejected' || s === 'failed') return 'error';
  return 'neutral';
}

export function KycPage() {
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ items: Record<string, unknown>[] }>('/admin/kyc')
      .then((d) => setItems(d.items))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState label="Loading KYC records…" />;

  return (
    <>
      <PageHeader title="KYC" subtitle="Identity verification status across all users (Sumsub source of truth)." />

      {items.length === 0 ? (
        <EmptyState title="No KYC records yet" description="Applicants will appear here after onboarding." />
      ) : (
        <DataTable>
          <thead>
            <tr>
              <th>User</th>
              <th>Country</th>
              <th>Status</th>
              <th>Level</th>
              <th>Applicant ID</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {items.map((u) => (
              <tr key={String(u.id)}>
                <td>
                  <strong>
                    {String(u.first_name)} {String(u.last_name)}
                  </strong>
                </td>
                <td>{String(u.country_code)}</td>
                <td>
                  <Badge tone={kycTone(String(u.kyc_status))}>{String(u.kyc_status)}</Badge>
                </td>
                <td className="muted">{String(u.level_name ?? '—')}</td>
                <td className="muted">
                  <code>{String(u.sumsub_applicant_id ?? '—')}</code>
                </td>
                <td className="muted">{String(u.kyc_updated_at ?? '—')}</td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      )}
    </>
  );
}
