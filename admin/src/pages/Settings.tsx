import { useEffect, useState } from 'react';
import { api } from '../api';
import { Alert, Button, Card, Field, LoadingState, PageHeader } from '../components/ui';

type AccountInfo = {
  username: string;
  source: 'database' | 'environment';
};

export function SettingsPage() {
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgTone, setMsgTone] = useState<'info' | 'success' | 'error'>('info');

  async function load() {
    const data = await api<AccountInfo>('/admin/account');
    setAccount(data);
    setUsername(data.username);
  }

  useEffect(() => {
    load().catch((e) => {
      setMsgTone('error');
      setMsg((e as Error).message);
    });
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg('');
    try {
      if (password !== confirmPassword) {
        throw new Error('Les mots de passe ne correspondent pas.');
      }
      const result = await api<{ username: string }>('/admin/account/credentials', {
        method: 'PUT',
        body: JSON.stringify({
          current_password: currentPassword,
          username,
          password,
        }),
      });
      setMsgTone('success');
      setMsg(`Identifiants mis à jour pour ${result.username}.`);
      setCurrentPassword('');
      setPassword('');
      setConfirmPassword('');
      await load();
    } catch (e) {
      setMsgTone('error');
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!account) return <LoadingState label="Chargement des paramètres…" />;

  return (
    <>
      <PageHeader
        title="Paramètres"
        subtitle="Modifiez l'identifiant et le mot de passe administrateur AMOTPay."
      />

      {msg ? <Alert tone={msgTone === 'error' ? 'error' : msgTone === 'success' ? 'success' : 'info'}>{msg}</Alert> : null}

      <Card>
        <form onSubmit={save}>
          <p className="page-subtitle" style={{ marginTop: 0 }}>
            Source actuelle : {account.source === 'database' ? 'base de données (modifiable)' : 'variables Hostinger (première sauvegarde les enregistre)'}
          </p>

          <Field label="Identifiant actuel">
            <input value={account.username} readOnly />
          </Field>

          <Field label="Mot de passe actuel">
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </Field>

          <Field label="Nouvel identifiant">
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
              minLength={3}
            />
          </Field>

          <Field label="Nouveau mot de passe">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
              minLength={8}
            />
          </Field>

          <Field label="Confirmer le nouveau mot de passe">
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
              minLength={8}
            />
          </Field>

          <Button type="submit" disabled={busy}>
            {busy ? 'Enregistrement…' : 'Enregistrer les identifiants'}
          </Button>
        </form>
      </Card>
    </>
  );
}
