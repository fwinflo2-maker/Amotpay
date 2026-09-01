import { useEffect, useState } from 'react';
import { api } from '../api';
import { Alert, Badge, Button, Card, Field, LoadingState, PageHeader, PasswordInput } from '../components/ui';

type AccountInfo = {
  username: string;
  source: 'database' | 'environment';
  status: string;
  totp_enabled: boolean;
  password_change_required: boolean;
};

type SessionRow = {
  id: number;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  last_seen_at: string | null;
  expires_at: string;
  current: boolean;
};

export function SettingsPage() {
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [revokeOthers, setRevokeOthers] = useState(true);
  const [totpCode, setTotpCode] = useState('');
  const [totpSetup, setTotpSetup] = useState<{ secret: string; provisioning_uri: string } | null>(null);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');
  const [msgTone, setMsgTone] = useState<'info' | 'success' | 'error'>('info');

  async function load() {
    const data = await api<AccountInfo>('/admin/account');
    setAccount(data);
    setNewUsername(data.username);
    try {
      const sess = await api<{ items: SessionRow[] }>('/admin/account/sessions');
      setSessions(sess.items);
    } catch {
      setSessions([]);
    }
  }

  useEffect(() => {
    load().catch((e) => {
      setMsgTone('error');
      setMsg((e as Error).message);
    });
  }, []);

  async function changeUsername(e: React.FormEvent) {
    e.preventDefault();
    setBusy('username');
    setMsg('');
    try {
      await api('/admin/account/username', {
        method: 'PUT',
        body: JSON.stringify({ current_password: currentPassword, username: newUsername }),
      });
      setMsgTone('success');
      setMsg('Identifiant mis à jour.');
      setCurrentPassword('');
      await load();
    } catch (e) {
      setMsgTone('error');
      setMsg((e as Error).message);
    } finally {
      setBusy('');
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setBusy('password');
    setMsg('');
    try {
      if (newPassword !== confirmPassword) {
        throw new Error('Les mots de passe ne correspondent pas.');
      }
      await api('/admin/account/password', {
        method: 'PUT',
        body: JSON.stringify({
          current_password: currentPassword,
          password: newPassword,
          confirm_password: confirmPassword,
          revoke_other_sessions: revokeOthers,
        }),
      });
      setMsgTone('success');
      setMsg('Mot de passe mis à jour.');
      localStorage.removeItem('amotpay_admin_password_change');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      await load();
    } catch (e) {
      setMsgTone('error');
      setMsg((e as Error).message);
    } finally {
      setBusy('');
    }
  }

  async function revokeSession(id: number) {
    setBusy(`session-${id}`);
    try {
      await api(`/admin/account/sessions/${id}`, { method: 'DELETE' });
      await load();
    } catch (e) {
      setMsgTone('error');
      setMsg((e as Error).message);
    } finally {
      setBusy('');
    }
  }

  async function revokeOtherSessions() {
    setBusy('revoke-others');
    try {
      await api('/admin/account/sessions/revoke-others', { method: 'POST', body: '{}' });
      setMsgTone('success');
      setMsg('Autres sessions révoquées.');
      await load();
    } catch (e) {
      setMsgTone('error');
      setMsg((e as Error).message);
    } finally {
      setBusy('');
    }
  }

  async function setup2fa() {
    setBusy('2fa-setup');
    try {
      const data = await api<{ secret: string; provisioning_uri: string }>('/admin/account/2fa/setup', {
        method: 'POST',
        body: JSON.stringify({ current_password: currentPassword }),
      });
      setTotpSetup(data);
      setMsgTone('info');
      setMsg('Scannez le secret dans votre application 2FA, puis entrez le code pour activer.');
    } catch (e) {
      setMsgTone('error');
      setMsg((e as Error).message);
    } finally {
      setBusy('');
    }
  }

  async function enable2fa() {
    setBusy('2fa-enable');
    try {
      await api('/admin/account/2fa/enable', {
        method: 'POST',
        body: JSON.stringify({ current_password: currentPassword, totp_code: totpCode }),
      });
      setTotpSetup(null);
      setTotpCode('');
      setMsgTone('success');
      setMsg('2FA activée.');
      await load();
    } catch (e) {
      setMsgTone('error');
      setMsg((e as Error).message);
    } finally {
      setBusy('');
    }
  }

  async function disable2fa() {
    setBusy('2fa-disable');
    try {
      await api('/admin/account/2fa/disable', {
        method: 'POST',
        body: JSON.stringify({ current_password: currentPassword, totp_code: totpCode }),
      });
      setTotpCode('');
      setMsgTone('success');
      setMsg('2FA désactivée.');
      await load();
    } catch (e) {
      setMsgTone('error');
      setMsg((e as Error).message);
    } finally {
      setBusy('');
    }
  }

  if (!account) return <LoadingState label="Chargement des paramètres…" />;

  return (
    <>
      <PageHeader
        title="Account & Security"
        subtitle="Gestion du compte administrateur, sessions et authentification à deux facteurs."
      />

      {account.password_change_required ? (
        <Alert tone="error">
          Mot de passe temporaire détecté — changez votre mot de passe avant d&apos;accéder au reste de l&apos;admin.
        </Alert>
      ) : null}

      {msg ? <Alert tone={msgTone === 'error' ? 'error' : msgTone === 'success' ? 'success' : 'info'}>{msg}</Alert> : null}

      <div className="settings-grid">
        <Card>
          <h2>Compte</h2>
          <p className="page-subtitle">
            Identifiant : <strong>{account.username}</strong>{' '}
            <Badge tone={account.status === 'ACTIVE' ? 'success' : 'warning'}>{account.status}</Badge>
          </p>
          <p className="page-subtitle">
            Source : {account.source === 'database' ? 'base de données' : 'variables Hostinger'}
          </p>

          <form onSubmit={changeUsername}>
            <Field label="Nouvel identifiant">
              <input value={newUsername} onChange={(e) => setNewUsername(e.target.value)} minLength={3} required />
            </Field>
            <Field label="Mot de passe actuel (confirmation)">
              <PasswordInput
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </Field>
            <Button type="submit" disabled={busy === 'username'}>
              {busy === 'username' ? 'Mise à jour…' : 'Changer l\'identifiant'}
            </Button>
          </form>
        </Card>

        <Card>
          <h2>Mot de passe</h2>
          <form onSubmit={changePassword}>
            <Field label="Mot de passe actuel">
              <PasswordInput
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </Field>
            <Field label="Nouveau mot de passe" hint="Min. 8 caractères, lettres et chiffres">
              <PasswordInput
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                required
                minLength={8}
              />
            </Field>
            <Field label="Confirmer le nouveau mot de passe">
              <PasswordInput
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
                minLength={8}
              />
            </Field>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={revokeOthers}
                onChange={(e) => setRevokeOthers(e.target.checked)}
              />
              Déconnecter les autres sessions après le changement
            </label>
            <Button type="submit" disabled={busy === 'password'}>
              {busy === 'password' ? 'Mise à jour…' : 'Changer le mot de passe'}
            </Button>
          </form>
        </Card>

        <Card>
          <h2>
            Authentification 2FA
            <Badge tone={account.totp_enabled ? 'success' : 'neutral'}>
              {account.totp_enabled ? 'Activée' : 'Désactivée'}
            </Badge>
          </h2>
          {!account.totp_enabled ? (
            <>
              {totpSetup ? (
                <>
                  <p className="page-subtitle">Secret : <code>{totpSetup.secret}</code></p>
                  <p className="page-subtitle">URI : <code className="break-all">{totpSetup.provisioning_uri}</code></p>
                  <Field label="Code 2FA">
                    <input value={totpCode} onChange={(e) => setTotpCode(e.target.value)} placeholder="123456" />
                  </Field>
                  <Button onClick={enable2fa} disabled={busy === '2fa-enable'}>Activer 2FA</Button>
                </>
              ) : (
                <Button onClick={setup2fa} disabled={busy === '2fa-setup' || !currentPassword}>
                  Préparer 2FA
                </Button>
              )}
              <p className="page-subtitle">Saisissez d&apos;abord votre mot de passe actuel dans une section ci-dessus.</p>
            </>
          ) : (
            <>
              <Field label="Code 2FA">
                <input value={totpCode} onChange={(e) => setTotpCode(e.target.value)} placeholder="123456" />
              </Field>
              <Button variant="secondary" onClick={disable2fa} disabled={busy === '2fa-disable'}>
                Désactiver 2FA
              </Button>
            </>
          )}
        </Card>

        <Card>
          <h2>Sessions actives</h2>
          {sessions.length === 0 ? (
            <p className="page-subtitle">Aucune session active ou métadonnées non disponibles (migration 009).</p>
          ) : (
            <ul className="session-list">
              {sessions.map((s) => (
                <li key={s.id}>
                  <div>
                    <strong>{s.current ? 'Session actuelle' : `Session #${s.id}`}</strong>
                    <span className="muted">{s.ip_address ?? 'IP inconnue'}</span>
                    <span className="muted">{s.user_agent ?? ''}</span>
                  </div>
                  {!s.current ? (
                    <Button variant="secondary" onClick={() => revokeSession(s.id)} disabled={!!busy}>
                      Révoquer
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          <Button variant="secondary" onClick={revokeOtherSessions} disabled={busy === 'revoke-others'}>
            Déconnecter les autres sessions
          </Button>
        </Card>
      </div>
    </>
  );
}
