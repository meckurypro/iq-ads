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
          <img src="/logo.svg" alt="" width={28} height={28} />
          <span>IQ Ads</span>
        </a>
        <a href="#contact" className={styles.cta}>
          Request a call
        </a>
      </div>
    </header>
  );
}
