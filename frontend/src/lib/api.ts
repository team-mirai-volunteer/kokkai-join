export async function searchDeepResearch(keyword: string): Promise<string> {
	const response = await fetch("/api/search", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ keyword }),
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(error || "検索に失敗しました");
	}

	const data = await response.json();
	return data.result;
}
