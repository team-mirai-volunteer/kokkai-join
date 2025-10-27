import { createClient } from "@supabase/supabase-js";
import type { Context } from "hono";
import type { Database } from "../types/supabase.types.js";

/**
 * Extract Bearer token from Authorization header
 *
 * @param c - Hono context
 * @returns Token string or undefined if not present
 */
export function extractToken(c: Context): string | undefined {
  const authHeader = c.req.header("Authorization");
  return authHeader?.replace(/^Bearer\s+/i, "");
}

/**
 * Validate environment variables for Supabase
 *
 * @throws Error if required environment variables are missing
 */
export function validateSupabaseEnv(): void {
  if (!process.env.SUPABASE_URL) {
    throw new Error("Missing SUPABASE_URL environment variable");
  }
  if (!process.env.SUPABASE_ANON_KEY) {
    throw new Error("Missing SUPABASE_ANON_KEY environment variable");
  }
}

/**
 * Create Supabase client with user token
 *
 * This function creates a Supabase client configured with the user's JWT token
 * for Row Level Security (RLS) policies enforcement.
 *
 * @param token - User JWT token from Authorization header
 * @returns Configured Supabase client
 * @throws Error if required environment variables are missing
 */
export function createSupabaseClient(token: string) {
  validateSupabaseEnv();

  // SAFETY: validateSupabaseEnv() called above ensures these are defined
  return createClient<Database>(
    process.env.SUPABASE_URL as string,
    process.env.SUPABASE_ANON_KEY as string,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    },
  );
}

/**
 * Extract and validate token, then create Supabase client
 *
 * This is a convenience function that combines token extraction,
 * validation, and Supabase client creation.
 *
 * @param c - Hono context
 * @returns Object with token and Supabase client
 * @throws Error if token is missing or environment variables are not set
 */
export function getAuthenticatedSupabaseClient(c: Context) {
  const token = extractToken(c);

  if (!token) {
    throw new Error("Missing authorization token");
  }

  const supabase = createSupabaseClient(token);

  return { token, supabase };
}
