/**
 * DeepResearchOrchestrator の単体テスト
 */

import { describe, it, expect } from "vitest";
import { DeepResearchOrchestrator } from "./deepresearch-orchestrator.js";

describe("DeepResearchOrchestrator", () => {
	it("buildSectionQuery", () => {
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
			expect(hasKeyword).toBe(true);
		}
	});
});
