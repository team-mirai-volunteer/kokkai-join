/**
 * DeepResearchOrchestrator の単体テスト
 */

import { assertEquals } from "jsr:@std/assert@1.0.10";
import { DeepResearchOrchestrator } from "./deepresearch-orchestrator.ts";

Deno.test("DeepResearchOrchestrator - buildSectionQuery", () => {
  const orchestrator = new DeepResearchOrchestrator();

  const baseSubqueries = ["少子高齢化 対策 法案", "少子化 高齢化 対策"];
  const sectionKey = "purpose_overview";

  const result = orchestrator.buildSectionQuery(sectionKey, baseSubqueries);

  // 結果に含まれるキーワードを確認
  const resultWords = result.split(/\s+/);
  const expectedKeywords = [
    "対策",
    "法案",
    "少子化",
    "高齢化",
    "概要",
    "目的",
    "趣旨",
  ];

  // 少子高齢化 が分割されて 少子高齢化 として含まれる可能性もあるが、
  // 少なくとも個別のキーワードは含まれるはず
  for (const keyword of expectedKeywords) {
    const hasKeyword = resultWords.includes(keyword);
    assertEquals(hasKeyword, true, `Result should contain keyword: ${keyword}`);
  }
});
