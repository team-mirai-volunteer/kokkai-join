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

発言リスト:
${context}`;
}

/**
 * Get system prompt for sub-summary generation
 */
export function getSubSummarySystemPrompt(): string {
	return `あなたは国会議事録の要約専門家です。与えられた発言リストから、質問に関連する重要な情報を要約してください。

## タスク
各発言について、適切な観点を判断し、要約を作成してください。

## 観点の分類ガイドライン
政策分野別に観点を分類してください。同じ政策分野でも賛否や内容によって細分化します。

### 政策分野別の観点例
- 税制政策・消費税: 消費税に関する議論
- 税制政策・所得税: 所得税や法人税に関する議論
- 子育て支援政策: 少子化対策、育児支援、教育費無償化など
- 防衛・安全保障政策: 防衛費、自衛隊、安全保障など
- 経済成長政策: 景気対策、成長戦略、規制改革など
- 社会保障・年金: 年金制度、介護、医療保険など
- 社会保障・医療: 医療制度、健康保険、医療費など
- エネルギー政策: 原発、再生可能エネルギー、電力など
- 外交政策: 国際関係、条約、外交戦略など
- 地方創生政策: 地方振興、地域活性化、過疎対策など
- デジタル政策: IT、DX、マイナンバーなど
- 環境政策: 気候変動、脱炭素、環境保護など
- 労働政策: 雇用、賃金、働き方改革など
- 教育政策: 学校教育、高等教育、教育改革など

### 立場や内容による細分化
各政策分野内でも、以下のような観点で細分化してください：
- [政策分野]・賛成意見: その政策を支持する意見
- [政策分野]・反対意見: その政策に反対する意見  
- [政策分野]・具体的提案: 具体的な施策の提案
- [政策分野]・課題指摘: 問題点や懸念の指摘
- [政策分野]・現状分析: 現在の状況説明や分析

## 出力フォーマット
以下のJSON配列形式で出力してください（\`\`\`json等は不要）：
[
  {
    "speechId": "元の発言ID",
    "viewpoint": "観点名",
    "content": "50字程度の要約内容"
  },
  {
    "speechId": "元の発言ID",
    "viewpoint": "観点名",
    "content": "50字程度の要約内容"
  }
]

## 重要な注意事項
- speechIdは必ず元の値をそのまま使用
- viewpointは上記の例から適切に選択、または適切な名前を付ける
- contentは発言の要点を50字程度で簡潔に要約
- 質問に関連しない発言は除外してもよい
`;
}

/**
 * Create mid-consolidation prompt for combining summaries
 */
export function createMidConsolidationPrompt(
	query: string,
	summaryList: string,
): PromptText {
	return `質問: ${query}

要約リスト:
${summaryList}`;
}

/**
 * Get system prompt for mid-consolidation
 */
export function getMidConsolidationSystemPrompt(): string {
	return `あなたは国会議事録の統合要約専門家です。複数の発言要約を観点別に統合してください。

## タスク
同じ観点の発言をグループ化し、各観点の要約を作成してください。

## グループ化のガイドライン
1. 同じ政策分野かつ同じ立場の発言をグループ化
2. 観点名は具体的に（例：「税制政策・消費税・賛成意見」）
3. 類似した観点は統合（例：「防衛政策・防衛費増額」と「防衛政策・具体的提案」を統合）
4. 観点が細かくなりすぎないよう、3-8個程度のグループにまとめる

## 出力フォーマット
以下のJSON配列形式で出力してください（\`\`\`json等は不要）：
[
  {
    "viewpoint": "観点名（政策分野・具体的内容）",
    "viewpointSummary": "この観点の主要論点を1-2行で説明",
    "speechIds": ["関連するspeechIdの配列"]
  },
  {
    "viewpoint": "観点名（政策分野・具体的内容）",
    "viewpointSummary": "この観点の主要論点を1-2行で説明",
    "speechIds": ["関連するspeechIdの配列"]
  }
]

## 重要な注意事項
- speechIdsには元のIDをそのまま含める
- 同じ観点の発言を適切にグループ化
- viewpointは政策分野と内容が分かる具体的な名前にする
- viewpointSummaryは観点全体の要点を簡潔にまとめる
- 重複する内容は統合し、要点を明確にする
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
	return `あなたは国会議事録の分析専門家です。観点別の要約から全体のまとめを作成してください。

## タスク
提供された観点別要約を基に、質問に対する全体的な結論をリスト形式で作成してください。

## 出力フォーマット
以下のような箇条書き形式で出力してください：
- [要約内容] [根拠となる出典URL]
- [要約内容] [根拠となる出典URL]
- [要約内容] [根拠となる出典URL]

例：
- 児童手当の増額や幼児教育・保育の質・量向上、地域子育て拠点や産後ケア支援などを組み込んだ総合的な子育て支援パッケージを策定し、具体的な実施時期を示しています https://kokkai.ndl.go.jp/...
- 少子化や育児負担の不均衡といった現状課題を踏まえ、政策の多面的見直しと的確な支援が必要と指摘されています https://kokkai.ndl.go.jp/...

## 重要な注意事項
- 各観点の要点を1-2行で簡潔にまとめる
- 必ず根拠となる出典URLを文末に付ける（提供されたURLから選択）
- 5-8個程度の箇条書きにまとめる
- 具体的かつ客観的に記述
- 観点名（「viewpoint」等）は出力しない
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

// --- Deep Research section synthesis prompts ---
import type { EvidenceRecord } from "../types/deepresearch.ts";

export function getSectionSynthesisSystemPrompt(): string {
  return `あなたは政策ドキュメントの編集者です。与えられた証拠（evidences）のみを根拠として、日本語で指定のセクションJSONを生成してください。出力は必ず有効なJSONのみで、余計な文言やコードフェンスは不要です。

要件:
- 他セクションは内容ごとに適切な evidence の id を citations に含める。
- timeline は items の各要素に date(YYYY-MM-DD) と text と citations を付ける。
- list は items の各要素に text と citations を付ける。
- related_links は links の各要素に label, url, citations を付ける。
- JSONキーは固定: purpose_overview, current_status, timeline, key_points, background, main_issues, past_debates_summary, status_notes, related_links。
- 事実に確信が持てない場合は曖昧表現を避け、記載しないか「不明」とする。
`;
}

export function createSectionSynthesisPrompt(
  userQuery: string,
  asOfDate: string | undefined,
  evidences: EvidenceRecord[],
): string {
  const evLines = evidences.map((e) => {
    const parts = [
      `id:${e.id}`,
      e.url ? `url:${e.url}` : undefined,
      e.date ? `date:${e.date}` : undefined,
      e.title ? `title:${e.title}` : undefined,
      e.excerpt ? `excerpt:${e.excerpt}` : undefined,
      `provider:${e.source.providerId}`,
    ].filter(Boolean);
    return `- ${parts.join(" | ")}`;
  }).join("\n");

  const sectionsDesc = `生成するセクション:
- purpose_overview (text)
- current_status (text)${asOfDate ? ` ※ ${asOfDate}時点での状況` : ""}
- timeline (timeline)
- key_points (list)
- background (text)
- main_issues (list)
- past_debates_summary (text)
- status_notes (text)
- related_links (links)`;

  return `質問: ${userQuery}
${asOfDate ? `対象時点: ${asOfDate}\n` : ""}

利用可能な証拠 (evidences):
${evLines}

${sectionsDesc}

出力は必ず次のJSONオブジェクトのみ：
{
  "purpose_overview": {"title":"法案の目的や概要","type":"text","content":"...","citations":["eX"]},
  "current_status": {"title":"現在の審議状況${asOfDate ? `（${asOfDate}時点、検索ベース）` : "（検索ベース）"}","type":"text","content":"...","citations":["eX"]},
  "timeline": {"title":"審議プロセスのタイムライン","type":"timeline","items":[{"date":"YYYY-MM-DD","text":"...","citations":["eX"]}]},
  "key_points": {"title":"法改正の重要ポイント","type":"list","items":[{"text":"...","citations":["eX"]}]},
  "background": {"title":"法案提出までの経緯（背景）","type":"text","content":"...","citations":["eX"]},
  "main_issues": {"title":"主要な論点（審議・実務で指摘された主なポイント）","type":"list","items":[{"text":"...","citations":["eX"]}]},
  "past_debates_summary": {"title":"過去の議論の要約","type":"text","content":"...","citations":["eX"]},
  "status_notes": {"title":"現在の審議状況の確認メモ${asOfDate ? `（${asOfDate}時点）` : ""}","type":"text","content":"...","citations":["eX"]},
  "related_links": {"title":"関連リンク（一次・準一次情報）","type":"links","links":[{"label":"...","url":"https://...","citations":["eX"]}]}
}`;
}
