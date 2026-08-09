import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import type { PortfolioItem } from '../types/portfolio';

// ASSUMPTION — flagged, not silently guessed: this queries a table
// named `iq_ads_portfolio` with snake_case columns matching
// PortfolioItem (media_url, media_type, poster_url, aspect_ratio,
// created_at). Once the real Meckury AI schema is shared, update
// TABLE_NAME and the mapping below to match the actual table/column
// names — the rest of the feed (fetch/loading/error/loop) does not
// need to change.
const TABLE_NAME = 'iq_ads_portfolio';

interface Row {
  id: string;
  title: string;
  client: string;
  category: PortfolioItem['category'];
  media_url: string;
  media_type: PortfolioItem['mediaType'];
  poster_url: string | null;
  aspect_ratio: number | null;
  summary: string;
  created_at: string;
}

function mapRow(row: Row): PortfolioItem {
  return {
    id: row.id,
    title: row.title,
    client: row.client,
    category: row.category,
    mediaUrl: row.media_url,
    mediaType: row.media_type,
    posterUrl: row.poster_url ?? undefined,
    aspectRatio: row.aspect_ratio ?? null,
    summary: row.summary,
    createdAt: row.created_at,
  };
}

interface UsePortfolioResult {
  items: PortfolioItem[];
  loading: boolean;
  error: string | null;
}

export function usePortfolio(): UsePortfolioResult {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .order('created_at', { ascending: false });

      if (cancelled) return;

      if (fetchError) {
        setError(fetchError.message);
        setItems([]);
      } else {
        setItems(((data as Row[]) ?? []).map(mapRow));
      }
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { items, loading, error };
}
