import type { Context } from "hono";
import { createMiddleware } from "hono/factory";
import { supabaseAdmin } from "./supabaseAdmin.js";

// Extend Hono context to include user information
export type AuthVariables = {
  userId: string;
  userEmail: string;
};

/**
 * Authentication middleware for Hono
 * Verifies JWT token from Authorization header using Supabase
 */
export const authMiddleware = createMiddleware<{ Variables: AuthVariables }>(
  async (c: Context, next) => {
    const authHeader = c.req.header("Authorization");

    if (!authHeader) {
      return c.json({ error: "Missing authorization header" }, 401);
    }

    // Extract token from "Bearer <token>" format
    const token = authHeader.replace(/^Bearer\s+/i, "");

    if (!token) {
      return c.json({ error: "Invalid authorization header format" }, 401);
    }

    try {
      // Verify JWT token using Supabase
      const {
        data: { user },
        error,
      } = await supabaseAdmin.auth.getUser(token);

      if (error || !user) {
        console.error("Token verification failed:", error?.message);
        return c.json({ error: "Invalid or expired token" }, 401);
      }

      // Store user information in context
      c.set("userId", user.id);
      c.set("userEmail", user.email || "");

      await next();
    } catch (error) {
      console.error("Auth middleware error:", error);
      return c.json({ error: "Authentication failed" }, 500);
    }
  },
);
