/**
 * セクション別検索の進捗情報
 */
export interface SectionProgress {
	completed: number; // 完了したセクション数
	total: number; // 総セクション数
}

/**
 * 進捗イベント (Discriminated Union)
 *
 * type: 'progress' - 処理中の進捗報告
 * type: 'synthesis_chunk' - セクション統合のストリームチャンク
 * type: 'complete' - 処理完了
 * type: 'error' - エラー発生
 */
export type ProgressEvent =
	| {
			type: "progress";
			step: number; // 現在のステップ番号 (1-based)
			totalSteps: number; // 総ステップ数
			stepName: string; // ステップ名 (例: "クエリプランニング")
			message?: string; // 詳細メッセージ (オプション)
			sectionProgress?: SectionProgress; // セクション検索時の進捗 (オプション)
	  }
	| {
			type: "synthesis_chunk";
			chunk: string; // LLMから生成されたテキストチャンク
	  }
	| {
			type: "complete";
			data: string; // 最終結果のmarkdown
	  }
	| {
			type: "error";
			step: number; // エラーが発生したステップ番号
			stepName: string; // エラーが発生したステップ名
			message: string; // エラーメッセージ
	  };

/**
 * UI用の進捗状態
 */
export interface ProgressState {
	step: number;
	totalSteps: number;
	stepName: string;
	message?: string;
	sectionProgress?: SectionProgress;
	synthesisText?: string; // セクション統合中に生成されたテキスト（チャンクの蓄積）
}
