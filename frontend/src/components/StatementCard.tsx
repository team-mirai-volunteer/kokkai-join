"use client";

import Link from "next/link";
import type { Statement, Topic } from "@/data/mock_data";

interface StatementCardProps {
  statement: Statement;
  topic: Topic;
  showTopicTitle?: boolean;
}

export default function StatementCard({
  statement,
  topic,
  showTopicTitle = false,
}: StatementCardProps) {
  const date = new Date(statement.timestamp);
  const formattedDate = `${date.getMonth() + 1}-${date.getDate()}`;
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
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      {/* トピック情報（オプション） */}
      {showTopicTitle && (
        <div className="mb-3 pb-3 border-b border-gray-100">
          <Link
            href={`/topics/${topic.id}`}
            className="flex items-center text-sm text-blue-600 hover:text-blue-800 transition-colors"
          >
            <span className="mr-2">{topic.categoryIcon}</span>
            <span className="font-medium">{topic.title}</span>
            <span className="ml-1">→</span>
          </Link>
        </div>
      )}

      {/* スタンス表示 */}
      <div className="flex items-center mb-3">
        <span
          className={`text-lg font-semibold ${getStanceColor(
            statement.stance
          )}`}
        >
          {getStanceIcon(statement.stance)} {getStanceLabel(statement.stance)}
        </span>
        <span className="ml-auto text-sm text-gray-500">
          📅 2025-{formattedDate} {formattedTime}
        </span>
      </div>

      {/* 発言内容 */}
      <div className="mb-4">
        <p className="text-gray-700 leading-relaxed">"{statement.content}"</p>
      </div>

      {/* アクションボタン */}
      <div className="flex items-center space-x-4">
        <Link
          href={`/members/${statement.memberId}/statements/${statement.id}`}
        >
          <button
            type="button"
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
          >
            発言詳細を見る
          </button>
        </Link>
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
}
