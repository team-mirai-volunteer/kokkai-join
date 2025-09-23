/**
 * AICacheManager の単体テスト
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { AICacheManager } from "./ai-cache-manager.ts";

// テスト用の一時ディレクトリ
const TEST_CACHE_DIR = "./test-ai-cache";

// テストデータ
const TEST_SERVICE = "test-service";
const TEST_INPUT = {
  query: "test query",
  model: "gpt-4",
  temperature: 0.5,
};
const TEST_OUTPUT = {
  result: "test result",
  data: [1, 2, 3],
  nested: {
    value: "nested value",
  },
};

// テスト前後のクリーンアップ
async function cleanupTestCache() {
  try {
    await Deno.remove(TEST_CACHE_DIR, { recursive: true });
  } catch {
    // ディレクトリが存在しない場合は無視
  }
}

Deno.test("AICacheManager - 基本的な保存と読み込み", async () => {
  await cleanupTestCache();

  const cache = new AICacheManager({
    enabled: true,
    directory: TEST_CACHE_DIR,
  });

  // 保存
  await cache.save(TEST_SERVICE, TEST_INPUT, TEST_OUTPUT);

  // 読み込み
  const loaded = await cache.load<typeof TEST_OUTPUT>(TEST_SERVICE, TEST_INPUT);

  assertExists(loaded);
  assertEquals(loaded, TEST_OUTPUT);

  await cleanupTestCache();
});

Deno.test("AICacheManager - 無効化時は保存されない", async () => {
  await cleanupTestCache();

  const cache = new AICacheManager({
    enabled: false,
    directory: TEST_CACHE_DIR,
  });

  // 保存（無効化されているので実際には保存されない）
  await cache.save(TEST_SERVICE, TEST_INPUT, TEST_OUTPUT);

  // 読み込み（nullが返るはず）
  const loaded = await cache.load<typeof TEST_OUTPUT>(TEST_SERVICE, TEST_INPUT);

  assertEquals(loaded, null);

  await cleanupTestCache();
});

Deno.test("AICacheManager - モックモード", async () => {
  await cleanupTestCache();

  // 先にキャッシュを作成
  const cacheForSave = new AICacheManager({
    enabled: true,
    directory: TEST_CACHE_DIR,
  });
  await cacheForSave.save(TEST_SERVICE, TEST_INPUT, TEST_OUTPUT);

  // モックモードで読み込み
  const cacheForMock = new AICacheManager({
    enabled: false, // enabledはfalseでも
    mockMode: true, // mockModeがtrueなら読み込める
    directory: TEST_CACHE_DIR,
  });

  const loaded = await cacheForMock.load<typeof TEST_OUTPUT>(
    TEST_SERVICE,
    TEST_INPUT,
  );

  assertExists(loaded);
  assertEquals(loaded, TEST_OUTPUT);
  assertEquals(cacheForMock.isMockMode(), true);

  await cleanupTestCache();
});

Deno.test("AICacheManager - 存在しないキャッシュの読み込み", async () => {
  await cleanupTestCache();

  const cache = new AICacheManager({
    enabled: true,
    directory: TEST_CACHE_DIR,
  });

  const loaded = await cache.load<typeof TEST_OUTPUT>(TEST_SERVICE, {
    nonExistent: "input",
  });

  assertEquals(loaded, null);

  await cleanupTestCache();
});

Deno.test("AICacheManager - キャッシュ存在チェック", async () => {
  await cleanupTestCache();

  const cache = new AICacheManager({
    enabled: true,
    directory: TEST_CACHE_DIR,
  });

  // 存在しない状態
  const existsBefore = await cache.exists(TEST_SERVICE, TEST_INPUT);
  assertEquals(existsBefore, false);

  // 保存
  await cache.save(TEST_SERVICE, TEST_INPUT, TEST_OUTPUT);

  // 存在する状態
  const existsAfter = await cache.exists(TEST_SERVICE, TEST_INPUT);
  assertEquals(existsAfter, true);

  await cleanupTestCache();
});

Deno.test("AICacheManager - 異なる入力には異なるキャッシュキー", async () => {
  await cleanupTestCache();

  const cache = new AICacheManager({
    enabled: true,
    directory: TEST_CACHE_DIR,
  });

  const input1 = { query: "query1" };
  const input2 = { query: "query2" };
  const output1 = { result: "result1" };
  const output2 = { result: "result2" };

  // 異なる入力で保存
  await cache.save(TEST_SERVICE, input1, output1);
  await cache.save(TEST_SERVICE, input2, output2);

  // それぞれ正しく読み込めることを確認
  const loaded1 = await cache.load<typeof output1>(TEST_SERVICE, input1);
  const loaded2 = await cache.load<typeof output2>(TEST_SERVICE, input2);

  assertEquals(loaded1, output1);
  assertEquals(loaded2, output2);

  await cleanupTestCache();
});

Deno.test("AICacheManager - サービス別のキャッシュクリア", async () => {
  await cleanupTestCache();

  const cache = new AICacheManager({
    enabled: true,
    directory: TEST_CACHE_DIR,
  });

  const service1 = "service1";
  const service2 = "service2";

  // 2つのサービスにキャッシュを保存
  await cache.save(service1, TEST_INPUT, { data: "service1" });
  await cache.save(service2, TEST_INPUT, { data: "service2" });

  // service1のキャッシュをクリア
  await cache.clearService(service1);

  // service1は削除され、service2は残っていることを確認
  const loaded1 = await cache.load(service1, TEST_INPUT);
  const loaded2 = await cache.load(service2, TEST_INPUT);

  assertEquals(loaded1, null);
  assertExists(loaded2);
  assertEquals(loaded2, { data: "service2" });

  await cleanupTestCache();
});

Deno.test("AICacheManager - 全キャッシュクリア", async () => {
  await cleanupTestCache();

  const cache = new AICacheManager({
    enabled: true,
    directory: TEST_CACHE_DIR,
  });

  // 複数のキャッシュを保存
  await cache.save("service1", TEST_INPUT, { data: "service1" });
  await cache.save("service2", TEST_INPUT, { data: "service2" });

  // 全キャッシュをクリア
  await cache.clearAll();

  // 全て削除されていることを確認
  const loaded1 = await cache.load("service1", TEST_INPUT);
  const loaded2 = await cache.load("service2", TEST_INPUT);

  assertEquals(loaded1, null);
  assertEquals(loaded2, null);

  await cleanupTestCache();
});

Deno.test("AICacheManager - 統計情報の取得", async () => {
  await cleanupTestCache();

  const cache = new AICacheManager({
    enabled: true,
    directory: TEST_CACHE_DIR,
  });

  // 初期状態
  const statsBefore = await cache.getStatistics();
  assertEquals(statsBefore.totalFiles, 0);
  assertEquals(statsBefore.totalSize, 0);

  // キャッシュを追加
  await cache.save("service1", { input: 1 }, { output: 1 });
  await cache.save("service1", { input: 2 }, { output: 2 });
  await cache.save("service2", { input: 3 }, { output: 3 });

  // 統計を取得
  const statsAfter = await cache.getStatistics();
  assertEquals(statsAfter.totalFiles, 3);
  assert(statsAfter.totalSize > 0);
  assertEquals(statsAfter.services["service1"].count, 2);
  assertEquals(statsAfter.services["service2"].count, 1);

  await cleanupTestCache();
});

Deno.test("AICacheManager - setEnabled/setMockMode", async () => {
  await cleanupTestCache();

  const cache = new AICacheManager({
    enabled: false,
    mockMode: false,
    directory: TEST_CACHE_DIR,
  });

  // 初期状態を確認
  assertEquals(cache.isMockMode(), false);

  // 有効化
  cache.setEnabled(true);
  await cache.save(TEST_SERVICE, TEST_INPUT, TEST_OUTPUT);
  const loaded1 = await cache.load<typeof TEST_OUTPUT>(
    TEST_SERVICE,
    TEST_INPUT,
  );
  assertExists(loaded1);

  // 無効化
  cache.setEnabled(false);
  const loaded2 = await cache.load<typeof TEST_OUTPUT>(
    TEST_SERVICE,
    TEST_INPUT,
  );
  assertEquals(loaded2, null);

  // モックモードを有効化
  cache.setMockMode(true);
  assertEquals(cache.isMockMode(), true);
  const loaded3 = await cache.load<typeof TEST_OUTPUT>(
    TEST_SERVICE,
    TEST_INPUT,
  );
  assertExists(loaded3);

  await cleanupTestCache();
});

Deno.test("AICacheManager - 複雑なオブジェクトのキャッシュ", async () => {
  await cleanupTestCache();

  const cache = new AICacheManager({
    enabled: true,
    directory: TEST_CACHE_DIR,
  });

  const complexObject = {
    array: [1, 2, 3, { nested: "value" }],
    map: new Map([
      ["key1", "value1"],
      ["key2", "value2"],
    ]),
    date: new Date("2024-01-01"),
    undefined: undefined,
    null: null,
    nested: {
      deep: {
        value: "deep value",
        array: [true, false],
      },
    },
  };

  // 保存と読み込み
  await cache.save(TEST_SERVICE, TEST_INPUT, complexObject);
  const loaded = await cache.load<typeof complexObject>(
    TEST_SERVICE,
    TEST_INPUT,
  );

  assertExists(loaded);
  // Map と Date は JSON化で失われるため、それ以外を確認
  assertEquals(loaded.array, complexObject.array);
  assertEquals(loaded.null, complexObject.null);
  assertEquals(loaded.nested, complexObject.nested);

  await cleanupTestCache();
});

Deno.test("AICacheManager - 環境変数による設定", async () => {
  await cleanupTestCache();

  // 環境変数を設定
  Deno.env.set("AI_CACHE_ENABLED", "true");
  Deno.env.set("AI_MOCK_MODE", "true");

  const cache = new AICacheManager({
    directory: TEST_CACHE_DIR,
  });

  // 環境変数が反映されていることを確認
  assertEquals(cache.isMockMode(), true);

  // キャッシュが有効になっていることを確認
  await cache.save(TEST_SERVICE, TEST_INPUT, TEST_OUTPUT);
  const loaded = await cache.load<typeof TEST_OUTPUT>(TEST_SERVICE, TEST_INPUT);
  assertExists(loaded);

  // 環境変数をクリーンアップ
  Deno.env.delete("AI_CACHE_ENABLED");
  Deno.env.delete("AI_MOCK_MODE");

  await cleanupTestCache();
});

// ヘルパー関数
function assert(condition: boolean, message?: string) {
  if (!condition) {
    throw new Error(message || "Assertion failed");
  }
}
