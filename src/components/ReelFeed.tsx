import { useCallback, useEffect, useRef, useState } from 'react';
import type { PortfolioItem } from '../types/portfolio';
import styles from './ReelFeed.module.css';

interface ReelFeedProps {
  items: PortfolioItem[];
  initialIndex?: number;
  onClose?: () => void;
}

function SoundIcon({ on }: { on: boolean }) {
  return on ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
      <path d="M16.5 8.5a5 5 0 010 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M18.5 6a8 8 0 010 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity="0.6" />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
      <path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M5 14c0-5 4-8 8-8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M9 3l4 3-4 3"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13 12v6a1 1 0 01-1 1H6a1 1 0 01-1-1v-6a1 1 0 011-1h2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 5.5v13l11-6.5-11-6.5z" fill="currentColor" />
    </svg>
  );
}

export default function ReelFeed({ items, initialIndex = 0, onClose }: ReelFeedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [playing, setPlaying] = useState(true);
  const [soundOn, setSoundOn] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const hasAutoUnmutedRef = useRef(false);

  const handleFirstInteraction = useCallback(() => {
    if (hasAutoUnmutedRef.current) return;
    hasAutoUnmutedRef.current = true;
    setSoundOn(true);
  }, []);

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
                // hint covers that case.
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

  const toggleSound = useCallback(() => {
    hasAutoUnmutedRef.current = true;
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
    <div
      className={styles.feed}
      ref={containerRef}
      onScroll={handleFirstInteraction}
      onClick={handleFirstInteraction}
    >
      {onClose && (
        <button type="button" className={styles.close} onClick={onClose} aria-label="Close reel">
          <CloseIcon />
        </button>
      )}

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
              muted={!soundOn}
              loop
              playsInline
              preload={Math.abs(index - activeIndex) <= 1 ? 'auto' : 'none'}
            />
          ) : (
            <img className={styles.media} src={item.mediaUrl} alt={item.title} />
          )}

          {index === activeIndex && !playing && item.mediaType === 'video' && (
            <span className={styles.playHint} aria-hidden="true">
              <PlayIcon />
            </span>
          )}

          <div className={styles.overlay}>
            <p className={styles.itemTitle}>{item.title}</p>
            <p className={styles.itemClient}>{item.client}</p>
          </div>

          {index === activeIndex && (
            <div className={styles.actionRail} onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className={styles.actionButton}
                onClick={toggleSound}
                aria-label={soundOn ? 'Mute' : 'Unmute'}
              >
                <SoundIcon on={soundOn} />
              </button>
              <button
                type="button"
                className={styles.actionButton}
                onClick={() => handleShare(item)}
                aria-label="Share"
              >
                <ShareIcon />
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
