import { useEffect, useState } from 'react';
import { api } from '../api';

export function ProvidersPage() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [msg, setMsg] = useState('');

  async function load() {
    setData(await api('/admin/providers/overview'));
  }

  useEffect(() => { load(); }, []);

  async function test(provider: string) {
    setMsg('');
    try {
      const r = await api<{ status: string; latency_ms: number }>(`/admin/providers/${provider.toLowerCase()}/test`, { method: 'POST', body: '{}' });
      setMsg(`${provider}: ${r.status} (${r.latency_ms}ms)`);
      load();
    } catch (e) { setMsg((e as Error).message); }
  }

  async function sync() {
    setMsg('');
    try {
      const r = await api('/admin/capabilities/sync', { method: 'POST', body: '{}' });
      setMsg('Sync: ' + JSON.stringify(r));
    } catch (e) { setMsg((e as Error).message); }
  }

  return (
    <>
      <h1>Providers</h1>
      {msg && <p className="card">{msg}</p>}
      <div className="row">
        <button onClick={() => test('cashramp')}>Test Cashramp</button>
        <button onClick={() => test('sumsub')}>Test Sumsub</button>
        <button onClick={sync}>Sync capabilities</button>
      </div>
      {data && <pre className="card" style={{ fontSize: '0.75rem', overflow: 'auto' }}>{JSON.stringify(data, null, 2)}</pre>}
    </>
  );
}
