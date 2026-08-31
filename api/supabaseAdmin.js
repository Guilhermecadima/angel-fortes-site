import { createClient } from '@supabase/supabase-js';


const supabaseUrl =
  process.env.SUPABASE_URL?.trim();


const supabaseServiceRoleKey =
  process.env
    .SUPABASE_SERVICE_ROLE_KEY
    ?.trim();


if (!supabaseUrl) {
  throw new Error(
    'SUPABASE_URL não está configurado.',
  );
}


if (!supabaseServiceRoleKey) {
  throw new Error(
    'SUPABASE_SERVICE_ROLE_KEY não está configurado.',
  );
}


export const supabaseAdmin =
  createClient(
    supabaseUrl,
    supabaseServiceRoleKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );