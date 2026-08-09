import type { PortfolioItem } from '../types/portfolio';
import styles from './PortfolioGrid.module.css';

interface PortfolioGridProps {
  items: PortfolioItem[];
  onSelect: (index: number) => void;
}

export default function PortfolioGrid({ items, onSelect }: PortfolioGridProps) {
  return (
    <div className={styles.grid}>
      {items.map((item, index) => (
        <button
          type="button"
          key={item.id}
          className={styles.card}
          style={item.aspectRatio ? { aspectRatio: `${item.aspectRatio}` } : undefined}
          onClick={() => onSelect(index)}
        >
          <img
            className={styles.thumb}
            src={item.posterUrl ?? item.mediaUrl}
            alt={item.title}
            loading="lazy"
          />
          <span className={styles.cardOverlay}>
            <span className={styles.cardTitle}>{item.title}</span>
            <span className={styles.cardClient}>{item.client}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
