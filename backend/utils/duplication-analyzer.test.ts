/**
 * DuplicationAnalyzer の単体テスト
 */

import { describe, it, expect } from "vitest";
import { DuplicationAnalyzer } from "./duplication-analyzer.js";
import type { DocumentResult } from "../types/knowledge.js";

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

describe("DuplicationAnalyzer", () => {
	it("統計収集", () => {
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
		expect(stats.uniqueDocuments).toBe(1);
		expect(stats.duplicatesRemoved).toBe(0);
	});

	it("セクション内重複の検出", () => {
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
		expect(result1.isDuplicate).toBe(false);

		// 同一セクション内での重複（同じURL）
		const result2 = analyzer.checkSectionDuplicate("section1", doc2);
		expect(result2.isDuplicate).toBe(true);
		expect(result2.key).toBe("https://example.com/doc1");

		// 異なるセクションでは重複ではない
		const result3 = analyzer.checkSectionDuplicate("section2", doc2);
		expect(result3.isDuplicate).toBe(false);
	});

	it("deduplicateWithinSections without searchContext", () => {
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

		const dedupedDocs = analyzer.deduplicateWithinSections(
			documentsWithSections,
		);

		// introセクション: doc1(最初), doc2
		// backgroundセクション: doc1, doc2
		// 合計4件
		expect(dedupedDocs.length).toBe(4);
	});

	it("deduplicateWithinSections with different searchContext", () => {
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

		const dedupedDocs = analyzer.deduplicateWithinSections(
			documentsWithSections,
		);

		// 異なる検索コンテキストは別物として扱う
		expect(dedupedDocs.length).toBe(2);
	});

	it("セクション情報の追跡", () => {
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
		expect(topDuplicate).toBeDefined();
		expect(topDuplicate?.sections.length).toBe(3);
		expect(new Set(topDuplicate?.sections)).toEqual(
			new Set(["intro", "background", "conclusion"]),
		);
	});

	it("プロバイダー情報の追跡", () => {
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
		expect(topDuplicate).toBeDefined();
		expect(topDuplicate?.providers.length).toBe(3);
		expect(new Set(topDuplicate?.providers)).toEqual(
			new Set(["provider1", "provider2", "provider3"]),
		);
	});

	it("統計情報の生成", () => {
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

		expect(stats.totalDocuments).toBe(5);
		expect(stats.uniqueDocuments).toBe(3);
		expect(stats.duplicatesRemoved).toBe(2);
		expect(stats.duplicatePercentage).toBe(40);
		expect(stats.topDuplicates.length).toBe(2);
	});

	it("セクション別重複統計", () => {
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
		expect(stats.bySection["section1"]).toBeDefined();
		expect(stats.bySection["section1"]?.["provider2"]).toBeDefined();
		expect(stats.bySection["section1"]?.["provider2"]).toBe(1);

		expect(stats.bySection["section2"]).toBeDefined();
		expect(stats.bySection["section2"]?.["provider2"]).toBeDefined();
		expect(stats.bySection["section2"]?.["provider2"]).toBe(1);
	});

	it("getUniqueDocuments", () => {
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

		expect(uniqueDocs.length).toBe(3);
		// 最初に追加されたドキュメントが保持される
		expect(uniqueDocs[0]?.id).toBe("doc1");
		expect(uniqueDocs[1]?.id).toBe("doc3");
		expect(uniqueDocs[2]?.id).toBe("doc5");
	});

	it("reset機能", () => {
		const analyzer = new DuplicationAnalyzer();

		const doc = createTestDocument(
			"doc1",
			"provider1",
			"https://example.com/doc1",
		);
		const sectionHitMap = new Map<string, Set<string>>();

		analyzer.collectStatistics(doc, sectionHitMap);

		let stats = analyzer.generateStatistics(1);
		expect(stats.uniqueDocuments).toBe(1);

		// リセット
		analyzer.reset();

		stats = analyzer.generateStatistics(0);
		expect(stats.uniqueDocuments).toBe(0);
		expect(stats.totalDocuments).toBe(0);

		// リセット後に新しいドキュメントを追加できる
		analyzer.collectStatistics(doc, sectionHitMap);
		stats = analyzer.generateStatistics(1);
		expect(stats.uniqueDocuments).toBe(1);
	});

	it("空のセクションヒットマップの処理", () => {
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
		expect(stats.uniqueDocuments).toBe(1);
		expect(Object.keys(stats.bySection).length).toBe(0);
	});

	it("大量の重複の処理", () => {
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

		expect(stats.totalDocuments).toBe(10);
		expect(stats.uniqueDocuments).toBe(1);
		expect(stats.duplicatesRemoved).toBe(9);
		expect(stats.duplicatePercentage).toBe(90);

		// トップ重複ドキュメント
		expect(stats.topDuplicates.length).toBe(1);
		expect(stats.topDuplicates[0]?.count).toBe(10);
	});

	it("truncateKey の動作確認", () => {
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
		expect(stats.uniqueDocuments).toBe(1);

		// 同じURLでもう一つ追加して重複を作る
		const doc2 = createTestDocument("doc2", "provider2", longUrl);
		analyzer.collectStatistics(doc2, sectionHitMap);

		const stats2 = analyzer.generateStatistics(2, 1);
		expect(stats2.topDuplicates[0]).toBeDefined();
		// キーが50文字 + "..." になっていることを確認
		expect(stats2.topDuplicates[0]?.key.length).toBe(53);
		expect(stats2.topDuplicates[0]?.key.endsWith("...")).toBe(true);
	});

	it("複数セクションでの重複カウント", () => {
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
		expect(stats.bySection["intro"]?.["provider1"]).toBe(1);
		expect(stats.bySection["body"]?.["provider1"]).toBe(1);
		expect(stats.bySection["body"]?.["provider2"]).toBe(1);
		expect(stats.bySection["conclusion"]?.["provider2"]).toBe(1);

		// トップ重複のセクション情報
		const topDup = stats.topDuplicates[0];
		expect(new Set(topDup?.sections)).toEqual(
			new Set(["intro", "body", "conclusion"]),
		);
	});
});
