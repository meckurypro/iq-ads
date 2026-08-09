import { useEffect, useRef, useState } from 'react';
import { usePortfolio } from '../lib/usePortfolio';
import FeedCard from './FeedCard';
import styles from './Feed.module.css';

// The feed loops ONCE after a clear "you've seen it all" CTA card,
// then stops — a silent infinite scroll erodes trust once a visitor
// notices repeated posts, and it also never lets them reach the
// footer/contact section.
const MAX_PASSES = 2;

export default function Feed() {
  const { items, loading, error } = usePortfolio();
  const [passes, setPasses] = useState(1);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (items.length === 0) return;
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setPasses((p) => Math.min(p + 1, MAX_PASSES));
        }
      },
      { rootMargin: '400px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [items.length]);

  return (
    <section className={styles.feed} id="work">
      <div className="container">
        <p className="eyebrow">Selected work</p>
        <h2 className={styles.heading}>The reel</h2>
      </div>

      {loading && <p className={styles.status}>Loading the reel…</p>}

      {error && (
        <p className={styles.status}>
          Couldn't load the portfolio right now. ({error})
        </p>
      )}

      {!loading && !error && items.length === 0 && (
        <p className={styles.status}>New work is on the way — check back soon.</p>
      )}

      {!loading && !error && items.length > 0 && (
        <>
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

          {passes < MAX_PASSES && <div ref={sentinelRef} aria-hidden="true" />}
        </>
      )}
    </section>
  );
}
