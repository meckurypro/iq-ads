import { useState, type FormEvent } from 'react';
import styles from './ContactForm.module.css';

type Status = 'idle' | 'submitting' | 'success' | 'error';

export default function ContactForm() {
  const [status, setStatus] = useState<Status>('idle');

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus('submitting');

    const form = e.currentTarget;
    const data = new FormData(form);

    try {
      // Placeholder: wire this to a Supabase table (e.g. iq_ads_leads)
      // or a serverless function once the schema is shared.
      await new Promise((resolve) => setTimeout(resolve, 600));
      console.log('lead submitted', Object.fromEntries(data));
      setStatus('success');
      form.reset();
    } catch {
      setStatus('error');
    }
  }

  if (status === 'success') {
    return (
      <div className={styles.success}>
        <h3>Message sent.</h3>
        <p>We'll get back to you within a day. You can also reach us directly on WhatsApp below.</p>
      </div>
    );
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.row}>
        <label htmlFor="name">Name</label>
        <input id="name" name="name" type="text" required autoComplete="name" />
      </div>

      <div className={styles.row}>
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required autoComplete="email" />
      </div>

      <div className={styles.row}>
        <label htmlFor="brand">Brand / company</label>
        <input id="brand" name="brand" type="text" />
      </div>

      <div className={styles.row}>
        <label htmlFor="brief">What do you want to create?</label>
        <textarea id="brief" name="brief" rows={4} required />
      </div>

      <button type="submit" className={styles.submit} disabled={status === 'submitting'}>
        {status === 'submitting' ? 'Sending…' : 'Request a call back'}
      </button>

      {status === 'error' && (
        <p className={styles.error}>Something went wrong. Please try again or reach us on WhatsApp.</p>
      )}
    </form>
  );
}
