export interface PortfolioItem {
  id: string;
  title: string;
  client: string;
  category: 'commercial' | 'brand-film' | 'campaign' | 'jingle';
  mediaUrl: string;
  mediaType: 'video' | 'image';
  posterUrl?: string;
  summary: string;
  createdAt: string;
}
