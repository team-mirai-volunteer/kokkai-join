/**
 * AI出力のキャッシュ管理
 * APIコスト削減のため、AI出力をJSONファイルにキャッシュし、
 * モックモードでは実際のAPIを呼ばずにキャッシュから読み込む
 */

import { ensureDir } from "@std/fs";
import { join } from "@std/path";

export interface CacheOptions {
  enabled: boolean;
  directory: string;
  mockMode: boolean; // trueの場合、必ずキャッシュから読み込む
}

export class AICacheManager {
  private options: CacheOptions;

  constructor(options?: Partial<CacheOptions>) {
    this.options = {
      enabled: Deno.env.get("AI_CACHE_ENABLED") === "true" ||
        options?.enabled ||
        false,
      directory: options?.directory || "./ai-cache",
      mockMode: Deno.env.get("AI_MOCK_MODE") === "true" || options?.mockMode || false,
    };
  }

  /**
   * キャッシュキーを生成（入力のハッシュ値を使用）
   */
  private async generateCacheKey(
    service: string,
    input: Record<string, unknown>,
  ): Promise<string> {
    const text = JSON.stringify({ service, input });
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return `${service}_${hashHex.substring(0, 16)}.json`;
  }

  /**
   * キャッシュディレクトリのパスを取得
   */
  private getCachePath(service: string): string {
    return join(this.options.directory, service);
  }

  /**
   * キャッシュを保存
   */
  async save<T>(
    service: string,
    input: Record<string, unknown>,
    output: T,
  ): Promise<void> {
    if (!this.options.enabled) return;

    try {
      const cachePath = this.getCachePath(service);
      await ensureDir(cachePath);

      const cacheKey = await this.generateCacheKey(service, input);
      const filePath = join(cachePath, cacheKey);

      const cacheData = {
        service,
        timestamp: new Date().toISOString(),
        input,
        output,
      };

      await Deno.writeTextFile(filePath, JSON.stringify(cacheData, null, 2));

      console.log(`💾 Cached AI output: ${filePath}`);
    } catch (error) {
      console.error(`Failed to save cache: ${error}`);
    }
  }

  /**
   * キャッシュを読み込み
   */
  async load<T>(
    service: string,
    input: Record<string, unknown>,
  ): Promise<T | null> {
    if (!this.options.enabled && !this.options.mockMode) return null;

    try {
      const cacheKey = await this.generateCacheKey(service, input);
      const cachePath = this.getCachePath(service);
      const filePath = join(cachePath, cacheKey);

      const cacheData = await Deno.readTextFile(filePath);
      const parsed = JSON.parse(cacheData);

      console.log(`📂 Loaded from cache: ${filePath}`);
      return parsed.output as T;
    } catch {
      // キャッシュが存在しない場合
      if (this.options.mockMode) {
        console.warn(`⚠️ Mock mode enabled but no cache found for ${service}`);
      }
      return null;
    }
  }

  /**
   * キャッシュが存在するかチェック
   */
  async exists(
    service: string,
    input: Record<string, unknown>,
  ): Promise<boolean> {
    try {
      const cacheKey = await this.generateCacheKey(service, input);
      const cachePath = this.getCachePath(service);
      const filePath = join(cachePath, cacheKey);

      const stat = await Deno.stat(filePath);
      return stat.isFile;
    } catch {
      return false;
    }
  }

  /**
   * モックモードかどうか
   */
  isMockMode(): boolean {
    return this.options.mockMode;
  }

  /**
   * キャッシュを有効化/無効化
   */
  setEnabled(enabled: boolean): void {
    this.options.enabled = enabled;
  }

  /**
   * モックモードを有効化/無効化
   */
  setMockMode(mockMode: boolean): void {
    this.options.mockMode = mockMode;
  }

  /**
   * 特定サービスのキャッシュをクリア
   */
  async clearService(service: string): Promise<void> {
    try {
      const cachePath = this.getCachePath(service);
      await Deno.remove(cachePath, { recursive: true });
      console.log(`🗑️ Cleared cache for service: ${service}`);
    } catch (error) {
      console.error(`Failed to clear cache: ${error}`);
    }
  }

  /**
   * 全キャッシュをクリア
   */
  async clearAll(): Promise<void> {
    try {
      await Deno.remove(this.options.directory, { recursive: true });
      console.log(`🗑️ Cleared all cache`);
    } catch (error) {
      console.error(`Failed to clear cache: ${error}`);
    }
  }

  /**
   * キャッシュ統計を取得
   */
  async getStatistics(): Promise<{
    totalFiles: number;
    totalSize: number;
    services: Record<string, { count: number; size: number }>;
  }> {
    const stats = {
      totalFiles: 0,
      totalSize: 0,
      services: {} as Record<string, { count: number; size: number }>,
    };

    try {
      for await (const entry of Deno.readDir(this.options.directory)) {
        if (entry.isDirectory) {
          const servicePath = join(this.options.directory, entry.name);
          let serviceCount = 0;
          let serviceSize = 0;

          for await (const file of Deno.readDir(servicePath)) {
            if (file.isFile && file.name.endsWith(".json")) {
              const filePath = join(servicePath, file.name);
              const stat = await Deno.stat(filePath);
              serviceCount++;
              serviceSize += stat.size;
              stats.totalFiles++;
              stats.totalSize += stat.size;
            }
          }

          stats.services[entry.name] = {
            count: serviceCount,
            size: serviceSize,
          };
        }
      }
    } catch {
      // ディレクトリが存在しない場合
    }

    return stats;
  }
}
