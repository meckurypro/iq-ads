import { useEffect, useRef, useState } from 'react';
import type { PortfolioItem } from '../types/portfolio';
import styles from './FeedCard.module.css';

interface Props {
  item: PortfolioItem;
  index: number;
}

export default function FeedCard({ item, index }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`${styles.card} ${visible ? styles.visible : ''}`}
      style={{ transitionDelay: `${(index % 3) * 90}ms` }}
      onMouseEnter={() => videoRef.current?.play()}
      onMouseLeave={() => videoRef.current?.pause()}
    >
      <div className={styles.mediaWrap}>
        {item.mediaType === 'video' ? (
          <video
            ref={videoRef}
            src={item.mediaUrl}
            poster={item.posterUrl}
            muted
            loop
            playsInline
            preload="metadata"
          />
        ) : (
          <img src={item.mediaUrl} alt={item.title} loading="lazy" />
        )}
      </div>
      <div className={styles.meta}>
        <span className={styles.category}>{item.category.replace('-', ' ')}</span>
        <h3>{item.title}</h3>
        <p>{item.summary}</p>
      </div>
    </div>
  );
}
