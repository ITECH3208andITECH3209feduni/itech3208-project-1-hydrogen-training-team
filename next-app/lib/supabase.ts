// lib/supabase.ts
// Two Supabase clients:
//   supabase       — uses the publishable key, safe for browser and read-only server routes
//   supabaseServer — uses the secret key, only for server-side write operations

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

// Publishable key — used by the load route and safe to expose to the browser
export const supabase = createClient(
	supabaseUrl,
	process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Secret key — only used server-side (API routes), never sent to the browser
// Will be undefined in browser context, which is intentional
export const supabaseServer = createClient(
	supabaseUrl,
	process.env.SUPABASE_SECRET_KEY!
);
