// src/pages/AdminLogin.tsx
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInAdmin } from '../lib/useAdminAuth';
import styles from './AdminLogin.module.css';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const { error: signInError } = await signInAdmin(email, password);

    if (signInError) {
      setError(signInError.message);
      setSubmitting(false);
      return;
    }

    // useAdminAuth re-checks the role on auth state change; the
    // protected route will bounce back here if the account isn't
    // actually an admin.
    navigate('/admin', { replace: true });
  }

  return (
    <div className={styles.wrap}>
      <form className={styles.form} onSubmit={handleSubmit}>
        <p className="eyebrow">IQ Ads Admin</p>
        <h1 className={styles.heading}>Sign in</h1>
        <p className={styles.sub}>Use your Meckury AI admin account. No separate sign-up here.</p>

        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button type="submit" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>

        {error && <p className={styles.error}>{error}</p>}
      </form>
    </div>
  );
}
