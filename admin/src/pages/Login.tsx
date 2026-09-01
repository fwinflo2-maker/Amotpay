import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../api';
import { AmotpayLogo } from '../components/AmotpayLogo';
import { Button } from '../components/ui';

export function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [needsTotp, setNeedsTotp] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const result = await login(username.trim(), password, totpCode || undefined);
      if (result.password_change_required) {
        nav('/settings');
        return;
      }
      nav('/');
    } catch (err) {
      const code = (err as Error & { code?: string }).code;
      if (code === 'TOTP_REQUIRED') {
        setNeedsTotp(true);
        setError('Code 2FA requis.');
      } else {
        setError((err as Error).message);
      }
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
            <AmotpayLogo size={36} variant="image" />
            <span className="lp-brand-text">Admin</span>
          </div>
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
          <p className="login-lead">Identifiant et mot de passe administrateur.</p>

          <form onSubmit={submit}>
            <label className="field" htmlFor="admin-username">
              <span className="field-label">Identifiant</span>
              <input
                id="admin-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                placeholder="admin"
                disabled={busy}
                required
              />
            </label>

            <label className="field" htmlFor="admin-password">
              <span className="field-label">Mot de passe</span>
              <input
                id="admin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="••••••••"
                disabled={busy}
                required
              />
            </label>

            {needsTotp ? (
              <label className="field" htmlFor="admin-totp">
                <span className="field-label">Code 2FA</span>
                <input
                  id="admin-totp"
                  type="text"
                  inputMode="numeric"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value)}
                  placeholder="123456"
                  disabled={busy}
                  required
                />
              </label>
            ) : null}

            {error && <p className="error">{error}</p>}

            <Button type="submit" disabled={busy || !username.trim() || !password}>
              {busy ? 'Connexion…' : 'Connexion'}
            </Button>
          </form>
        </div>

        <p className="login-footer">© {new Date().getFullYear()} AMOTPay</p>
      </section>
    </div>
  );
}
