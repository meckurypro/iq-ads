import { useCallback, useEffect, useRef, useState } from 'react';
import type { PortfolioItem } from '../types/portfolio';
import styles from './ReelFeed.module.css';

interface ReelFeedProps {
  items: PortfolioItem[];
  initialIndex?: number;
  onClose?: () => void;
}

export default function ReelFeed({ items, initialIndex = 0, onClose }: ReelFeedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [playing, setPlaying] = useState(true);
  const [soundOn, setSoundOn] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Jump straight to the tapped item when opened from grid mode.
  useEffect(() => {
    itemRefs.current[initialIndex]?.scrollIntoView({ block: 'start' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Play whichever clip is dominant in the viewport, pause the rest.
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const index = Number((entry.target as HTMLElement).dataset.index);
          const video = videoRefs.current[index];
          if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
            setActiveIndex(index);
            if (video && !reducedMotion) {
              video.currentTime = 0;
              video.muted = !soundOn;
              video.play().catch(() => {
                // Some contexts still block autoplay — the tap-to-play
                // hint below covers that case.
              });
              setPlaying(true);
            }
          } else if (video) {
            video.pause();
          }
        });
      },
      { root, threshold: [0, 0.6, 1] },
    );

    itemRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length, reducedMotion]);

  // Keep the active clip's mute state synced whenever sound is toggled.
  useEffect(() => {
    const video = videoRefs.current[activeIndex];
    if (video) video.muted = !soundOn;
  }, [soundOn, activeIndex]);

  const togglePlay = useCallback((index: number) => {
    const video = videoRefs.current[index];
    if (!video) return;
    if (video.paused) {
      video.play();
      setPlaying(true);
    } else {
      video.pause();
      setPlaying(false);
    }
  }, []);

  const toggleSound = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setSoundOn((prev) => {
      const next = !prev;
      const video = videoRefs.current[activeIndex];
      if (video) {
        video.muted = !next;
        if (video.paused) video.play();
      }
      return next;
    });
  }, [activeIndex]);

  const handleShare = useCallback(async (item: PortfolioItem) => {
    const url = `${window.location.origin}/#work-${item.id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: item.title, text: item.summary, url });
      } catch {
        // User dismissed the share sheet — nothing to do.
      }
    } else {
      await navigator.clipboard.writeText(url);
    }
  }, []);

  return (
    <div className={styles.feed} ref={containerRef}>
      {onClose && (
        <button type="button" className={styles.close} onClick={onClose} aria-label="Close reel">
          ✕
        </button>
      )}

      <button
        type="button"
        className={styles.soundToggle}
        onClick={toggleSound}
        aria-label={soundOn ? 'Mute' : 'Unmute'}
      >
        {soundOn ? '🔊' : '🔇'}
      </button>

      {items.map((item, index) => (
        <div
          key={item.id}
          ref={(el) => { itemRefs.current[index] = el; }}
          data-index={index}
          className={styles.item}
          onClick={() => togglePlay(index)}
        >
          {item.mediaType === 'video' ? (
            <video
              ref={(el) => { videoRefs.current[index] = el; }}
              className={styles.media}
              src={item.mediaUrl}
              poster={item.posterUrl}
              muted
              loop
              playsInline
              preload={Math.abs(index - activeIndex) <= 1 ? 'auto' : 'none'}
            />
          ) : (
            <img className={styles.media} src={item.mediaUrl} alt={item.title} />
          )}

          {index === activeIndex && !playing && item.mediaType === 'video' && (
            <span className={styles.playHint} aria-hidden="true">▶</span>
          )}

          <div className={styles.overlay}>
            <p className={styles.itemTitle}>{item.title}</p>
            <p className={styles.itemClient}>{item.client}</p>
          </div>

          <button
            type="button"
            className={styles.shareButton}
            onClick={(e) => { e.stopPropagation(); handleShare(item); }}
            aria-label="Share"
          >
            ⤴
          </button>
        </div>
      ))}
    </div>
  );
}
