// PLACE AT: src/lib/usePortfolioAdmin.ts
import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabase';
import type { PortfolioItem } from '../types/portfolio';

// Same table/row shape as usePortfolio.ts (kept separate and
// self-contained so the read-only public hook doesn't need to
// change). If the schema ever moves, update both.
const TABLE_NAME = 'iq_ads_portfolio';

interface Row {
  id: string;
  title: string;
  client: string;
  category: PortfolioItem['category'];
  media_url: string;
  media_type: PortfolioItem['mediaType'];
  poster_url: string | null;
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
    summary: row.summary,
    createdAt: row.created_at,
  };
}

// What the form collects to create or update an item — everything
// except id/createdAt, which the DB owns.
export type PortfolioInput = Omit<PortfolioItem, 'id' | 'createdAt'>;

function toRowInput(input: PortfolioInput) {
  return {
    title: input.title,
    client: input.client,
    category: input.category,
    media_url: input.mediaUrl,
    media_type: input.mediaType,
    poster_url: input.posterUrl || null,
    summary: input.summary,
  };
}

interface UsePortfolioAdminResult {
  items: PortfolioItem[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createItem: (input: PortfolioInput) => Promise<{ error: string | null }>;
  updateItem: (id: string, input: PortfolioInput) => Promise<{ error: string | null }>;
  deleteItem: (id: string) => Promise<{ error: string | null }>;
}

export function usePortfolioAdmin(): UsePortfolioAdminResult {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .order('created_at', { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
      setItems([]);
    } else {
      setItems(((data as Row[]) ?? []).map(mapRow));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createItem = useCallback(
    async (input: PortfolioInput) => {
      const { error: insertError } = await supabase.from(TABLE_NAME).insert(toRowInput(input));
      if (insertError) return { error: insertError.message };
      await refresh();
      return { error: null };
    },
    [refresh],
  );

  const updateItem = useCallback(
    async (id: string, input: PortfolioInput) => {
      const { error: updateError } = await supabase
        .from(TABLE_NAME)
        .update(toRowInput(input))
        .eq('id', id);
      if (updateError) return { error: updateError.message };
      await refresh();
      return { error: null };
    },
    [refresh],
  );

  const deleteItem = useCallback(
    async (id: string) => {
      const { error: deleteError } = await supabase.from(TABLE_NAME).delete().eq('id', id);
      if (deleteError) return { error: deleteError.message };
      await refresh();
      return { error: null };
    },
    [refresh],
  );

  return { items, loading, error, refresh, createItem, updateItem, deleteItem };
}
