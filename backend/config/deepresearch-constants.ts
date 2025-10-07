/**
 * Deep Research用の定数設定
 * 各セクションの探索に対する許可プロバイダーとターゲット件数を定義
 */

/**
 * セクションごとに許可されたプロバイダーのリスト
 * 各セクションの性質に応じて、適切な情報源を選択
 */
export const SECTION_ALLOWED_PROVIDERS: Record<string, ("gov-meeting-rag" | "openai-web" | "kokkai-db")[]> = {
  // 目的・概要: 主にWeb検索で最新情報を取得
  purpose_overview: ["openai-web"],

  // 現状: 国会DBとWeb検索の両方から情報収集
  current_status: ["kokkai-db", "openai-web", "gov-meeting-rag"],

  // タイムライン: 時系列情報は両ソースから
  timeline: ["kokkai-db", "openai-web"],

  // 要点: Web検索で幅広く情報収集
  key_points: ["openai-web"],

  // 背景: 両ソースから背景情報を収集
  background: ["openai-web", "kokkai-db"],

  // 主要論点: 両ソースから議論の内容を収集
  main_issues: ["openai-web", "kokkai-db", "gov-meeting-rag"],

  // 法改正の理由: 既存の証拠から統合するため、追加検索は不要
  reasons_for_amendment: [],

  // 影響分析: 両ソースから影響・効果に関する情報を収集
  impact_analysis: ["kokkai-db", "openai-web", "gov-meeting-rag"],

  // 過去の議論サマリー: 国会DBを優先
  past_debates_summary: ["kokkai-db"],
};

/**
 * セクションごとの最小ターゲット件数
 * 各セクションで最低限必要とする情報源の数
 */
export const SECTION_TARGET_COUNTS: Record<string, number> = {
  purpose_overview: 2, // 概要は2件で十分
  current_status: 1, // 現状は1件でも可
  timeline: 3, // タイムラインは3件欲しい
  key_points: 3, // 要点も3件
  background: 2, // 背景は2件
  main_issues: 3, // 論点は3件
  reasons_for_amendment: 0, // 既存の証拠から統合するため、追加検索は不要
  impact_analysis: 2, // 影響分析は2件
  past_debates_summary: 3, // 過去の議論は3件
};
