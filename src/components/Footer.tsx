import { Link } from 'react-router-dom';
import { useAdminAuth } from '../lib/useAdminAuth';
import styles from './Footer.module.css';

export default function Footer() {
  const { isAdmin, loading } = useAdminAuth();

  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.inner}`}>
        <span>IQ Ads — a PromptIQ studio</span>
        <div className={styles.right}>
          {!loading && isAdmin && (
            <Link to="/admin" className={styles.adminLink}>
              Admin
            </Link>
          )}
          <span>© {new Date().getFullYear()}</span>
        </div>
      </div>
    </footer>
  );
}
