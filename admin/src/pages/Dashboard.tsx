import { useEffect, useState } from 'react';
import { api } from '../api';

export function DashboardPage() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    api<Record<string, unknown>>('/admin/dashboard').then(setData).catch(console.error);
  }, []);

  if (!data) return <p className="muted">Loading…</p>;

  return (
    <>
      <h1>Dashboard</h1>
      <div className="row">
        <div className="card" style={{ minWidth: 160 }}><div className="muted">Transfers today</div><div style={{ fontSize: '1.5rem' }}>{String(data.transactions_today)}</div></div>
        <div className="card" style={{ minWidth: 160 }}><div className="muted">KYC pending</div><div style={{ fontSize: '1.5rem' }}>{String(data.kyc_pending)}</div></div>
        <div className="card" style={{ minWidth: 160 }}><div className="muted">Cashramp</div><div>{String((data.providers as Record<string, string>)?.cashramp)}</div></div>
        <div className="card" style={{ minWidth: 160 }}><div className="muted">Sumsub</div><div>{String((data.providers as Record<string, string>)?.sumsub)}</div></div>
      </div>
      <pre className="card" style={{ overflow: 'auto', fontSize: '0.75rem' }}>{JSON.stringify(data, null, 2)}</pre>
    </>
  );
}
