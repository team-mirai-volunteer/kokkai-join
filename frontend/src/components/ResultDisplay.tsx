"use client";

import ReactMarkdown from "react-markdown";

interface ResultDisplayProps {
	content: string;
	loading?: boolean;
	error?: string | null;
}

export default function ResultDisplay({
	content,
	loading,
	error,
}: ResultDisplayProps) {
	if (loading) {
		return (
			<div className="w-full max-w-4xl p-8 text-center">
				<div className="text-gray-500">検索中...</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="w-full max-w-4xl p-8">
				<div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
					エラー: {error}
				</div>
			</div>
		);
	}

	if (!content) {
		return null;
	}

	return (
		<div className="w-full max-w-4xl">
			<div className="bg-white border border-gray-200 rounded-lg p-8 shadow-sm">
				<div className="prose prose-lg max-w-none">
					<ReactMarkdown>{content}</ReactMarkdown>
				</div>
			</div>
		</div>
	);
}
