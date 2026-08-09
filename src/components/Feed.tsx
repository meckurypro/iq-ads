import { useState } from 'react';
import { usePortfolio } from '../lib/usePortfolio';
import PortfolioGrid from './PortfolioGrid';
import ReelFeed from './ReelFeed';
import styles from './Feed.module.css';

type Mode = 'grid' | 'feed';

export default function Feed() {
  const { items, loading, error } = usePortfolio();
  const [mode, setMode] = useState<Mode>('grid');
  const [activeIndex, setActiveIndex] = useState(0);

  const openFeedAt = (index: number) => {
    setActiveIndex(index);
    setMode('feed');
  };

  return (
    <section id="work" className={`container ${styles.section}`}>
      <div className={styles.header}>
        <h2 className={styles.heading}>Selected work</h2>
        <div className={styles.modeToggle}>
          <button
            type="button"
            className={mode === 'grid' ? styles.modeActive : styles.modeButton}
            onClick={() => setMode('grid')}
            aria-pressed={mode === 'grid'}
          >
            Glance
          </button>
          <button
            type="button"
            className={mode === 'feed' ? styles.modeActive : styles.modeButton}
            onClick={() => setMode('feed')}
            aria-pressed={mode === 'feed'}
          >
            Reel
          </button>
        </div>
      </div>

      {loading && <p className={styles.status}>Loading the reel…</p>}
      {error && <p className={styles.status}>Couldn't load the portfolio.</p>}
      {!loading && !error && items.length === 0 && (
        <p className={styles.status}>New work is on the way — check back soon.</p>
      )}

      {!loading && items.length > 0 && mode === 'grid' && (
        <PortfolioGrid items={items} onSelect={openFeedAt} />
      )}
      {!loading && items.length > 0 && mode === 'feed' && (
        <ReelFeed items={items} initialIndex={activeIndex} onClose={() => setMode('grid')} />
      )}
    </section>
  );
}
