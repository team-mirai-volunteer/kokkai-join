import type { EvidenceRecord } from "../types/deepresearch.ts";
import type { PromptText } from "../types/kokkai.ts";

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

export function getSectionSynthesisSystemPrompt(): string {
  return `あなたは政策ドキュメントの編集者です。与えられた証拠（evidences）のみを根拠として、日本語で指定のセクションJSONを生成してください。出力は必ず有効なJSONのみで、余計な文言やコードフェンスは不要です。

要件:
- 他セクションは内容ごとに適切な evidence の id を citations に含める。
- timeline は items の各要素に date(YYYY-MM-DD) と text と citations を付ける。
- list は items の各要素に text と citations を付ける。
- JSONキーは固定: purpose_overview, current_status, timeline, key_points, background, main_issues, past_debates_summary。
- 事実に確信が持てない場合は曖昧表現を避け、記載しないか「不明」とする。
`;
}

export function createSectionSynthesisPrompt(
  userQuery: string,
  asOfDate: string | undefined,
  evidences: EvidenceRecord[],
): string {
  const evLines = evidences
    .map((e) => {
      const parts = [
        `id:${e.id}`,
        e.url ? `url:${e.url}` : undefined,
        e.date ? `date:${e.date}` : undefined,
        e.title ? `title:${e.title}` : undefined,
        e.excerpt ? `excerpt:${e.excerpt}` : undefined,
        `provider:${e.source.providerId}`,
      ].filter(Boolean);
      return `- ${parts.join(" | ")}`;
    })
    .join("\n");

  const sectionsDesc = `生成するセクション:
- purpose_overview (text)
- current_status (text)${asOfDate ? ` ※ ${asOfDate}時点での状況` : ""}
- timeline (timeline)
- key_points (list)
- background (text)
- main_issues (list)
- past_debates_summary (text)
`;

  return `質問: ${userQuery}
${asOfDate ? `対象時点: ${asOfDate}\n` : ""}

利用可能な証拠 (evidences):
${evLines}

${sectionsDesc}

出力は必ず次のJSONオブジェクトのみ：
{
  "purpose_overview": {"title":"法案の目的や概要","type":"text","content":"...","citations":["eX"]},
  "current_status": {"title":"現在の審議状況${
    asOfDate ? `（${asOfDate}時点、検索ベース）` : "（検索ベース）"
  }","type":"text","content":"...","citations":["eX"]},
  "timeline": {"title":"審議プロセスのタイムライン","type":"timeline","items":[{"date":"YYYY-MM-DD","text":"...","citations":["eX"]}]},
  "key_points": {"title":"法改正の重要ポイント","type":"list","items":[{"text":"...","citations":["eX"]}]},
  "background": {"title":"法案提出までの経緯（背景）","type":"text","content":"...","citations":["eX"]},
  "main_issues": {"title":"主要な論点（審議・実務で指摘された主なポイント）","type":"list","items":[{"text":"...","citations":["eX"]}]},
  "past_debates_summary": {"title":"過去の議論の要約","type":"text","content":"...","citations":["eX"]}
  }
}`;
}
