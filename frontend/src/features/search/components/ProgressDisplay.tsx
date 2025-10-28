import type { ProgressState } from "@/features/search/types/progress";

interface ProgressDisplayProps {
	progress: ProgressState;
}

/**
 * ProgressDisplay - 検索進捗表示コンポーネント
 *
 * 責務:
 * - ステップ進捗の表示 (例: "ステップ 1/5: クエリプランニング")
 * - オプショナルメッセージの表示
 * - セクション別進捗の表示 (例: "3/9 完了")
 * - プログレスバーによる視覚的な進捗表示
 *
 * 設計原則:
 * - プレゼンテーション専用（状態管理なし）
 * - 親コンポーネントから進捗状態を受け取る
 * - アクセシビリティ対応（ARIA属性）
 */
export function ProgressDisplay({ progress }: ProgressDisplayProps) {
	const { step, totalSteps, stepName, message, sectionProgress } = progress;

	// 全体の進捗率を計算 (%)
	const overallPercentage = Math.round((step / totalSteps) * 100);

	// セクション進捗率を計算 (%)
	const sectionPercentage = sectionProgress
		? Math.round((sectionProgress.completed / sectionProgress.total) * 100)
		: 0;

	return (
		<div className="progress-display">
			{/* ステップ情報 */}
			<div className="step-info">
				ステップ {step}/{totalSteps}: {stepName}
			</div>

			{/* 全体プログレスバー */}
			<div className="progress-bar-container">
				<div
					role="progressbar"
					aria-valuenow={overallPercentage}
					aria-valuemin={0}
					aria-valuemax={100}
					className="progress-bar"
					style={{ width: `${overallPercentage}%` }}
				/>
			</div>

			{/* オプショナルメッセージ */}
			{message && <div className="progress-message">{message}</div>}

			{/* セクション進捗 */}
			{sectionProgress && (
				<div className="section-progress">
					<div className="section-progress-text">
						{sectionProgress.completed}/{sectionProgress.total} 完了
					</div>
					<div className="section-progress-bar-container">
						<div
							role="progressbar"
							aria-label="section progress"
							aria-valuenow={sectionPercentage}
							aria-valuemin={0}
							aria-valuemax={100}
							className="section-progress-bar"
							style={{ width: `${sectionPercentage}%` }}
						/>
					</div>
				</div>
			)}
		</div>
	);
}
