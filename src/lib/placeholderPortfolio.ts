import type { PortfolioItem } from '../types/portfolio';

// Temporary local data. Once the Meckury AI schema is shared and the
// iq_ads_portfolio table + RLS policies are added, this will be
// replaced by a Supabase query in src/lib/supabase.ts.
export const placeholderPortfolio: PortfolioItem[] = [
  {
    id: '1',
    title: 'Flyer to Film',
    client: 'IQ Ads (self)',
    category: 'commercial',
    mediaUrl: '/portfolio/sample-1.mp4',
    posterUrl: '/portfolio/sample-1-poster.jpg',
    mediaType: 'video',
    summary: 'From a single flyer upload to a full cinematic commercial.',
    createdAt: '2026-06-01',
  },
  {
    id: '2',
    title: 'Grand Opening',
    client: 'Sample Brand',
    category: 'campaign',
    mediaUrl: '/portfolio/sample-2.mp4',
    posterUrl: '/portfolio/sample-2-poster.jpg',
    mediaType: 'video',
    summary: 'A launch-day campaign built around one recurring character.',
    createdAt: '2026-05-20',
  },
  {
    id: '3',
    title: 'Consistent Character Study',
    client: 'IQ Cinema',
    category: 'brand-film',
    mediaUrl: '/portfolio/sample-3.mp4',
    posterUrl: '/portfolio/sample-3-poster.jpg',
    mediaType: 'video',
    summary: 'The same lead character carried across a full narrative arc.',
    createdAt: '2026-05-02',
  },
];
