import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
	try {
		const { keyword } = await request.json();

		if (!keyword) {
			return NextResponse.json(
				{ error: "検索キーワードが必要です" },
				{ status: 400 },
			);
		}

		// バックエンドAPIのURLを環境変数から取得（デフォルトはlocalhost:8080）
		const backendUrl = process.env.BACKEND_URL || "http://localhost:8080";

		const response = await fetch(`${backendUrl}/search`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ keyword }),
		});

		if (!response.ok) {
			const error = await response.text();
			return NextResponse.json(
				{ error: error || "バックエンドAPIエラー" },
				{ status: response.status },
			);
		}

		const data = await response.json();
		return NextResponse.json({ result: data.result });
	} catch (error) {
		console.error("Search API error:", error);
		return NextResponse.json(
			{ error: "サーバーエラーが発生しました" },
			{ status: 500 },
		);
	}
}
