"use client";

import Link from "next/link";
import { useState } from "react";
import {
  mockCategoryFilters,
  mockTimelineFilters,
  mockTopics,
} from "@/data/mock_data";

export default function Home() {
  const [selectedTimelineFilter, setSelectedTimelineFilter] =
    useState("latest");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("all");

  const filteredTopics = mockTopics.filter((topic) => {
    if (selectedCategoryFilter === "all") return true;
    return topic.category === selectedCategoryFilter;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* メインコンテンツ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* タイトル */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            🔥 話題のトピック
          </h2>
        </div>

        {/* フィルター */}
        <div className="mb-8 space-y-4">
          {/* タイムラインフィルター */}
          <div className="flex flex-wrap gap-2">
            {mockTimelineFilters.map((filter) => (
              <button
                type="button"
                key={filter.id}
                onClick={() => setSelectedTimelineFilter(filter.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedTimelineFilter === filter.id
                    ? "bg-blue-500 text-white"
                    : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {/* カテゴリーフィルター */}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedCategoryFilter("all")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedCategoryFilter === "all"
                  ? "bg-blue-100 text-blue-800"
                  : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
              }`}
            >
              すべて
            </button>
            {mockCategoryFilters.map((filter) => (
              <button
                type="button"
                key={filter.id}
                onClick={() => setSelectedCategoryFilter(filter.label)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedCategoryFilter === filter.label
                    ? "bg-blue-100 text-blue-800"
                    : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {/* トピック一覧 */}
        <div className="space-y-6">
          {filteredTopics.map((topic) => (
            <Link key={topic.id} href={`/topics/${topic.id}`}>
              <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer">
                {/* トピックヘッダー */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{topic.categoryIcon}</span>
                    <span className="text-sm text-gray-600">
                      {topic.category}
                    </span>
                    <span className="text-sm text-gray-400">|</span>
                    <span className="text-sm text-gray-600">{topic.date}</span>
                  </div>
                </div>

                {/* トピックタイトル */}
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {topic.title}
                </h3>

                {/* 要約セクション */}
                <div className="mb-4">
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">
                        📄 要約
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {topic.summary}
                    </p>
                  </div>
                </div>

                {/* エンゲージメント指標 */}
                <div className="flex flex-wrap items-center gap-4 mb-4 text-sm text-gray-600">
                  <span>📊 {topic.viewCount.toLocaleString()}回閲覧</span>
                  <span>👥 {topic.speakerCount}名発言</span>
                  <span>💬 {topic.commentCount}件</span>
                  <span>📌 {topic.bookmarkCount}人が関注</span>
                </div>

                {/* スタンス分布 */}
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <span className="text-green-600 font-medium">
                    賛成 {topic.stanceDistribution.support}%
                  </span>
                  <span className="text-red-600 font-medium">
                    反対 {topic.stanceDistribution.oppose}%
                  </span>
                  <span className="text-gray-600 font-medium">
                    未分類 {topic.stanceDistribution.unclassified}%
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* もっと見るボタン */}
        <div className="mt-8 text-center">
          <button
            type="button"
            className="px-6 py-3 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            もっと見る
          </button>
        </div>
      </div>
    </div>
  );
}
