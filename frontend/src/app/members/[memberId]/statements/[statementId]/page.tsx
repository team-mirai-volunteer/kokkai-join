"use client";

import Link from "next/link";
import { notFound } from "next/navigation";
import React from "react";
import Header from "@/components/Header";
import SummaryCard from "@/components/SummaryCard";
import {
  getMemberById,
  getStatementsByMemberId,
  mockTopics,
} from "@/data/mock_data";

interface StatementDetailPageProps {
  params: Promise<{
    memberId: string;
    statementId: string;
  }>;
}

export default function StatementDetailPage({
  params,
}: StatementDetailPageProps) {
  const { memberId, statementId } = React.use(params);
  const member = getMemberById(memberId);
  const statements = getStatementsByMemberId(memberId);
  const statement = statements.find((s) => s.id === statementId);

  if (!member || !statement) {
    notFound();
  }

  // この発言が含まれるトピックを検索
  const topic = mockTopics.find((t) =>
    t.statements.some((s) => s.id === statementId)
  );

  if (!topic) {
    notFound();
  }

  const date = new Date(statement.timestamp);
  const formattedDate = `${date.getFullYear()}-${
    date.getMonth() + 1
  }-${date.getDate()}`;
  const formattedTime = `${date.getHours().toString().padStart(2, "0")}:${date
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;

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

  const getStanceLabel = (stance: string) => {
    switch (stance) {
      case "support":
        return "賛成";
      case "oppose":
        return "反対";
      case "unclassified":
        return "未分類";
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
      <Header showBackButton={true} title={`${member.name}の発言詳細`} />

      {/* メインコンテンツ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 発言者・トピック情報 */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
          <div className="flex items-center mb-4">
            <span className="text-lg">👤</span>
            <Link href={`/members/${memberId}`}>
              <span className="ml-2 text-xl font-bold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer">
                {member.name}
              </span>
            </Link>
            <span className="ml-2 text-gray-400">|</span>
            <span className="ml-2 text-sm text-gray-600">
              {member.party} ({member.house})
            </span>
          </div>

          <div className="flex items-center mb-4">
            <span className="text-lg">{topic.categoryIcon}</span>
            <Link
              href={`/topics/${topic.id}`}
              className="ml-2 text-lg font-semibold text-blue-600 hover:text-blue-800 transition-colors"
            >
              {topic.title}
            </Link>
            <span className="ml-4 text-sm text-gray-500">
              📅 {formattedDate} {formattedTime}
            </span>
          </div>

          <div className="flex items-center">
            <span
              className={`text-lg font-semibold ${getStanceColor(
                statement.stance
              )}`}
            >
              {getStanceIcon(statement.stance)}{" "}
              {getStanceLabel(statement.stance)}
            </span>
          </div>
        </div>

        {/* 発言全文 */}
        <div className="mb-8">
          <SummaryCard title="📄 発言全文" content={statement.content} />
        </div>

        {/* AIに聞く機能 */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            💬 この発言についてAIに聞く
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            <button
              type="button"
              className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-left hover:bg-blue-100 transition-colors"
            >
              <div className="font-medium text-blue-900">
                💬 発言の背景・根拠
              </div>
            </button>
            <button
              type="button"
              className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-left hover:bg-blue-100 transition-colors"
            >
              <div className="font-medium text-blue-900">
                💬 反対意見との比較
              </div>
            </button>
            <button
              type="button"
              className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-left hover:bg-blue-100 transition-colors"
            >
              <div className="font-medium text-blue-900">💬 政策の影響分析</div>
            </button>
            <button
              type="button"
              className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-left hover:bg-blue-100 transition-colors"
            >
              <div className="font-medium text-blue-900">💬 専門家の見解</div>
            </button>
          </div>
        </div>

        {/* 関連情報 */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            📊 関連情報
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            <Link
              href={`/members/${memberId}`}
              className="block p-4 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="font-medium text-gray-900 mb-1">
                同議員の過去発言
              </div>
              <div className="text-sm text-gray-600">
                {member.name}の全発言履歴
              </div>
            </Link>
            <Link
              href={`/topics/${topic.id}`}
              className="block p-4 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="font-medium text-gray-900 mb-1">関連法案</div>
              <div className="text-sm text-gray-600">このトピックの詳細</div>
            </Link>
            <button
              type="button"
              className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-left hover:bg-gray-100 transition-colors"
            >
              <div className="font-medium text-gray-900 mb-1">統計・データ</div>
              <div className="text-sm text-gray-600">関連する統計情報</div>
            </button>
          </div>
        </div>

        {/* 戻るボタン */}
        <div>
          <Link href={`/topics/${topic.id}`}>
            <button
              type="button"
              className="px-6 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
            >
              ← {topic.title}に戻る
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
