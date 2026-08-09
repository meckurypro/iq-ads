import { useEffect, useRef, useState } from 'react';
import type { PortfolioItem } from '../types/portfolio';
import { placeholderPortfolio } from '../lib/placeholderPortfolio';
import FeedCard from './FeedCard';
import styles from './Feed.module.css';

// Feed loops, but only after a clear "you've seen it all" CTA card —
// see the design note in memory: a silent infinite loop erodes trust
// once a visitor recognizes repeated posts.
export default function Feed() {
  const [passes, setPasses] = useState(1);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const items: PortfolioItem[] = placeholderPortfolio;

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setPasses((p) => p + 1);
        }
      },
      { rootMargin: '400px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section className={styles.feed} id="work">
      <div className="container">
        <p className="eyebrow">Selected work</p>
        <h2 className={styles.heading}>The reel</h2>
      </div>

      <div className={styles.grid}>
        {items.map((item, i) => (
          <FeedCard key={`${item.id}-0`} item={item} index={i} />
        ))}
      </div>

      <div className={styles.ctaCard}>
        <p className={styles.ctaEyebrow}>That's the current reel</p>
        <h3 className={styles.ctaHeading}>Want something like this for your brand?</h3>
        <a href="#contact" className={styles.ctaLink}>
          Start a project →
        </a>
      </div>

      {Array.from({ length: passes - 1 }).map((_, passIndex) => (
        <div className={styles.grid} key={`pass-${passIndex}`}>
          {items.map((item, i) => (
            <FeedCard key={`${item.id}-${passIndex + 1}`} item={item} index={i} />
          ))}
        </div>
      ))}

      <div ref={sentinelRef} aria-hidden="true" />
    </section>
  );
}
