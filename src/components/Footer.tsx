import styles from './Footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.inner}`}>
        <span>IQ Ads — a PromptIQ studio</span>
        <span>© {new Date().getFullYear()}</span>
      </div>
    </footer>
  );
}
