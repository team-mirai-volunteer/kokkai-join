import type { EvidenceRecord } from "../types/deepresearch.js";

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
- impact は items の各要素に target（影響を受ける対象）、overview（概要）、reason（理由）、citations を付ける。
- JSONキーは固定: purpose_overview, current_status, timeline, key_points, background, main_issues, reasons_for_amendment, impact_analysis, past_debates_summary。
- reasons_for_amendment は背景や経緯の証拠から法改正が必要な理由を抽出してリスト化する。
- impact_analysis は証拠から法改正により影響を受ける対象とその内容を分析する。
- 事実に確信が持てない場合は曖昧表現を避け、記載しないか「不明」とする。
`;
}

/**
 * Markdownストリーミング生成用のシステムプロンプト
 */
export function getMarkdownSynthesisSystemPrompt(): string {
  return `あなたは政策ドキュメントの編集者です。与えられた証拠（evidences）のみを根拠として、Markdown形式のレポートを生成してください。

## 出力形式
Markdown形式で以下の構造に従ってください：

1. タイトル（# 質問のタイトル）
2. 日付情報（*YYYY-MM-DD時点の情報*）
3. 各セクション（## セクション名）
4. 引用（脚注形式: [^1], [^2]）
5. 引用リスト（最後に---で区切って）

## 引用ルール
- 文中で証拠を引用する際は [^1], [^2] などの脚注形式を使用
- 証拠のidと脚注番号の対応を管理
- 最後に区切り線（---）の後に全ての引用をリスト化
- 形式: [^1]: [タイトル](URL)

## セクション構造
1. 法案の目的や概要（テキスト + 引用）
2. 現在の審議状況（テキスト + 引用）
3. 審議プロセスのタイムライン（箇条書き、日付付き）
4. 法改正の重要ポイント（箇条書き）
5. 法案提出までの経緯（背景）（テキスト + 引用）
6. 主要な論点（箇条書き）
7. 法改正の理由（箇条書き）
8. 改正で影響を受けるもの（見出しと説明）
9. 過去の議論の要約（テキスト + 引用）

## 注意事項
- 余計なコードフェンス（\`\`\`markdown など）は不要
- 証拠にない情報は記載しない
- 事実に確信が持てない場合は曖昧表現を避ける
- 各プロバイダーから均等に引用する
`;
}

export function createSectionSynthesisPrompt(
  userQuery: string,
  asOfDate: string | undefined,
  evidences: EvidenceRecord[],
): string {
  // Group evidences by provider
  const groupedByProvider = new Map<string, EvidenceRecord[]>();
  for (const ev of evidences) {
    const providerId = ev.source.providerId;
    if (!groupedByProvider.has(providerId)) {
      groupedByProvider.set(providerId, []);
    }
    groupedByProvider.get(providerId)?.push(ev);
  }

  // Sort each provider's evidences by score (descending)
  for (const records of groupedByProvider.values()) {
    records.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  }

  // Build evidence list grouped by provider
  const providerSections: string[] = [];
  for (const [providerId, records] of groupedByProvider.entries()) {
    const lines = records.map((e) => {
      const parts = [
        `id:${e.id}`,
        `score:${(e.score ?? 0).toFixed(3)}`,
        e.url ? `url:${e.url}` : undefined,
        e.date ? `date:${e.date}` : undefined,
        e.title ? `title:${e.title}` : undefined,
        e.excerpt ? `excerpt:${e.excerpt}` : undefined,
      ].filter(Boolean);
      return `  - ${parts.join(" | ")}`;
    });
    providerSections.push(
      `[${providerId}] (${records.length}件)\n${lines.join("\n")}`,
    );
  }
  const evLines = providerSections.join("\n\n");

  const sectionsDesc = `生成するセクション:
- purpose_overview (text)
- current_status (text)${asOfDate ? ` ※ ${asOfDate}時点での状況` : ""}
- timeline (timeline)
- key_points (list)
- background (text)
- main_issues (list)
- reasons_for_amendment (list)
- impact_analysis (impact)
- past_debates_summary (text)
`;

  // 利用可能なプロバイダーのリストを生成
  const availableProviders = Array.from(groupedByProvider.keys());
  const providerList = availableProviders.map((p) => `[${p}]`).join(", ");

  const usageConstraints = `
## 証拠の使用ルール（必須）
1. **各プロバイダー（${providerList}）から最低3件以上**のevidenceを必ず引用してください
   - 例: kokkai-dbから3件、openai-webから3件、pdf-extractから3件など
   - 全てのプロバイダーから均等に引用することを強く推奨します
2. スコアが高いevidenceを優先的に使用してください
3. 質問と無関係な内容は使用しないでください
4. 各セクションで使用したevidenceのidをcitationsに含めてください
`;

  return `質問: ${userQuery}
${asOfDate ? `対象時点: ${asOfDate}\n` : ""}

利用可能な証拠 (evidences):
${evLines}
${usageConstraints}

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
  "reasons_for_amendment": {"title":"法改正の理由","type":"list","items":[{"text":"...","citations":["eX"]}]},
  "impact_analysis": {"title":"改正で影響を受けるもの","type":"impact","items":[{"target":"...","overview":"...","reason":"...","citations":["eX"]}]},
  "past_debates_summary": {"title":"過去の議論の要約","type":"text","content":"...","citations":["eX"]}
  }
}`;
}

/**
 * Markdownストリーミング生成用のユーザープロンプト
 */
export function createMarkdownSynthesisPrompt(
  userQuery: string,
  asOfDate: string | undefined,
  evidences: EvidenceRecord[],
): string {
  // Group evidences by provider
  const groupedByProvider = new Map<string, EvidenceRecord[]>();
  for (const ev of evidences) {
    const providerId = ev.source.providerId;
    if (!groupedByProvider.has(providerId)) {
      groupedByProvider.set(providerId, []);
    }
    groupedByProvider.get(providerId)?.push(ev);
  }

  // Sort each provider's evidences by score (descending)
  for (const records of groupedByProvider.values()) {
    records.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  }

  // Build evidence list grouped by provider with citation mapping
  const providerSections: string[] = [];
  let citationCounter = 1;
  const evidenceIdToCitation = new Map<string, number>();

  for (const [providerId, records] of groupedByProvider.entries()) {
    const lines = records.map((e) => {
      // Assign citation number
      if (!evidenceIdToCitation.has(e.id)) {
        evidenceIdToCitation.set(e.id, citationCounter++);
      }
      const citationNum = evidenceIdToCitation.get(e.id);

      const parts = [
        `[^${citationNum}]`,
        `id:${e.id}`,
        `score:${(e.score ?? 0).toFixed(3)}`,
        e.url ? `url:${e.url}` : undefined,
        e.date ? `date:${e.date}` : undefined,
        e.title ? `title:${e.title}` : undefined,
        e.excerpt ? `excerpt:${e.excerpt}` : undefined,
      ].filter(Boolean);
      return `  ${parts.join(" | ")}`;
    });
    providerSections.push(
      `[${providerId}] (${records.length}件)\n${lines.join("\n")}`,
    );
  }
  const evLines = providerSections.join("\n\n");

  // 利用可能なプロバイダーのリストを生成
  const availableProviders = Array.from(groupedByProvider.keys());
  const providerList = availableProviders.map((p) => `[${p}]`).join(", ");

  const usageConstraints = `
## 証拠の使用ルール（必須）
1. **各プロバイダー（${providerList}）から最低3件以上**のevidenceを必ず引用してください
   - 例: kokkai-dbから3件、openai-webから3件、pdf-extractから3件など
   - 全てのプロバイダーから均等に引用することを強く推奨します
2. スコアが高いevidenceを優先的に使用してください
3. 質問と無関係な内容は使用しないでください
4. 引用する際は対応する [^番号] を使用してください
`;

  return `質問: ${userQuery}
${asOfDate ? `対象時点: ${asOfDate}\n` : ""}

利用可能な証拠 (evidences):
${evLines}
${usageConstraints}

以下の形式でMarkdownレポートを生成してください：

# ${userQuery}
${asOfDate ? `\n*${asOfDate}時点の情報*\n` : ""}
## 法案の目的や概要

[内容を記述し、引用は[^1]形式で]

## 現在の審議状況${asOfDate ? `（${asOfDate}時点、検索ベース）` : "（検索ベース）"}

[内容を記述し、引用は[^2]形式で]

## 審議プロセスのタイムライン

- **YYYY-MM-DD**: [内容][^3]
- **YYYY-MM-DD**: [内容][^4]

## 法改正の重要ポイント

- [ポイント1][^5]
- [ポイント2][^6]

## 法案提出までの経緯（背景）

[内容を記述し、引用は[^7]形式で]

## 主要な論点（審議・実務で指摘された主なポイント）

- [論点1][^8]
- [論点2][^9]

## 法改正の理由

- [理由1][^10]
- [理由2][^11]

## 改正で影響を受けるもの

### [対象1]

概要: [内容]

理由: [内容][^12]

### [対象2]

概要: [内容]

理由: [内容][^13]

## 過去の議論の要約

[内容を記述し、引用は[^14]形式で]

---

[^1]: [タイトル](URL)
[^2]: [タイトル](URL)
...
`;
}
