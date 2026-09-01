import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../api';
import { FlowMark } from '../components/FlowMark';
import { Button } from '../components/ui';

export function LoginPage() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(pin);
      nav('/');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-page">
      <section className="login-hero">
        <div className="login-hero-brand">
          <FlowMark size={44} variant="light" />
          <span>AMOTPay</span>
        </div>

        <div className="login-hero-copy">
          <h1>Operations console</h1>
          <p>
            Monitor transfers, identity verification, provider health, and financial reconciliation — all in one
            secure workspace.
          </p>
        </div>

        <p className="login-hero-footer">Cashramp · Sumsub · Ledger</p>
      </section>

      <section className="login-panel">
        <div className="login-card">
          <h2>Welcome back</h2>
          <p className="login-lead">Sign in with your admin PIN to continue.</p>

          <form onSubmit={submit}>
            <label className="field" htmlFor="admin-pin">
              <span className="field-label">Admin PIN</span>
              <input
                id="admin-pin"
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                autoComplete="current-password"
                placeholder="Enter your PIN"
                disabled={busy}
              />
            </label>

            {error && <p className="error">{error}</p>}

            <Button type="submit" disabled={busy || !pin.trim()}>
              {busy ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </div>
      </section>
    </div>
  );
}
