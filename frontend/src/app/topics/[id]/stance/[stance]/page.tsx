"use client";

import Link from "next/link";
import { notFound } from "next/navigation";
import React from "react";
import Header from "@/components/Header";
import SummaryCard from "@/components/SummaryCard";
import { getMemberById, getStanceDetailData } from "@/data/mock_data";

interface StanceDetailPageProps {
  params: Promise<{
    id: string;
    stance: "support" | "oppose" | "unclassified";
  }>;
}

export default function StanceDetailPage({ params }: StanceDetailPageProps) {
  const { id, stance } = React.use(params);
  const data = getStanceDetailData(id, stance);

  if (!data) {
    notFound();
  }

  const { topic, categories, summary, totalCount } = data;

  const getStanceLabel = (stance: string) => {
    switch (stance) {
      case "support":
        return "賛成系";
      case "oppose":
        return "反対系";
      case "unclassified":
        return "未分類";
      default:
        return "";
    }
  };

  const getStanceIcon = (stance: string) => {
    switch (stance) {
      case "support":
        return "🟢";
      case "oppose":
        return "🔴";
      case "unclassified":
        return "⚪";
      default:
        return "";
    }
  };

  const getStanceColor = (stance: string) => {
    switch (stance) {
      case "support":
        return "text-green-600";
      case "oppose":
        return "text-red-600";
      case "unclassified":
        return "text-gray-600";
      default:
        return "text-gray-600";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        showBackButton={true}
        title={`${topic.title} > ${getStanceLabel(stance)}発言詳細`}
      />

      {/* メインコンテンツ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ヘッダー情報 */}
        <div className="mb-8">
          <h2
            className={`text-xl font-bold mb-4 flex items-center ${getStanceColor(stance)}`}
          >
            {getStanceIcon(stance)} {getStanceLabel(stance)}発言一覧 (
            {totalCount}名)
          </h2>
        </div>

        {/* 発言要約 */}
        <div className="mb-8">
          <SummaryCard
            title={`${getStanceLabel(stance)}発言の要約`}
            content={summary}
          />
        </div>

        {/* カテゴリ別発言表示 */}
        {categories.map((category) => (
          <div key={category.label} className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              📝 {category.label} ({category.statements.length}名)
            </h3>

            <div className="space-y-6">
              {category.statements.map((statement) => {
                const member = getMemberById(statement.memberId);
                const date = new Date(statement.timestamp);
                const formattedDate = `${date.getMonth() + 1}-${date.getDate()}`;
                const formattedTime = `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;

                return (
                  <div
                    key={statement.id}
                    className="bg-white rounded-lg border border-gray-200 p-6"
                  >
                    {/* 発言者情報 */}
                    <div className="flex items-center mb-3">
                      <span className="text-lg">👤</span>
                      <span className="ml-2 font-semibold text-gray-900">
                        {member?.name}
                      </span>
                      {member?.party && (
                        <>
                          <span className="ml-2 text-gray-400">|</span>
                          <span className="ml-2 text-sm text-gray-600">
                            {member.party}
                          </span>
                        </>
                      )}
                      <span className="ml-auto text-sm text-gray-500">
                        📅 2025-{formattedDate} {formattedTime}
                      </span>
                    </div>

                    {/* 発言内容 */}
                    <div className="mb-4">
                      <p className="text-gray-700 leading-relaxed">
                        "{statement.content}"
                      </p>
                    </div>

                    {/* アクションボタン */}
                    <div className="flex items-center space-x-4">
                      <button
                        type="button"
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                      >
                        全文表示
                      </button>
                      <button
                        type="button"
                        className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200 transition-colors"
                      >
                        議事録リンク
                      </button>
                      <button
                        type="button"
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
                      >
                        💬 AIに聞く
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* 戻るボタン */}
        <div className="mt-8">
          <Link href={`/topics/${id}`}>
            <button
              type="button"
              className="px-6 py-3 bg-gray-500 text-white rounded-lg font-medium hover:bg-gray-600 transition-colors"
            >
              ← トピック詳細に戻る
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
