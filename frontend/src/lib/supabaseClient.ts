import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase.types";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. Please check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.development",
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Auto-refresh session before expiry
    autoRefreshToken: true,
    // Persist auth session to localStorage
    persistSession: true,
    // Detect session from URL (for email confirmations, password resets)
    detectSessionInUrl: true,
  },
});
