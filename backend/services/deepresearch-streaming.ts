import { DEFAULT_TOP_K_RESULTS } from "../config/constants.js";
import {
	SECTION_ALLOWED_PROVIDERS,
	SECTION_TARGET_COUNTS,
} from "../config/deepresearch-constants.js";
import type { SearchProvider } from "../providers/base.js";
import type { DeepResearchRequestValidated } from "../schemas/deepresearch-validation.js";
import type {
	DeepResearchResponse,
	DeepResearchSections,
	EvidenceRecord,
} from "../types/deepresearch.js";
import { toEvidenceRecord } from "../types/deepresearch.js";
import type { DocumentResult } from "../types/knowledge.js";
import type { ProgressEvent } from "../types/progress.js";
import { convertDeepResearchToMarkdown } from "../utils/markdown-converter.js";

/**
 * IO関数の型定義
 * 進捗イベントを送信する関数
 */
export type EmitFn = (event: ProgressEvent) => Promise<void>;

/**
 * Hono用のemit関数を生成
 * @param stream HonoのSSEストリーム
 */
export function createHonoEmit(stream: {
	writeSSE: (message: { data: string; event?: string }) => Promise<void>;
}): EmitFn {
	return async (event: ProgressEvent) => {
		const data = JSON.stringify(event);
		// SSEイベント名を'progress'に統一
		await stream.writeSSE({ data, event: "progress" });
	};
}

/**
 * ステップ定義
 * - ファイルあり: 5ステップ (クエリプランニング → セクション別検索 → PDF抽出 → 証拠レコード構築 → セクション統合)
 * - ファイルなし: 4ステップ (PDF抽出をスキップ)
 */
const STEP_NAMES = {
	1: "クエリプランニング",
	2: "セクション別検索",
	3: "PDF抽出",
	4: "証拠レコード構築",
	5: "セクション統合",
} as const;

/**
 * サービス依存関係の型定義
 * テスト可能にするため、具体的なメソッドシグネチャを定義
 */
export interface StreamingServices {
	queryPlanning: {
		createQueryPlan: (query: string) => Promise<{
			subqueries?: string[];
			entities: { speakers?: string[]; topics?: string[] };
			enabledStrategies: string[];
			confidence: number;
		}>;
	};
	orchestrator: {
		run: (params: {
			baseSubqueries: string[];
			providers: SearchProvider[];
			allowBySection: Record<string, string[]>;
			targets: Record<string, number>;
			limit: number;
			onSectionComplete?: () => void;
		}) => Promise<{
			finalDocs: DocumentResult[];
			sectionHitMap: Map<string, Set<string>>;
			iterations: number;
		}>;
	};
	pdfExtraction: {
		extractBySections: (params: {
			query: string;
			fileName: string;
			fileBuffer: Buffer;
			mimeType: string;
		}) => Promise<Array<{ sectionKey: string; docs: DocumentResult[] }>>;
	};
	sectionSynthesis: {
		synthesize: (
			query: string,
			asOfDate: string | undefined,
			evidences: EvidenceRecord[],
		) => Promise<DeepResearchSections>;
	};
	providerRegistry: {
		byIds: (ids: string[]) => SearchProvider[];
	};
}

/**
 * ストリーミング型のDeepResearch実行
 * emit関数を注入することでテスト可能
 *
 * 処理フロー:
 * 1. クエリプランニング - AIによるクエリ分析
 * 2. セクション別検索 - 9セクションの並列検索（進捗コールバック付き）
 * 3. PDF抽出 - アップロードファイルの処理（ファイルがある場合）
 * 4. 証拠レコード構築 - ドキュメント整理と番号付け（重複除去を含む）
 * 5. セクション統合 - AIによる最終回答生成
 */
export async function executeDeepResearchStreaming(
	request: DeepResearchRequestValidated,
	emit: EmitFn,
	services: StreamingServices,
): Promise<void> {
	// 総ステップ数を動的に計算（ファイルの有無で変動）
	const hasFiles = request.files && request.files.length > 0;
	const totalSteps = hasFiles ? 5 : 4;

	let currentStep = 0;

	try {
		// ステップ1: クエリプランニング
		currentStep = 1;
		await emit({
			type: "progress",
			step: currentStep,
			totalSteps,
			stepName: STEP_NAMES[1],
			message: "クエリを分析しています...",
		});

		const plan = await services.queryPlanning.createQueryPlan(request.query);
		const subqueries =
			plan.subqueries && plan.subqueries.length > 0
				? plan.subqueries
				: [request.query];

		// ステップ2: セクション別検索
		currentStep = 2;
		const sectionTotal = 9;
		let sectionCompleted = 0;

		await emit({
			type: "progress",
			step: currentStep,
			totalSteps,
			stepName: STEP_NAMES[2],
			sectionProgress: { completed: sectionCompleted, total: sectionTotal },
		});

		// プロバイダー取得
		const providersRequested = request.providers ?? [];
		const providers = services.providerRegistry.byIds(providersRequested);
		const limit = request.limit ?? DEFAULT_TOP_K_RESULTS;

		// 進捗コールバック
		const onSectionComplete = () => {
			sectionCompleted++;
			// Note: この関数は同期的に呼ばれるため、awaitできない
			// emitは非同期だが、ここでは結果を待たずに次に進む
			emit({
				type: "progress",
				step: currentStep,
				totalSteps,
				stepName: STEP_NAMES[2],
				sectionProgress: { completed: sectionCompleted, total: sectionTotal },
			});
		};

		const orchestratorResult = await services.orchestrator.run({
			baseSubqueries: subqueries,
			providers,
			allowBySection: SECTION_ALLOWED_PROVIDERS,
			targets: SECTION_TARGET_COUNTS,
			limit,
			onSectionComplete,
		});

		const { finalDocs, sectionHitMap, iterations } = orchestratorResult;

		// ステップ3: PDF抽出（ファイルがある場合）
		if (request.files && request.files.length > 0) {
			currentStep = 3;
			await emit({
				type: "progress",
				step: currentStep,
				totalSteps,
				stepName: STEP_NAMES[3],
				message: `${request.files.length}個のファイルを処理中...`,
			});

			const fileContexts = request.files.map((file) => ({
				name: file.name,
				buffer: Buffer.from(file.content, "base64"),
				mimeType: file.mimeType,
			}));

			const pdfSectionResultsArray = await Promise.all(
				fileContexts.map((fileContext) =>
					services.pdfExtraction.extractBySections({
						query: [request.query, ...subqueries].join(" "),
						fileName: fileContext.name,
						fileBuffer: fileContext.buffer,
						mimeType: fileContext.mimeType,
					}),
				),
			);

			// 複数ファイルの結果をフラット化して統合
			const pdfSectionResults = pdfSectionResultsArray.flat();
			for (const { sectionKey, docs } of pdfSectionResults) {
				for (const doc of docs) {
					finalDocs.push(doc);
					const key = doc.url ?? `${doc.source.providerId}:${doc.id}`;
					let sectionsForDoc = sectionHitMap.get(key);
					if (!sectionsForDoc) {
						sectionsForDoc = new Set<string>();
						sectionHitMap.set(key, sectionsForDoc);
					}
					sectionsForDoc.add(sectionKey);
				}
			}
		}

		// ステップ4: 証拠レコード構築（重複除去を含む）
		// ファイルがない場合は、このステップが実質的にステップ3になる
		currentStep = hasFiles ? 4 : 3;
		await emit({
			type: "progress",
			step: currentStep,
			totalSteps,
			stepName: STEP_NAMES[4],
			message: "ドキュメントを整理しています...",
		});

		const evidences = buildEvidences(finalDocs, sectionHitMap);

		// ステップ5: セクション統合
		// ファイルがない場合は、このステップが実質的にステップ4になる
		currentStep = hasFiles ? 5 : 4;
		await emit({
			type: "progress",
			step: currentStep,
			totalSteps,
			stepName: STEP_NAMES[5],
			message: "AIが回答を生成しています...",
		});

		// 0件の場合は早期リターン（LLMを呼ばない）
		if (evidences.length === 0) {
			console.log("[Streaming] No evidences found, sending empty result");
			const emptyMarkdown = `# ${request.query}\n\n## 検索結果\n\n検索条件に一致する情報が見つかりませんでした。\n\n以下の点をお試しください：\n- 検索キーワードを変更する\n- より一般的な用語を使用する\n- 検索対象を増やす`;

			await emit({
				type: "complete",
				data: emptyMarkdown,
			});
			return;
		}

		const sections = await services.sectionSynthesis.synthesize(
			request.query,
			request.asOfDate,
			evidences,
		);

		// 使用されたプロバイダーIDを収集
		const usedProviderIds = providers.map((p) => p.id);

		const response: DeepResearchResponse = {
			query: request.query,
			asOfDate: request.asOfDate,
			sections,
			evidences,
			metadata: {
				usedProviders: usedProviderIds,
				iterations,
				totalResults: finalDocs.length,
				processingTime: 0, // ここでは計測しない（APIレイヤーで計測）
				timestamp: new Date().toISOString(),
			},
		};

		const markdown = convertDeepResearchToMarkdown(response);

		console.log(
			`[Streaming] Sending complete event (markdown length: ${markdown.length}, evidences: ${evidences.length})`,
		);

		// 完了
		await emit({
			type: "complete",
			data: markdown,
		});
	} catch (error) {
		// エラー時は発生したステップ情報を含める
		await emit({
			type: "error",
			step: currentStep,
			stepName:
				STEP_NAMES[currentStep as keyof typeof STEP_NAMES] || "不明なステップ",
			message: error instanceof Error ? error.message : "不明なエラー",
		});
		throw error;
	}
}

/**
 * 証拠レコード構築ヘルパー
 * 重複を除去しながらEvidenceRecordを構築
 *
 * @param finalDocs 収集されたドキュメント一覧
 * @param sectionHitMap ドキュメントがヒットしたセクション情報
 * @returns 一意のEvidenceRecordの配列
 */
function buildEvidences(
	finalDocs: DocumentResult[],
	sectionHitMap: Map<string, Set<string>>,
): EvidenceRecord[] {
	const evidenceMap = new Map<string, EvidenceRecord>();
	const evidences: EvidenceRecord[] = [];
	let ecount = 0;

	for (const d of finalDocs) {
		const key = d.url || `${d.source.providerId}:${d.id}`;
		if (evidenceMap.has(key)) continue;

		ecount += 1;
		const eid = `e${ecount}`;
		const rec = toEvidenceRecord(d, eid);
		const hints = sectionHitMap.get(key);
		if (hints?.size) rec.sectionHints = Array.from(hints);

		evidenceMap.set(key, rec);
		evidences.push(rec);
	}

	return evidences;
}
