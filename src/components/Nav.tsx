// src/components/Nav.tsx
import { useEffect, useState } from 'react';
import styles from './Nav.module.css';
export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <header className={`${styles.nav} ${scrolled ? styles.scrolled : ''}`}>
      <div className={`container ${styles.inner}`}>
        <a href="/" className={styles.mark} aria-label="IQ Ads home">
          <img src="/logo.png" alt="" width={40} height={40} className={styles.logoImg} />
          <span>Ads</span>
        </a>
        <a href="/#work" className={styles.cta}>
          Request a call
        </a>
      </div>
    </header>
  );
}
