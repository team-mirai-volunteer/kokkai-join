"use client";

import { useState, FormEvent } from "react";

interface SearchInputProps {
	onSearch: (keyword: string) => void;
	disabled?: boolean;
}

export default function SearchInput({ onSearch, disabled }: SearchInputProps) {
	const [keyword, setKeyword] = useState("");

	const handleSubmit = (e: FormEvent) => {
		e.preventDefault();
		if (keyword.trim()) {
			onSearch(keyword.trim());
		}
	};

	return (
		<form onSubmit={handleSubmit} className="w-full max-w-2xl">
			<div className="flex gap-2">
				<input
					type="text"
					value={keyword}
					onChange={(e) => setKeyword(e.target.value)}
					placeholder="検索キーワードを入力"
					disabled={disabled}
					className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
				/>
				<button
					type="submit"
					disabled={disabled || !keyword.trim()}
					className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
				>
					検索
				</button>
			</div>
		</form>
	);
}
