import { useEffect, useRef, useState } from 'react';
import type { PortfolioItem } from '../types/portfolio';
import styles from './FeedCard.module.css';

interface Props {
  item: PortfolioItem;
  index: number;
}

// Fallback for portfolio rows created before aspect_ratio existed.
// Matches the old fixed 4:5 box so legacy items don't visually jump.
const DEFAULT_ASPECT_RATIO = 0.8;

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

  // Native shape of the media — a 9:16 clip renders in a 9:16 box, a
  // 16:9 clip in a 16:9 box, and so on. Nothing gets cropped or
  // letterboxed into a fixed ratio anymore; the box IS the media's
  // real shape, and object-fit: cover just fills it edge to edge.
  const aspectRatio =
    item.aspectRatio && item.aspectRatio > 0 ? item.aspectRatio : DEFAULT_ASPECT_RATIO;

  return (
    <div
      ref={ref}
      className={`${styles.card} ${visible ? styles.visible : ''}`}
      style={{ transitionDelay: `${(index % 3) * 90}ms` }}
      onMouseEnter={() => videoRef.current?.play()}
      onMouseLeave={() => videoRef.current?.pause()}
    >
      <div className={styles.mediaWrap} style={{ aspectRatio }}>
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
