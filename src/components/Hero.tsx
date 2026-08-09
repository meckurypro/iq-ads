import { useEffect, useState } from 'react';
import styles from './Hero.module.css';

export default function Hero() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Small delay so the load-in sequence reads as intentional,
    // not a layout jump.
    const t = setTimeout(() => setReady(true), 150);
    return () => clearTimeout(t);
  }, []);

  return (
    <section className={styles.hero}>
      <video
        className={styles.video}
        src="/hero/reel.mp4"
        poster="/hero/reel-poster.jpg"
        autoPlay
        muted
        loop
        playsInline
      />
      <div className={styles.scrim} />

      <div className={`container ${styles.content} ${ready ? styles.in : ''}`}>
        <p className="eyebrow">Cinematic AI commercials</p>
        <h1 className={styles.headline}>
          Tell us what you're building. We'll turn it into a film.
        </h1>
        <p className={styles.sub}>
          Story, consistent characters, voice over, and an original jingle —
          built around your brand by IQ, not assembled from a template.
        </p>
        <a href="/#work" className={styles.cta}>
          Start a project
        </a>
      </div>

      <span className={styles.scrollHint} aria-hidden="true" />
    </section>
  );
}
