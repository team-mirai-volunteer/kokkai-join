import type { Context } from "hono";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createSupabaseClient,
  extractToken,
  getAuthenticatedSupabaseClient,
  validateSupabaseEnv,
} from "./auth-helpers.js";

describe("auth-helpers", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment variables
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("extractToken", () => {
    it("should extract token from Bearer header", () => {
      const mockContext = {
        req: {
          header: vi.fn().mockReturnValue("Bearer test-token-123"),
        },
      } as unknown as Context;

      const token = extractToken(mockContext);

      expect(token).toBe("test-token-123");
      expect(mockContext.req.header).toHaveBeenCalledWith("Authorization");
    });

    it("should handle case-insensitive Bearer prefix", () => {
      const mockContext = {
        req: {
          header: vi.fn().mockReturnValue("bearer test-token-456"),
        },
      } as unknown as Context;

      const token = extractToken(mockContext);

      expect(token).toBe("test-token-456");
    });

    it("should handle Bearer with multiple spaces", () => {
      const mockContext = {
        req: {
          header: vi.fn().mockReturnValue("Bearer   test-token-789"),
        },
      } as unknown as Context;

      const token = extractToken(mockContext);

      expect(token).toBe("test-token-789");
    });

    it("should return undefined when Authorization header is missing", () => {
      const mockContext = {
        req: {
          header: vi.fn().mockReturnValue(undefined),
        },
      } as unknown as Context;

      const token = extractToken(mockContext);

      expect(token).toBeUndefined();
    });

    it("should return empty string when only Bearer is present", () => {
      const mockContext = {
        req: {
          header: vi.fn().mockReturnValue("Bearer "),
        },
      } as unknown as Context;

      const token = extractToken(mockContext);

      expect(token).toBe("");
    });
  });

  describe("validateSupabaseEnv", () => {
    it("should not throw when all environment variables are set", () => {
      process.env.SUPABASE_URL = "https://example.supabase.co";
      process.env.SUPABASE_ANON_KEY = "test-anon-key";

      expect(() => validateSupabaseEnv()).not.toThrow();
    });

    it("should throw when SUPABASE_URL is missing", () => {
      delete process.env.SUPABASE_URL;
      process.env.SUPABASE_ANON_KEY = "test-anon-key";

      expect(() => validateSupabaseEnv()).toThrow(
        "Missing SUPABASE_URL environment variable",
      );
    });

    it("should throw when SUPABASE_ANON_KEY is missing", () => {
      process.env.SUPABASE_URL = "https://example.supabase.co";
      delete process.env.SUPABASE_ANON_KEY;

      expect(() => validateSupabaseEnv()).toThrow(
        "Missing SUPABASE_ANON_KEY environment variable",
      );
    });

    it("should throw when both environment variables are missing", () => {
      delete process.env.SUPABASE_URL;
      delete process.env.SUPABASE_ANON_KEY;

      expect(() => validateSupabaseEnv()).toThrow(
        "Missing SUPABASE_URL environment variable",
      );
    });
  });

  describe("createSupabaseClient", () => {
    it("should create Supabase client with provided token", () => {
      process.env.SUPABASE_URL = "https://example.supabase.co";
      process.env.SUPABASE_ANON_KEY = "test-anon-key";

      const client = createSupabaseClient("user-jwt-token");

      expect(client).toBeDefined();
      // Note: We can't easily test the internal configuration,
      // but we can verify that the function doesn't throw
    });

    it("should throw when environment variables are missing", () => {
      delete process.env.SUPABASE_URL;
      delete process.env.SUPABASE_ANON_KEY;

      expect(() => createSupabaseClient("user-jwt-token")).toThrow(
        "Missing SUPABASE_URL environment variable",
      );
    });
  });

  describe("getAuthenticatedSupabaseClient", () => {
    it("should extract token and create Supabase client", () => {
      process.env.SUPABASE_URL = "https://example.supabase.co";
      process.env.SUPABASE_ANON_KEY = "test-anon-key";

      const mockContext = {
        req: {
          header: vi.fn().mockReturnValue("Bearer user-jwt-token"),
        },
      } as unknown as Context;

      const result = getAuthenticatedSupabaseClient(mockContext);

      expect(result.token).toBe("user-jwt-token");
      expect(result.supabase).toBeDefined();
    });

    it("should throw when token is missing", () => {
      process.env.SUPABASE_URL = "https://example.supabase.co";
      process.env.SUPABASE_ANON_KEY = "test-anon-key";

      const mockContext = {
        req: {
          header: vi.fn().mockReturnValue(undefined),
        },
      } as unknown as Context;

      expect(() => getAuthenticatedSupabaseClient(mockContext)).toThrow(
        "Missing authorization token",
      );
    });

    it("should throw when environment variables are missing", () => {
      delete process.env.SUPABASE_URL;
      delete process.env.SUPABASE_ANON_KEY;

      const mockContext = {
        req: {
          header: vi.fn().mockReturnValue("Bearer user-jwt-token"),
        },
      } as unknown as Context;

      expect(() => getAuthenticatedSupabaseClient(mockContext)).toThrow(
        "Missing SUPABASE_URL environment variable",
      );
    });
  });
});
