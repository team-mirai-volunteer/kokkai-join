export function ensureEnv(key: string): string {
  const value = Deno.env.get(key);
  if (!value) {
    throw new Error(`${key} environment variable is required`);
  }
  return value;
}
