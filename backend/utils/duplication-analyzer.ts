/**
 * 重複分析用のユーティリティクラス
 * ドキュメントの重複を分析し、統計情報を生成する
 */

import type { DocumentResult } from "../types/knowledge.js";

export interface DuplicationInfo {
  sections: Set<string>;
  providers: Set<string>;
  firstDoc: DocumentResult;
  count: number;
}

export interface DuplicationStats {
  totalDocuments: number;
  uniqueDocuments: number;
  duplicatesRemoved: number;
  duplicatePercentage: number;
  bySection: Record<string, Record<string, number>>;
  topDuplicates: Array<{
    key: string;
    sections: string[];
    providers: string[];
    count: number;
  }>;
}

export interface SectionDocumentTracker {
  section: string;
  doc: DocumentResult;
  key: string;
  // セクションごとの検索コンテキスト（どの検索クエリでヒットしたか）
  searchContext?: string;
}

export class DuplicationAnalyzer {
  private docKeyToInfo = new Map<string, DuplicationInfo>();
  private duplicateStats: Record<string, Record<string, number>> = {};
  // セクション内での重複追跡用
  private sectionDocumentSeen = new Map<string, Set<string>>();

  /**
   * ドキュメントを統計収集のために分析（重複除去はしない）
   */
  collectStatistics(
    doc: DocumentResult,
    sectionHitMap: Map<string, Set<string>>,
  ): void {
    const key = this.generateDocumentKey(doc);
    const sections = sectionHitMap.get(key) || new Set();
    const provider = doc.source.providerId;

    if (!this.docKeyToInfo.has(key)) {
      // 新規ドキュメント
      this.docKeyToInfo.set(key, {
        sections: new Set(sections),
        providers: new Set([provider]),
        firstDoc: doc,
        count: 1,
      });
    } else {
      // 既存ドキュメント
      const info = this.docKeyToInfo.get(key)!;
      info.count++;
      sections.forEach((s) => info.sections.add(s));
      info.providers.add(provider);

      // セクション-プロバイダー別の重複統計を更新
      this.updateDuplicateStats(sections, provider);
    }
  }

  /**
   * セクション内での重複をチェックし、重複除去を行う
   * 同一セクション内での同一ドキュメントは重複として扱う
   * 異なるセクション間での同一ドキュメントは許可
   */
  checkSectionDuplicate(
    section: string,
    doc: DocumentResult,
  ): { isDuplicate: boolean; key: string } {
    const key = this.generateDocumentKey(doc);

    if (!this.sectionDocumentSeen.has(section)) {
      this.sectionDocumentSeen.set(section, new Set());
    }

    const sectionDocs = this.sectionDocumentSeen.get(section)!;

    if (sectionDocs.has(key)) {
      // このセクション内で既に出現している
      return { isDuplicate: true, key };
    }

    // このセクション内で初めて出現
    sectionDocs.add(key);
    return { isDuplicate: false, key };
  }

  /**
   * ドキュメントキーを生成
   * 基本的にはURLまたはプロバイダーID:ドキュメントIDの組み合わせ
   * セクション固有のキーが必要な場合はgenerateSectionSpecificKeyを使用
   */
  private generateDocumentKey(doc: DocumentResult): string {
    return doc.url || `${doc.source.providerId}:${doc.id}`;
  }

  /**
   * セクション固有のドキュメントキーを生成
   * 同じURLでも異なるセクション・検索コンテキストなら別物として扱う
   */
  private generateSectionSpecificKey(
    doc: DocumentResult,
    section: string,
    searchContext?: string,
  ): string {
    const baseKey = this.generateDocumentKey(doc);
    // セクションと検索コンテキストを組み合わせて一意性を保証
    const contextPart = searchContext
      ? `:${this.hashContent(searchContext)}`
      : "";
    return `${baseKey}:${section}${contextPart}`;
  }

  /**
   * コンテンツの簡易ハッシュを生成（重複判定用）
   */
  private hashContent(content: string): string {
    // 簡易的なハッシュ実装（最初の100文字を使用）
    const normalized = content.trim().toLowerCase();
    const prefix = normalized.substring(0, 100);
    // prefixの内容とトータルの長さで一意性を確保
    return `${prefix}_len${normalized.length}`;
  }

  /**
   * セクション-プロバイダー別の重複統計を更新
   */
  private updateDuplicateStats(sections: Set<string>, provider: string): void {
    sections.forEach((section) => {
      if (!this.duplicateStats[section]) {
        this.duplicateStats[section] = {};
      }
      this.duplicateStats[section][provider] =
        (this.duplicateStats[section][provider] || 0) + 1;
    });
  }

  /**
   * 分析結果から統計情報を生成
   */
  generateStatistics(totalDocuments: number, topN = 5): DuplicationStats {
    const duplicateDetails: Array<{
      key: string;
      sections: string[];
      providers: string[];
      count: number;
    }> = [];

    let duplicatesRemoved = 0;

    // 重複詳細を収集
    for (const [key, info] of this.docKeyToInfo.entries()) {
      if (info.count > 1) {
        duplicatesRemoved += info.count - 1;
        duplicateDetails.push({
          key: this.truncateKey(key),
          sections: Array.from(info.sections),
          providers: Array.from(info.providers),
          count: info.count,
        });
      }
    }

    // トップN重複を取得
    const topDuplicates = duplicateDetails
      .sort((a, b) => b.count - a.count)
      .slice(0, topN);

    const uniqueDocuments = this.docKeyToInfo.size;
    const duplicatePercentage =
      totalDocuments > 0
        ? Math.round((duplicatesRemoved * 100) / totalDocuments)
        : 0;

    return {
      totalDocuments,
      uniqueDocuments,
      duplicatesRemoved,
      duplicatePercentage,
      bySection: this.duplicateStats,
      topDuplicates,
    };
  }

  /**
   * キーを読みやすい長さに切り詰める
   */
  private truncateKey(key: string, maxLength = 50): string {
    return key.length > maxLength ? key.substring(0, maxLength) + "..." : key;
  }

  /**
   * ユニークなドキュメントのリストを取得
   */
  getUniqueDocuments(): DocumentResult[] {
    return Array.from(this.docKeyToInfo.values()).map((info) => info.firstDoc);
  }

  /**
   * 複数のドキュメントリストからセクション内重複を除去
   * 同じURLでも検索コンテキストが異なれば別物として扱う
   * @param documentsWithSections セクション情報付きドキュメントのリスト
   * @returns セクション内重複を除去したドキュメントのリスト
   */
  deduplicateWithinSections(
    documentsWithSections: SectionDocumentTracker[],
  ): DocumentResult[] {
    const dedupedDocs: DocumentResult[] = [];
    const sectionSeenKeys = new Map<string, Set<string>>();

    for (const { section, doc, searchContext } of documentsWithSections) {
      // セクション固有のキーを生成（検索コンテキストも考慮）
      const sectionKey = this.generateSectionSpecificKey(
        doc,
        section,
        searchContext,
      );

      if (!sectionSeenKeys.has(section)) {
        sectionSeenKeys.set(section, new Set());
      }

      const seenInSection = sectionSeenKeys.get(section)!;

      if (!seenInSection.has(sectionKey)) {
        // このセクション内でこのコンテキストでは初めて出現
        seenInSection.add(sectionKey);
        dedupedDocs.push(doc);
      }
      // 同一セクション・同一コンテキストでの重複は除去（追加しない）
    }

    return dedupedDocs;
  }

  /**
   * 統計情報をコンソールに出力
   */
  printStatistics(stats: DuplicationStats): void {
    console.log(`[DRV1] 📊 Duplication Analysis:`);
    console.log(`  - Total documents: ${stats.totalDocuments}`);
    console.log(`  - Unique documents: ${stats.uniqueDocuments}`);
    console.log(
      `  - Duplicates removed: ${stats.duplicatesRemoved} (${stats.duplicatePercentage}%)`,
    );

    // セクション-プロバイダー別の重複統計
    if (Object.keys(stats.bySection).length > 0) {
      console.log(`  - Duplicates by section-provider:`);
      for (const [section, providers] of Object.entries(stats.bySection)) {
        for (const [provider, count] of Object.entries(providers)) {
          console.log(`    ${section} + ${provider}: ${count} duplicates`);
        }
      }
    }

    // トップ重複ドキュメント
    if (stats.topDuplicates.length > 0) {
      console.log(
        `  - Top ${stats.topDuplicates.length} most duplicated documents:`,
      );
      stats.topDuplicates.forEach((d) => {
        console.log(
          `    "${d.key}": ${d.count}x in [${d.sections.join(", ")}] from [${d.providers.join(
            ", ",
          )}]`,
        );
      });
    }
  }

  /**
   * インスタンスをリセット
   */
  reset(): void {
    this.docKeyToInfo.clear();
    this.duplicateStats = {};
  }
}
