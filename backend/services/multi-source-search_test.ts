/**
 * MultiSourceSearchService のテスト
 */

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { MultiSourceSearchService } from "./multi-source-search.ts";
import type { SearchProvider } from "../providers/base.ts";
import type { DocumentResult, ProviderQuery } from "../types/knowledge.ts";

// モックプロバイダークラス
class MockProvider implements SearchProvider {
  constructor(
    public id: string,
    private results: DocumentResult[],
    private shouldFail = false,
  ) {}

  async search(_query: ProviderQuery): Promise<DocumentResult[]> {
    if (this.shouldFail) {
      throw new Error(`Provider ${this.id} intentionally failed`);
    }
    // 遅延をシミュレート
    await new Promise((resolve) => setTimeout(resolve, 10));
    return this.results;
  }
}

// テスト用のドキュメントを作成するヘルパー関数
function createTestDocument(
  id: string,
  providerId: string,
  content: string,
  url?: string,
  score?: number,
  title?: string,
): DocumentResult {
  return {
    id,
    url,
    title: title || `Document ${id}`,
    content,
    score,
    source: {
      providerId,
      type: providerId,
    },
  };
}

Deno.test("MultiSourceSearchService - 単一プロバイダーからの検索", async () => {
  const service = new MultiSourceSearchService();
  const docs = [
    createTestDocument(
      "doc1",
      "provider1",
      "Content 1",
      "http://test.com/1",
      0.9,
    ),
    createTestDocument(
      "doc2",
      "provider1",
      "Content 2",
      "http://test.com/2",
      0.8,
    ),
  ];

  const provider = new MockProvider("provider1", docs);
  const query: ProviderQuery = { query: "test", limit: 10 };

  const results = await service.searchAcross([provider], query);

  assertEquals(results.length, 2);
  assertEquals(results[0].id, "doc1");
  assertEquals(results[1].id, "doc2");
});

Deno.test("MultiSourceSearchService - 複数プロバイダーからの検索とマージ", async () => {
  const service = new MultiSourceSearchService();

  const docs1 = [
    createTestDocument(
      "doc1",
      "provider1",
      "Content 1",
      "http://test.com/1",
      0.9,
    ),
    createTestDocument(
      "doc2",
      "provider1",
      "Content 2",
      "http://test.com/2",
      0.8,
    ),
  ];

  const docs2 = [
    createTestDocument(
      "doc3",
      "provider2",
      "Content 3",
      "http://test.com/3",
      0.85,
    ),
    createTestDocument(
      "doc4",
      "provider2",
      "Content 4",
      "http://test.com/4",
      0.75,
    ),
  ];

  const provider1 = new MockProvider("provider1", docs1);
  const provider2 = new MockProvider("provider2", docs2);
  const query: ProviderQuery = { query: "test", limit: 10 };

  const results = await service.searchAcross([provider1, provider2], query);

  // 4つのドキュメントが返される（重複排除はしない）
  assertEquals(results.length, 4);

  // すべてのドキュメントIDが含まれている
  const ids = results.map((r) => r.id);
  assertEquals(ids.includes("doc1"), true);
  assertEquals(ids.includes("doc2"), true);
  assertEquals(ids.includes("doc3"), true);
  assertEquals(ids.includes("doc4"), true);
});

Deno.test("MultiSourceSearchService - プロバイダーエラー処理", async () => {
  const service = new MultiSourceSearchService();

  const docs1 = [
    createTestDocument(
      "doc1",
      "provider1",
      "Content 1",
      "http://test.com/1",
      0.9,
    ),
  ];

  const docs2 = [
    createTestDocument(
      "doc2",
      "provider3",
      "Content 2",
      "http://test.com/2",
      0.8,
    ),
  ];

  const provider1 = new MockProvider("provider1", docs1);
  const provider2 = new MockProvider("provider2", [], true); // このプロバイダーは失敗する
  const provider3 = new MockProvider("provider3", docs2);

  const query: ProviderQuery = { query: "test", limit: 10 };

  const results = await service.searchAcross(
    [provider1, provider2, provider3],
    query,
  );

  // provider2は失敗するが、他のプロバイダーの結果は取得される
  assertEquals(results.length, 2);
  assertEquals(results[0].id, "doc1");
  assertEquals(results[1].id, "doc2");
});

Deno.test("MultiSourceSearchService - 空の結果処理", async () => {
  const service = new MultiSourceSearchService();

  const provider1 = new MockProvider("provider1", []);
  const provider2 = new MockProvider("provider2", []);

  const query: ProviderQuery = { query: "test", limit: 10 };

  const results = await service.searchAcross([provider1, provider2], query);

  assertEquals(results.length, 0);
});

Deno.test("MultiSourceSearchService - 異なるプロバイダーからの同一IDドキュメント", async () => {
  const service = new MultiSourceSearchService();

  const docs1 = [
    createTestDocument("doc1", "provider1", "Content 1"), // URLなし
    createTestDocument("doc2", "provider1", "Content 2", "http://test.com/2"),
  ];

  const docs2 = [
    createTestDocument("doc1", "provider2", "Content 1 from provider2"), // 同じID、異なるプロバイダー
    createTestDocument("doc3", "provider2", "Content 3"),
  ];

  const provider1 = new MockProvider("provider1", docs1);
  const provider2 = new MockProvider("provider2", docs2);
  const query: ProviderQuery = { query: "test", limit: 10 };

  const results = await service.searchAcross([provider1, provider2], query);

  assertEquals(results.length, 4);

  // 各ドキュメントが存在することを確認
  const docs = results.filter((r) => r.id === "doc1");
  assertEquals(docs.length, 2); // doc1が2つ存在（異なるプロバイダーから）
});
