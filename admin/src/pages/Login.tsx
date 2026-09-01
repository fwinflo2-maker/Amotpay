import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../api';
import { AmotpayLogo } from '../components/AmotpayLogo';
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
    <div className="login-page nexus-lp">
      <div className="lp-ambient" aria-hidden>
        <div className="lp-grid" />
        <div className="lp-glow lp-glow--signal" />
        <div className="lp-scanline" />
      </div>

      <header className="lp-nav">
        <div className="lp-nav-inner">
          <div className="lp-brand">
          <AmotpayLogo size={30} variant="lockup" />
          </div>
          <span className="lp-nav-meta">Admin</span>
        </div>
      </header>

      <section className="login-hero">
        <p className="lp-kicker">Console opérations</p>
        <h1>
          Plateforme
          <br />
          <span className="lp-accent">monétaire globale</span>
        </h1>
        <p className="lp-lead">
          Transferts cross-border, identité, comptes et réconciliation — pilotage de la plateforme AMOTPay.
        </p>
        <div className="lp-tags">
          <span>Cashramp</span>
          <span>Sumsub</span>
          <span>Ledger</span>
        </div>
      </section>

      <section className="login-panel">
        <div className="login-card">
          <h2>Connexion</h2>
          <p className="login-lead">Entrez votre PIN administrateur pour continuer.</p>

          <form onSubmit={submit}>
            <label className="field" htmlFor="admin-pin">
              <span className="field-label">PIN Admin</span>
              <input
                id="admin-pin"
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                autoComplete="current-password"
                placeholder="••••••••"
                disabled={busy}
              />
            </label>

            {error && <p className="error">{error}</p>}

            <Button type="submit" disabled={busy || !pin.trim()}>
              {busy ? 'Connexion…' : 'Connexion'}
            </Button>
          </form>
        </div>

        <p className="login-footer">© {new Date().getFullYear()} NEXUS Corp Technologies</p>
      </section>
    </div>
  );
}
