import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../api';

export function LoginPage() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const nav = useNavigate();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await login(pin);
      nav('/');
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="brand-mark">
          <span className="brand-dot" aria-hidden />
          AMOTPay Admin
        </div>
        <p className="muted">Operations console</p>
        <form onSubmit={submit}>
          <label className="muted">Admin PIN</label>
          <input type="password" value={pin} onChange={e => setPin(e.target.value)} autoComplete="current-password" />
          {error && <p className="error">{error}</p>}
          <button type="submit">Sign in</button>
        </form>
      </div>
    </div>
  );
}
