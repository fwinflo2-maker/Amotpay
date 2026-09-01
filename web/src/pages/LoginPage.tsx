import { FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { login } from '../api/client';

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(phone, password);
      navigate('/verification', { replace: true });
    } catch {
      setError(t('verification.errorBody'));
    }
  };

  return (
    <div className="verification-page">
      <section className="card premium-card">
        <p className="eyebrow">{t('brand')}</p>
        <h1>{t('auth.signIn')}</h1>
        <form className="login-form" onSubmit={onSubmit}>
          <label>
            {t('auth.phone')}
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required autoComplete="tel" />
          </label>
          <label>
            {t('auth.password')}
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button type="submit" className="primary-btn">{t('auth.continue')}</button>
        </form>
      </section>
    </div>
  );
}
