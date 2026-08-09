import { createClient } from '@supabase/supabase-js';

// Points at the shared Meckury AI Supabase project. Once the schema
// is shared, generate types (supabase gen types typescript) and pass
// them as the generic here, e.g. createClient<Database>(...).
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);
