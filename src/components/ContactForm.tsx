// src/components/ContactForm.tsx
import { useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import styles from './ContactForm.module.css';

type Status = 'idle' | 'submitting' | 'success' | 'error';

export default function ContactForm() {
  const [status, setStatus] = useState<Status>('idle');

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus('submitting');
    const form = e.currentTarget;
    const data = new FormData(form);

    const name = String(data.get('name') ?? '').trim();
    const email = String(data.get('email') ?? '').trim();
    const phone = String(data.get('phone') ?? '').trim();
    const brand = String(data.get('brand') ?? '').trim();
    const brief = String(data.get('brief') ?? '').trim();

    try {
      const { error } = await supabase.from('promptiq_inquiries').insert({
        name,
        email,
        phone: phone || null,
        inquiry_type: 'consultation',
        service_interest: 'ads',
        message: brand ? `Brand/company: ${brand}\n\n${brief}` : brief,
      });

      if (error) throw error;

      setStatus('success');
      form.reset();
    } catch (err) {
      console.error('inquiry submit failed', err);
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
        <label htmlFor="phone">Phone number</label>
        <input id="phone" name="phone" type="tel" autoComplete="tel" placeholder="Optional" />
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
