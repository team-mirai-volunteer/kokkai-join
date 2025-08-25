// Cerebras Cloud SDK設定
import Cerebras from "npm:@cerebras/cerebras_cloud_sdk";

// 固定モデル名（APIで確認済み）
export const CEREBRAS_MODEL = "gpt-oss-120b"; // OpenAI GPT-OSS 120Bモデル

// 遅延初期化のためのクライアント
let _cerebrasClient: Cerebras | null = null;

// Cerebrasクライアントを取得（遅延初期化）
export function getCerebrasClient(): Cerebras {
	if (!_cerebrasClient) {
		const apiKey = Deno.env.get("CEREBRAS_API_KEY");
		if (!apiKey) {
			throw new Error("CEREBRAS_API_KEY environment variable is required");
		}
		_cerebrasClient = new Cerebras({ apiKey });
	}
	return _cerebrasClient;
}

// 互換性のためのエクスポート（既存コードが動作するように）
// deno-lint-ignore no-explicit-any
type CreateParams = any;

export const cerebrasClient = {
	completions: {
		create: (params: CreateParams) => {
			const client = getCerebrasClient();
			return client.completions.create(params);
		},
	},
	chat: {
		completions: {
			create: (params: CreateParams) => {
				const client = getCerebrasClient();
				return client.chat.completions.create(params);
			},
		},
	},
};
