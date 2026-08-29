import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.SUPABASE_URL?.trim();

const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

console.log(
  'SUPABASE URL:',
  supabaseUrl
);

console.log(
  'SUPABASE KEY PREFIX:',
  supabaseKey?.substring(0, 10)
);

console.log(
  'SUPABASE KEY LENGTH:',
  supabaseKey?.length
);

export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  },
);