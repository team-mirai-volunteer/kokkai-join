"use client";

import { useState, useCallback } from "react";
import SearchInput from "@/components/SearchInput";
import ResultDisplay from "@/components/ResultDisplay";
import { searchDeepResearch } from "@/lib/api";

export default function Home() {
	const [result, setResult] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleSearch = useCallback(async (keyword: string) => {
		setLoading(true);
		setError(null);
		setResult("");

		try {
			const searchResult = await searchDeepResearch(keyword);
			setResult(searchResult);
		} catch (err) {
			setError(err instanceof Error ? err.message : "検索に失敗しました");
		} finally {
			setLoading(false);
		}
	}, []);

	return (
		<div className="min-h-screen bg-gray-50">
			<div className="container mx-auto px-4 py-12">
				<div className="flex flex-col items-center gap-8">
					<h1 className="text-3xl font-bold text-gray-800">DeepResearch</h1>

					<SearchInput onSearch={handleSearch} disabled={loading} />

					<ResultDisplay content={result} loading={loading} error={error} />
				</div>
			</div>
		</div>
	);
}
