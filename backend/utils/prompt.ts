// Prompt generation utilities

import type { SpeechResult, PromptText } from "../types/kokkai.ts";

/**
 * Format speech results for prompt context
 */
export function formatSpeechResultsForPrompt(results: SpeechResult[]): string {
	return results
		.map(
			(result, index) =>
				`【発言 ${index + 1}】
議員: ${result.speaker} (${result.party})
日付: ${result.date}
会議: ${result.meeting}
内容: ${result.content}
出典: ${result.url}
関連度: ${result.score.toFixed(3)}`,
		)
		.join("\n\n");
}

/**
 * Create sub-summary prompt for Chain of Agents
 */
export function createSubSummaryPrompt(
	query: string,
	context: string,
	chunkIndex: number,
	totalChunks: number,
): PromptText {
	return `以下の国会議事録から、質問「${query}」に関連する重要な情報を観点別に整理して要約してください。

国会議事録（チャンク${chunkIndex + 1}/${totalChunks}）:
${context}

要約要件:
1. 観点別に整理（例：賛成意見、反対意見、具体的施策、懸念事項など）
2. 各観点に対して、発言者名、所属政党、日付、出典URLを保持
3. 具体的な数値や政策名を正確に記載
4. 発言内容は20-50字程度に要約
5. 500文字以内で簡潔にまとめる

要約:`;
}

/**
 * Create mid-consolidation prompt for combining summaries
 */
export function createMidConsolidationPrompt(
	query: string,
	midChunk: string[],
	startIndex: number,
): PromptText {
	return `以下の要約を統合して、質問「${query}」に対する中間要約を作成してください。

要約群:
${midChunk.map((s, idx) => `【要約${startIndex + idx + 1}】\n${s}`).join("\n\n")}

統合要件:
1. 観点別の整理を維持（賛成/反対、施策/課題など）
2. 重複を排除し、重要な情報を保持
3. 発言者情報と出典URLを必ず維持
4. 各観点の要点を明確にする
5. 800文字以内でまとめる

統合要約:`;
}

/**
 * Create query planning prompt
 */
export function createQueryPlanPrompt(userQuestion: string): PromptText {
	return `国会議事録検索システムのプランナーとして、以下の質問を分析してください。

質問: "${userQuestion}"

以下のJSON形式で出力してください（\`\`\`json等は不要）：
{
  "subqueries": [
    "質問を効果的に検索するための分解されたサブクエリ1",
    "サブクエリ2"
  ],
  "entities": {
    "speakers": ["議員名があれば具体的に。総理→岸田文雄等"],
    "parties": ["政党名があれば"],
    "topics": ["主要キーワード", "関連語・同義語"],
    "meetings": ["特定の委員会や会議があれば"],
    "positions": ["役職があれば具体的に"],
    "dateRange": {"start": "YYYY-MM-DD", "end": "YYYY-MM-DD"}
  },
  "enabledStrategies": ["vector", "structured"],
  "confidence": 0.8,
  "estimatedComplexity": 2
}

ルール:
1. subqueriesは質問を効果的に分解したもの（1-3個）
2. entitiesは国会議事録検索に有効な情報のみ抽出
3. enabledStrategiesは["vector", "structured", "statistical"]から選択
4. confidenceは解析の信頼度(0-1)
5. estimatedComplexityは処理の複雑さ(1-5)

例：
質問「岸田総理の防衛費についての発言」
→ speakers: ["岸田文雄", "内閣総理大臣"]
→ topics: ["防衛費", "防衛予算", "防衛関係費", "国防費"]
→ subqueries: ["岸田総理 防衛費", "内閣総理大臣 防衛予算"]`;
}

/**
 * Create final answer generation prompt
 */
export function createFinalAnswerPrompt(
	query: string,
	finalContext: string,
): PromptText {
	return `以下の要約情報を基に、質問に対する構造化された回答を作成してください。

質問: ${query}

要約情報:
${finalContext}

【必須の出力フォーマット】

## 全体のまとめ
（質問に対する結論を3-5行で簡潔に記載。根拠URLは不要）

## 観点別の詳細

### [観点名を記載（例：防衛費増額への賛成意見）]
#### 要約
（この観点の要約を2-3行で記載）

#### 詳細
| 発言者 | 所属 | 日付 | 内容（要約） | 出典 |
|--------|------|------|------------|------|
| 〇〇 | 〇〇党 | 2024-XX-XX | 発言内容を20-50字程度で要約 | https://kokkai.ndl.go.jp/txt/xxx/xxx |
| △△ | △△党 | 2024-XX-XX | 発言内容を20-50字程度で要約 | https://kokkai.ndl.go.jp/txt/yyy/yyy |

---

### [別の観点名を記載（例：財源確保に関する議論）]
#### 要約
（この観点の要約を2-3行で記載）

#### 詳細
| 発言者 | 所属 | 日付 | 内容（要約） | 出典 |
|--------|------|------|------------|------|
| □□ | □□党 | 2024-XX-XX | 発言内容を20-50字程度で要約 | https://kokkai.ndl.go.jp/txt/zzz/zzz |

（必要な観点数だけ繰り返し）

【注意事項】
1. 観点名は内容に応じた具体的な名前にする（「観点1」のような番号付けは不要）
2. 全体のまとめは最初に配置し、根拠URLは含めない
3. 詳細表の「内容」は要約とし、発言の直接引用は避ける
4. 各発言には必ず対応する出典URLを記載
5. 1つの表で発言情報と根拠URLを完結させる

回答:`;
}

/**
 * Create simple answer prompt (fallback)
 */
export function createSimpleAnswerPrompt(
	query: string,
	context: string,
): PromptText {
	return `以下の国会議事録から、質問に対して正確で詳細な回答を作成してください。

質問: ${query}

国会議事録:
${context}

回答要件:
1. 発言者名と所属政党を明記する
2. 発言の日付と会議名を含める
3. 具体的な内容を引用する
4. 出典URLを提示する
5. 複数の発言がある場合は比較・整理する際も、各要点に対応する出典URLを明記する
6. まとめ部分でも、根拠となった発言の出典URLを含める
7. 事実に基づいて回答し、推測は避ける

重要: 議論の比較・整理やまとめの各項目にも、必ず根拠となった発言の出典URL（例: https://kokkai.ndl.go.jp/txt/...）を併記してください。

回答:`;
}

/**
 * Create relevance evaluation prompt
 */
export function createRelevanceEvaluationPrompt(
	query: string,
	result: SpeechResult,
): PromptText {
	return `質問: ${query}

以下の国会議事録の内容が質問に関連しているか評価してください。

発言者: ${result.speaker}
発言内容: ${result.content}

以下の形式で回答してください：
- 関連性: (高/中/低/無関係)
- 理由: (簡潔に1行で)

回答:`;
}
