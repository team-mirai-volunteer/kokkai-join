/**
 * DuplicationAnalyzer の単体テスト
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { DuplicationAnalyzer } from "./duplication-analyzer.ts";
import type { DocumentResult } from "../types/knowledge.ts";

// テスト用のドキュメントを作成するヘルパー関数
function createTestDocument(
  id: string,
  providerId: string,
  url?: string,
): DocumentResult {
  return {
    id,
    url,
    title: `Test Document ${id}`,
    content: `This is test document ${id}`,
    score: 0.9,
    source: {
      providerId,
      type: providerId,
    },
  };
}

Deno.test("DuplicationAnalyzer - 統計収集", () => {
  const analyzer = new DuplicationAnalyzer();
  const doc = createTestDocument(
    "doc1",
    "provider1",
    "https://example.com/doc1",
  );
  const sectionHitMap = new Map<string, Set<string>>();
  sectionHitMap.set(
    "https://example.com/doc1",
    new Set(["section1", "section2"]),
  );

  // 統計収集のみ（重複判定はしない）
  analyzer.collectStatistics(doc, sectionHitMap);

  const stats = analyzer.generateStatistics(1);
  assertEquals(stats.uniqueDocuments, 1);
  assertEquals(stats.duplicatesRemoved, 0);
});

Deno.test("DuplicationAnalyzer - セクション内重複の検出", () => {
  const analyzer = new DuplicationAnalyzer();
  const doc1 = createTestDocument(
    "doc1",
    "provider1",
    "https://example.com/doc1",
  );
  const doc2 = createTestDocument(
    "doc2",
    "provider2",
    "https://example.com/doc1",
  );

  // 同一セクション内でのチェック
  const result1 = analyzer.checkSectionDuplicate("section1", doc1);
  assertEquals(result1.isDuplicate, false);

  // 同一セクション内での重複（同じURL）
  const result2 = analyzer.checkSectionDuplicate("section1", doc2);
  assertEquals(result2.isDuplicate, true);
  assertEquals(result2.key, "https://example.com/doc1");

  // 異なるセクションでは重複ではない
  const result3 = analyzer.checkSectionDuplicate("section2", doc2);
  assertEquals(result3.isDuplicate, false);
});

Deno.test("DuplicationAnalyzer - deduplicateWithinSections without searchContext", () => {
  const analyzer = new DuplicationAnalyzer();

  const doc1 = createTestDocument(
    "doc1",
    "provider1",
    "https://example.com/doc1",
  );
  const doc2 = createTestDocument(
    "doc2",
    "provider2",
    "https://example.com/doc2",
  );

  const documentsWithSections = [
    { section: "intro", doc: doc1, key: "https://example.com/doc1" },
    { section: "intro", doc: doc1, key: "https://example.com/doc1" }, // 同一セクション内重複
    { section: "intro", doc: doc2, key: "https://example.com/doc2" },
    { section: "background", doc: doc1, key: "https://example.com/doc1" }, // 異なるセクションはOK
    { section: "background", doc: doc2, key: "https://example.com/doc2" },
  ];

  const dedupedDocs = analyzer.deduplicateWithinSections(documentsWithSections);

  // introセクション: doc1(最初), doc2
  // backgroundセクション: doc1, doc2
  // 合計4件
  assertEquals(dedupedDocs.length, 4);
});

Deno.test("DuplicationAnalyzer - deduplicateWithinSections with different searchContext", () => {
  const analyzer = new DuplicationAnalyzer();

  const doc1 = createTestDocument(
    "doc1",
    "provider1",
    "https://example.com/doc1",
  );

  const documentsWithSections = [
    // 同じURLだが異なる検索コンテキスト
    {
      section: "intro",
      doc: doc1,
      key: "https://example.com/doc1",
      searchContext: "防衛費 目的",
    },
    {
      section: "intro",
      doc: doc1,
      key: "https://example.com/doc1",
      searchContext: "少子化 対策",
    },
    // 同じ検索コンテキストの重複
    {
      section: "intro",
      doc: doc1,
      key: "https://example.com/doc1",
      searchContext: "防衛費 目的",
    },
  ];

  const dedupedDocs = analyzer.deduplicateWithinSections(documentsWithSections);

  // 異なる検索コンテキストは別物として扱う
  assertEquals(dedupedDocs.length, 2);
});

Deno.test("DuplicationAnalyzer - セクション情報の追跡", () => {
  const analyzer = new DuplicationAnalyzer();
  const doc1 = createTestDocument(
    "doc1",
    "provider1",
    "https://example.com/doc1",
  );
  const doc2 = createTestDocument(
    "doc2",
    "provider2",
    "https://example.com/doc1",
  );

  const sectionHitMap = new Map<string, Set<string>>();
  sectionHitMap.set(
    "https://example.com/doc1",
    new Set(["intro", "background"]),
  );

  analyzer.collectStatistics(doc1, sectionHitMap);

  // 2回目は異なるセクションで
  sectionHitMap.set("https://example.com/doc1", new Set(["conclusion"]));
  analyzer.collectStatistics(doc2, sectionHitMap);

  const stats = analyzer.generateStatistics(2);

  // 重複統計にセクション情報が含まれていることを確認
  const topDuplicate = stats.topDuplicates[0];
  assertExists(topDuplicate);
  assertEquals(topDuplicate.sections.length, 3);
  assertEquals(
    new Set(topDuplicate.sections),
    new Set(["intro", "background", "conclusion"]),
  );
});

Deno.test("DuplicationAnalyzer - プロバイダー情報の追跡", () => {
  const analyzer = new DuplicationAnalyzer();
  const doc1 = createTestDocument(
    "doc1",
    "provider1",
    "https://example.com/doc1",
  );
  const doc2 = createTestDocument(
    "doc2",
    "provider2",
    "https://example.com/doc1",
  );
  const doc3 = createTestDocument(
    "doc3",
    "provider3",
    "https://example.com/doc1",
  );

  const sectionHitMap = new Map<string, Set<string>>();

  analyzer.collectStatistics(doc1, sectionHitMap);
  analyzer.collectStatistics(doc2, sectionHitMap);
  analyzer.collectStatistics(doc3, sectionHitMap);

  const stats = analyzer.generateStatistics(3);

  const topDuplicate = stats.topDuplicates[0];
  assertExists(topDuplicate);
  assertEquals(topDuplicate.providers.length, 3);
  assertEquals(
    new Set(topDuplicate.providers),
    new Set(["provider1", "provider2", "provider3"]),
  );
});

Deno.test("DuplicationAnalyzer - 統計情報の生成", () => {
  const analyzer = new DuplicationAnalyzer();

  // 複数のドキュメントを追加
  const docs = [
    createTestDocument("doc1", "provider1", "https://example.com/doc1"),
    createTestDocument("doc2", "provider2", "https://example.com/doc1"), // 重複
    createTestDocument("doc3", "provider1", "https://example.com/doc2"),
    createTestDocument("doc4", "provider2", "https://example.com/doc2"), // 重複
    createTestDocument("doc5", "provider3", "https://example.com/doc3"),
  ];

  const sectionHitMap = new Map<string, Set<string>>();
  sectionHitMap.set("https://example.com/doc1", new Set(["section1"]));
  sectionHitMap.set("https://example.com/doc2", new Set(["section2"]));
  sectionHitMap.set("https://example.com/doc3", new Set(["section3"]));

  docs.forEach((doc) => analyzer.collectStatistics(doc, sectionHitMap));

  const stats = analyzer.generateStatistics(5);

  assertEquals(stats.totalDocuments, 5);
  assertEquals(stats.uniqueDocuments, 3);
  assertEquals(stats.duplicatesRemoved, 2);
  assertEquals(stats.duplicatePercentage, 40);
  assertEquals(stats.topDuplicates.length, 2);
});

Deno.test("DuplicationAnalyzer - セクション別重複統計", () => {
  const analyzer = new DuplicationAnalyzer();

  const doc1 = createTestDocument(
    "doc1",
    "provider1",
    "https://example.com/doc1",
  );
  const doc2 = createTestDocument(
    "doc2",
    "provider2",
    "https://example.com/doc1",
  );

  const sectionHitMap = new Map<string, Set<string>>();

  // doc1 は section1 で使用
  sectionHitMap.set("https://example.com/doc1", new Set(["section1"]));
  analyzer.collectStatistics(doc1, sectionHitMap);

  // doc2（同じURL）は section1 と section2 で使用
  sectionHitMap.set(
    "https://example.com/doc1",
    new Set(["section1", "section2"]),
  );
  analyzer.collectStatistics(doc2, sectionHitMap);

  const stats = analyzer.generateStatistics(2);

  // セクション-プロバイダー別の統計を確認
  assertExists(stats.bySection["section1"]);
  assertExists(stats.bySection["section1"]["provider2"]);
  assertEquals(stats.bySection["section1"]["provider2"], 1);

  assertExists(stats.bySection["section2"]);
  assertExists(stats.bySection["section2"]["provider2"]);
  assertEquals(stats.bySection["section2"]["provider2"], 1);
});

Deno.test("DuplicationAnalyzer - getUniqueDocuments", () => {
  const analyzer = new DuplicationAnalyzer();

  const docs = [
    createTestDocument("doc1", "provider1", "https://example.com/doc1"),
    createTestDocument("doc2", "provider2", "https://example.com/doc1"), // 重複
    createTestDocument("doc3", "provider1", "https://example.com/doc2"),
    createTestDocument("doc4", "provider2", "https://example.com/doc2"), // 重複
    createTestDocument("doc5", "provider3", "https://example.com/doc3"),
  ];

  const sectionHitMap = new Map<string, Set<string>>();
  docs.forEach((doc) => analyzer.collectStatistics(doc, sectionHitMap));

  const uniqueDocs = analyzer.getUniqueDocuments();

  assertEquals(uniqueDocs.length, 3);
  // 最初に追加されたドキュメントが保持される
  assertEquals(uniqueDocs[0].id, "doc1");
  assertEquals(uniqueDocs[1].id, "doc3");
  assertEquals(uniqueDocs[2].id, "doc5");
});

Deno.test("DuplicationAnalyzer - reset機能", () => {
  const analyzer = new DuplicationAnalyzer();

  const doc = createTestDocument(
    "doc1",
    "provider1",
    "https://example.com/doc1",
  );
  const sectionHitMap = new Map<string, Set<string>>();

  analyzer.collectStatistics(doc, sectionHitMap);

  let stats = analyzer.generateStatistics(1);
  assertEquals(stats.uniqueDocuments, 1);

  // リセット
  analyzer.reset();

  stats = analyzer.generateStatistics(0);
  assertEquals(stats.uniqueDocuments, 0);
  assertEquals(stats.totalDocuments, 0);

  // リセット後に新しいドキュメントを追加できる
  analyzer.collectStatistics(doc, sectionHitMap);
  stats = analyzer.generateStatistics(1);
  assertEquals(stats.uniqueDocuments, 1);
});

Deno.test("DuplicationAnalyzer - 空のセクションヒットマップの処理", () => {
  const analyzer = new DuplicationAnalyzer();
  const doc = createTestDocument(
    "doc1",
    "provider1",
    "https://example.com/doc1",
  );

  // 空のセクションヒットマップ
  const sectionHitMap = new Map<string, Set<string>>();

  analyzer.collectStatistics(doc, sectionHitMap);

  const stats = analyzer.generateStatistics(1);
  assertEquals(stats.uniqueDocuments, 1);
  assertEquals(Object.keys(stats.bySection).length, 0);
});

Deno.test("DuplicationAnalyzer - 大量の重複の処理", () => {
  const analyzer = new DuplicationAnalyzer();
  const sectionHitMap = new Map<string, Set<string>>();

  // 同じURLのドキュメントを10個作成
  const url = "https://example.com/popular-doc";
  sectionHitMap.set(url, new Set(["section1"]));

  for (let i = 0; i < 10; i++) {
    const doc = createTestDocument(`doc${i}`, `provider${i % 3}`, url);
    analyzer.collectStatistics(doc, sectionHitMap);
  }

  const stats = analyzer.generateStatistics(10);

  assertEquals(stats.totalDocuments, 10);
  assertEquals(stats.uniqueDocuments, 1);
  assertEquals(stats.duplicatesRemoved, 9);
  assertEquals(stats.duplicatePercentage, 90);

  // トップ重複ドキュメント
  assertEquals(stats.topDuplicates.length, 1);
  assertEquals(stats.topDuplicates[0].count, 10);
});

Deno.test("DuplicationAnalyzer - truncateKey の動作確認", () => {
  const analyzer = new DuplicationAnalyzer();

  // 長いURLのドキュメント
  const longUrl =
    "https://example.com/very/long/path/to/document/that/exceeds/fifty/characters/limit";
  const doc = createTestDocument("doc1", "provider1", longUrl);

  const sectionHitMap = new Map<string, Set<string>>();
  analyzer.collectStatistics(doc, sectionHitMap);

  const stats = analyzer.generateStatistics(1, 1);

  // topDuplicates には出ないが（重複していないため）、
  // 重複があった場合のキーの切り詰めをテスト
  assertEquals(stats.uniqueDocuments, 1);

  // 同じURLでもう一つ追加して重複を作る
  const doc2 = createTestDocument("doc2", "provider2", longUrl);
  analyzer.collectStatistics(doc2, sectionHitMap);

  const stats2 = analyzer.generateStatistics(2, 1);
  assertExists(stats2.topDuplicates[0]);
  // キーが50文字 + "..." になっていることを確認
  assertEquals(stats2.topDuplicates[0].key.length, 53);
  assertEquals(stats2.topDuplicates[0].key.endsWith("..."), true);
});

Deno.test("DuplicationAnalyzer - 複数セクションでの重複カウント", () => {
  const analyzer = new DuplicationAnalyzer();

  const doc1 = createTestDocument(
    "doc1",
    "provider1",
    "https://example.com/doc1",
  );
  const doc2 = createTestDocument(
    "doc2",
    "provider1",
    "https://example.com/doc1",
  );
  const doc3 = createTestDocument(
    "doc3",
    "provider2",
    "https://example.com/doc1",
  );

  const sectionHitMap = new Map<string, Set<string>>();

  // 各ドキュメントが異なるセクションの組み合わせで使われる
  sectionHitMap.set("https://example.com/doc1", new Set(["intro"]));
  analyzer.collectStatistics(doc1, sectionHitMap);

  sectionHitMap.set("https://example.com/doc1", new Set(["intro", "body"]));
  analyzer.collectStatistics(doc2, sectionHitMap);

  sectionHitMap.set(
    "https://example.com/doc1",
    new Set(["body", "conclusion"]),
  );
  analyzer.collectStatistics(doc3, sectionHitMap);

  const stats = analyzer.generateStatistics(3);

  // セクション別の重複統計を確認
  assertEquals(stats.bySection["intro"]["provider1"], 1);
  assertEquals(stats.bySection["body"]["provider1"], 1);
  assertEquals(stats.bySection["body"]["provider2"], 1);
  assertEquals(stats.bySection["conclusion"]["provider2"], 1);

  // トップ重複のセクション情報
  const topDup = stats.topDuplicates[0];
  assertEquals(
    new Set(topDup.sections),
    new Set(["intro", "body", "conclusion"]),
  );
});
