"use client";

import Link from "next/link";
import { notFound } from "next/navigation";
import React from "react";
import Header from "@/components/Header";
import SummaryCard from "@/components/SummaryCard";
import {
  getMemberById,
  getStanceDistributionCounts,
  getTopicById,
} from "@/data/mock_data";

interface TopicDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function TopicDetailPage({ params }: TopicDetailPageProps) {
  const { id } = React.use(params);
  const topic = getTopicById(id);

  if (!topic) {
    notFound();
  }

  const stanceCounts = getStanceDistributionCounts(id);
  const supportStatements = topic.statements.filter(
    (s) => s.stance === "support"
  );
  const opposeStatements = topic.statements.filter(
    (s) => s.stance === "oppose"
  );
  const unclassifiedStatements = topic.statements.filter(
    (s) => s.stance === "unclassified"
  );

  const clearSupportStatements = supportStatements.filter(
    (s) => s.stanceDetail === "clear_support"
  );
  const conditionalSupportStatements = supportStatements.filter(
    (s) => s.stanceDetail === "conditional_support"
  );
  const clearOpposeStatements = opposeStatements.filter(
    (s) => s.stanceDetail === "clear_oppose"
  );
  const concernStatements = opposeStatements.filter(
    (s) => s.stanceDetail === "concern_expression"
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Header showBackButton={true} title={topic.title} />

      {/* メインコンテンツ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* トピック情報 */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <span className="text-2xl">{topic.categoryIcon}</span>
            <span className="text-gray-600">{topic.category}</span>
            <span className="text-gray-400">|</span>
            <span className="text-gray-600">📅 {topic.date}</span>
            <span className="text-gray-400">|</span>
            <span className="text-gray-600">
              📊 賛成{stanceCounts.support} 反対{stanceCounts.oppose} 未分類
              {stanceCounts.unclassified}
            </span>
          </div>

          {/* 要約セクション */}
          <SummaryCard content={topic.summary} />
        </div>

        {/* 議論の結果・決定事項 */}
        {topic.decisionResults && topic.decisionResults.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              🎯 議論の結果・決定事項
            </h2>
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              {topic.decisionResults.map((result, index) => (
                <div
                  key={`decision-${result.type}-${index}`}
                  className="mb-6 last:mb-0"
                >
                  <div className="flex items-center mb-2">
                    <span className="text-green-600 font-medium">✅</span>
                    <span className="ml-2 font-semibold">
                      {result.type} ({result.date})
                    </span>
                  </div>
                  <ul className="ml-6 space-y-1">
                    {result.details.map((detail, detailIndex) => (
                      <li
                        key={`detail-${detailIndex}-${detail.slice(0, 10)}`}
                        className="text-gray-700"
                      >
                        • {detail}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}

              {topic.futureSchedule && topic.futureSchedule.length > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-3">
                    📅 今後の予定
                  </h3>
                  <ul className="space-y-2">
                    {topic.futureSchedule.map((schedule, index) => (
                      <li
                        key={`schedule-${schedule.date}-${index}`}
                        className="text-gray-700"
                      >
                        • {schedule.date}: {schedule.event}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {topic.relatedIssues && topic.relatedIssues.length > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-3">
                    📋 関連する検討事項
                  </h3>
                  <ul className="space-y-2">
                    {topic.relatedIssues.map((issue, index) => (
                      <li
                        key={`issue-${issue.title}-${index}`}
                        className="text-gray-700"
                      >
                        • {issue.title}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-6 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
                >
                  💬 この決定についてAIに聞く
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 議論の争点 */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            📋 議論の争点
          </h2>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <ul className="space-y-2 mb-6">
              {topic.keyPoints.map((point, index) => (
                <li
                  key={`point-${point.slice(0, 15)}-${index}`}
                  className="text-gray-700 flex items-center"
                >
                  <span>• {point}</span>
                  <span className="ml-2 text-green-600 text-sm">✅決定</span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
            >
              💬 争点の背景をAIに聞く
            </button>
          </div>
        </div>

        {/* スタンス別表示 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* 賛成系 */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-green-600 mb-4 flex items-center">
              🟢 賛成系 ({stanceCounts.support}名)
            </h3>

            {clearSupportStatements.length > 0 && (
              <div className="mb-6">
                <h4 className="font-medium text-gray-900 mb-3">
                  📝 明確な賛成 ({clearSupportStatements.length}名)
                </h4>
                <ul className="space-y-2">
                  {clearSupportStatements.map((statement) => {
                    const member = getMemberById(statement.memberId);
                    return (
                      <li key={statement.id} className="text-sm text-gray-700">
                        • {member?.name}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {conditionalSupportStatements.length > 0 && (
              <div className="mb-6">
                <h4 className="font-medium text-gray-900 mb-3">
                  📝 条件付き賛成 ({conditionalSupportStatements.length}名)
                </h4>
                <ul className="space-y-2">
                  {conditionalSupportStatements.map((statement) => {
                    const member = getMemberById(statement.memberId);
                    return (
                      <li key={statement.id} className="text-sm text-gray-700">
                        • {member?.name} "{statement.content.slice(0, 20)}..."
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            <Link href={`/topics/${id}/stance/support`}>
              <button
                type="button"
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                詳細
              </button>
            </Link>
          </div>

          {/* 反対系 */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-red-600 mb-4 flex items-center">
              🔴 反対系 ({stanceCounts.oppose}名)
            </h3>

            {clearOpposeStatements.length > 0 && (
              <div className="mb-6">
                <h4 className="font-medium text-gray-900 mb-3">
                  📝 明確な反対 ({clearOpposeStatements.length}名)
                </h4>
                <ul className="space-y-2">
                  {clearOpposeStatements.map((statement) => {
                    const member = getMemberById(statement.memberId);
                    return (
                      <li key={statement.id} className="text-sm text-gray-700">
                        • {member?.name}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {concernStatements.length > 0 && (
              <div className="mb-6">
                <h4 className="font-medium text-gray-900 mb-3">
                  📝 懸念表明 ({concernStatements.length}名)
                </h4>
                <ul className="space-y-2">
                  {concernStatements.map((statement) => {
                    const member = getMemberById(statement.memberId);
                    return (
                      <li key={statement.id} className="text-sm text-gray-700">
                        • {member?.name} "{statement.content.slice(0, 20)}..."
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            <Link href={`/topics/${id}/stance/oppose`}>
              <button
                type="button"
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                詳細
              </button>
            </Link>
          </div>
        </div>

        {/* 未分類 */}
        {unclassifiedStatements.length > 0 && (
          <div className="mb-8">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-600 mb-4 flex items-center">
                ⚪ 未分類 ({stanceCounts.unclassified}名)
              </h3>
              <ul className="space-y-2 mb-6">
                {unclassifiedStatements.map((statement) => {
                  const member = getMemberById(statement.memberId);
                  return (
                    <li key={statement.id} className="text-sm text-gray-700">
                      • {member?.name} "{statement.content.slice(0, 30)}..."
                      (質問のみ)
                    </li>
                  );
                })}
              </ul>
              <Link href={`/topics/${id}/stance/unclassified`}>
                <button
                  type="button"
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                >
                  詳細
                </button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
