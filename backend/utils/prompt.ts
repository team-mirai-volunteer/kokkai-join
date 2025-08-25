// Prompt generation utilities

import type { PromptText, SpeechResult } from "../types/kokkai.ts";

/**
 * Format speech results for prompt context
 */
export function formatSpeechResultsForPrompt(results: SpeechResult[]): string {
  return results
    .map(
      (result) =>
        `【発言 ${result.speechId}】
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
): PromptText {
  return `質問: ${query}

国会議事録:
${context}`;
}

/**
 * Get system prompt for sub-summary generation
 */
export function getSubSummarySystemPrompt(): string {
  return `あなたは国会議事録の要約専門家です。与えられた議事録から、質問に関連する重要な情報を観点別に整理して要約してください。

## 要約要件
1. 観点別に整理（賛成意見、反対意見、具体的施策、懸念事項など）
2. 各観点に対して、発言者名、所属政党、日付、出典URLを保持
3. 具体的な数値や政策名を正確に記載
4. 発言内容は50字程度に要約

## 出力フォーマット
### [観点名]
- 発言者: 名前（所属）、日付: YYYY-MM-DD、内容: 発言要約、URL: https://...
- 発言者: 名前（所属）、日付: YYYY-MM-DD、内容: 発言要約、URL: https://...

### [別の観点名]
- 発言者: 名前（所属）、日付: YYYY-MM-DD、内容: 発言要約、URL: https://...

## 重要な注意事項
- 指示文を回答に含めない
- 観点別の整理を重視
- データが存在しない項目は「不明」と記載
- 架空の日付や情報を作成しない
- 実際のデータの日付とURLをそのまま使用する
`;
}

/**
 * Create mid-consolidation prompt for combining summaries
 */
export function createMidConsolidationPrompt(
  query: string,
  midChunk: string[],
  startIndex: number,
): PromptText {
  return `質問: ${query}

要約群:
${midChunk.map((s, idx) => `【要約${startIndex + idx + 1}】\n${s}`).join("\n\n")}`;
}

/**
 * Get system prompt for mid-consolidation
 */
export function getMidConsolidationSystemPrompt(): string {
  return `あなたは国会議事録の統合要約専門家です。複数の要約を統合して、質問に対する中間要約を作成してください。

## 統合要件
1. 観点別の整理を維持（賛成/反対、施策/課題など）
2. 重複を排除し、重要な情報を保持
3. 発言者情報と出典URLを必ず維持
4. 各観点の要点を明確にする

## 出力フォーマット
### [観点名]
- 主要論点: [この観点の主要な論点を1-2行で説明]
- 発言者リスト:
  - 名前（所属）、日付: YYYY-MM-DD、内容: 発言要約、URL: https://...
  - 名前（所属）、日付: YYYY-MM-DD、内容: 発言要約、URL: https://...

### [別の観点名]
- 主要論点: [この観点の主要な論点を1-2行で説明]
- 発言者リスト:
  - 名前（所属）、日付: YYYY-MM-DD、内容: 発言要約、URL: https://...

## 重要な注意事項
- 指示文を回答に含めない
- 情報の正確性を保持
- データが存在しない項目は「不明」と記載
- 架空の日付や情報を作成しない
- 元データの日付とURLをそのまま保持する
`;
}

/**
 * Create query planning prompt
 */
export function createQueryPlanPrompt(userQuestion: string): PromptText {
  return `質問: "${userQuestion}"`;
}

/**
 * Get system prompt for query planning
 */
export function getQueryPlanSystemPrompt(): string {
  return `あなたは国会議事録検索システムのプランナーです。与えられた質問を分析して、効果的な検索計画を作成してください。

## 出力形式
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

## ルール
1. subqueriesは質問を効果的に分解したもの（1-3個）
2. entitiesは国会議事録検索に有効な情報のみ抽出
3. enabledStrategiesは["vector", "structured", "statistical"]から選択
4. confidenceは解析の信頼度(0-1)
5. estimatedComplexityは処理の複雑さ(1-5)

## 例
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
  return `質問: ${query}

要約情報:
${finalContext}`;
}

/**
 * Get system prompt for final answer generation
 */
export function getFinalAnswerSystemPrompt(): string {
  return `あなたは国会議事録の分析専門家です。以下のフォーマットに従って構造化された回答を作成してください。

## 出力フォーマット

1. 全体のまとめ
2. 観点別の詳細（複数の観点に分けて整理）
   - 各観点には要約と詳細表を含める
   - 詳細表には発言者、所属、日付、内容要約、出典URLを記載

## フォーマット例

## 全体のまとめ
（質問に対する結論を記載）

## 観点別の詳細

### [具体的な観点名]
#### 要約
（この観点の要約を2-3行で記載）

#### 詳細
| 発言者 | 所属 | 日付 | 内容（要約） | 出典 |
|--------|------|------|------------|------|
| 〇〇 | 〇〇党 | YYYY-MM-DD | 発言内容の要約 | https://kokkai.ndl.go.jp/txt/xxx |

## 重要な注意事項
- 観点名は内容に応じた具体的な名前にする
- 全体のまとめに根拠URLは含めない
- 詳細表の内容は20-50字程度に要約
- 各発言には必ず対応する出典URLを記載
- 指示文を回答に含めない
`;
}

/**
 * Create simple answer prompt (fallback)
 */
export function createSimpleAnswerPrompt(
  query: string,
  context: string,
): PromptText {
  return `質問: ${query}

国会議事録:
${context}`;
}

/**
 * Get system prompt for simple answer generation
 */
export function getSimpleAnswerSystemPrompt(): string {
  return `あなたは国会議事録の分析専門家です。以下の要件に従って正確で詳細な回答を作成してください。

## 回答要件
1. 発言者名と所属政党を明記する
2. 発言の日付と会議名を含める
3. 具体的な内容を引用する
4. 出典URLを提示する
5. 複数の発言がある場合は比較・整理する
6. 各要点に対応する出典URLを明記する
7. 事実に基づいて回答し、推測は避ける

## 重要な注意事項
- 議論の比較・整理やまとめの各項目にも、必ず根拠となった発言の出典URLを併記
- 指示文を回答に含めない
`;
}

/**
 * Create relevance evaluation prompt
 */
export function createRelevanceEvaluationPrompt(
  query: string,
  result: SpeechResult,
): PromptText {
  return `質問: ${query}

発言者: ${result.speaker}
発言内容: ${result.content}`;
}

/**
 * Get system prompt for relevance evaluation
 */
export function getRelevanceEvaluationSystemPrompt(): string {
  return `あなたは関連性評価の専門家です。与えられた国会議事録の内容が質問に関連しているか評価してください。

## 出力形式
以下の形式で回答してください：
- 関連性: (高/中/低/無関係)
- 理由: (簡潔に1行で)

## 評価基準
- 高: 質問に直接的に答える内容を含む
- 中: 質問に関連する話題だが、直接的な答えではない
- 低: わずかに関連するキーワードを含むが、文脈が異なる
- 無関係: 質問とは関係ない内容`;
}
