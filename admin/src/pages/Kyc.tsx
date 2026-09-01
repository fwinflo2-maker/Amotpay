import { useEffect, useState } from 'react';
import { api } from '../api';

export function KycPage() {
  const [items, setItems] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    api<{ items: Record<string, unknown>[] }>('/admin/kyc').then(d => setItems(d.items));
  }, []);

  return (
    <>
      <h1>KYC</h1>
      <table className="card">
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
              <td>{String(u.first_name)} {String(u.last_name)}</td>
              <td>{String(u.country_code)}</td>
              <td>{String(u.kyc_status)}</td>
              <td className="muted">{String(u.level_name ?? '—')}</td>
              <td className="muted">{String(u.sumsub_applicant_id ?? '—')}</td>
              <td className="muted">{String(u.kyc_updated_at ?? '—')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
