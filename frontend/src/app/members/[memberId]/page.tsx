"use client";

import Link from "next/link";
import { notFound } from "next/navigation";
import React from "react";
import Header from "@/components/Header";
import MemberProfile from "@/components/MemberProfile";
import StatementCard from "@/components/StatementCard";
import {
  getMemberById,
  getMemberRecentTopics,
  getStatementsByMemberId,
  getTopicById,
} from "@/data/mock_data";

interface MemberDetailPageProps {
  params: Promise<{
    memberId: string;
  }>;
}

export default function MemberDetailPage({ params }: MemberDetailPageProps) {
  const { memberId } = React.use(params);
  const member = getMemberById(memberId);

  if (!member) {
    notFound();
  }

  const statements = getStatementsByMemberId(memberId);
  const recentTopics = getMemberRecentTopics(memberId);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header showBackButton={true} title={`${member.name}の詳細`} />

      {/* メインコンテンツ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* プロフィールカード */}
        <MemberProfile member={member} />

        {/* 最近の発言トピック */}
        {recentTopics.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              📋 最近の発言があるトピック
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {recentTopics.map((topic) => (
                <Link
                  key={topic.id}
                  href={`/topics/${topic.id}`}
                  className="block bg-white rounded-lg border border-gray-200 p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start space-x-3">
                    <span className="text-2xl">{topic.categoryIcon}</span>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 text-sm mb-1 line-clamp-2">
                        {topic.title}
                      </h3>
                      <p className="text-xs text-gray-500 mb-2">
                        {topic.date} | {topic.category}
                      </p>
                      <p className="text-xs text-gray-600 line-clamp-2">
                        {topic.summary}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* 発言一覧 */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              💬 全発言一覧 ({statements.length}件)
            </h2>
            <div className="flex space-x-2">
              <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option value="">全てのスタンス</option>
                <option value="support">賛成のみ</option>
                <option value="oppose">反対のみ</option>
                <option value="unclassified">未分類のみ</option>
              </select>
              <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option value="newest">新しい順</option>
                <option value="oldest">古い順</option>
              </select>
            </div>
          </div>

          {statements.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
              <p className="text-gray-500">まだ発言がありません。</p>
            </div>
          ) : (
            <div className="space-y-6">
              {statements
                .sort(
                  (a, b) =>
                    new Date(b.timestamp).getTime() -
                    new Date(a.timestamp).getTime()
                )
                .map((statement) => {
                  const topic =
                    recentTopics.find((t) =>
                      t.statements.some((s) => s.id === statement.id)
                    ) || getTopicById("topic-001"); // フォールバック

                  if (!topic) return null;

                  return (
                    <StatementCard
                      key={statement.id}
                      statement={statement}
                      topic={topic}
                      showTopicTitle={true}
                    />
                  );
                })
                .filter(Boolean)}
            </div>
          )}
        </div>

        {/* 関連リンク */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            🔗 関連情報
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
            <button
              type="button"
              className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-left hover:bg-blue-100 transition-colors"
            >
              <div className="font-medium text-blue-900 mb-1">
                🏛️ 国会会議録検索
              </div>
              <div className="text-sm text-blue-700">
                この議員の過去の全発言を検索
              </div>
            </button>
            <button
              type="button"
              className="p-4 bg-green-50 border border-green-200 rounded-lg text-left hover:bg-green-100 transition-colors"
            >
              <div className="font-medium text-green-900 mb-1">
                📊 統計・データ
              </div>
              <div className="text-sm text-green-700">
                発言回数や委員会出席率など
              </div>
            </button>
            <button
              type="button"
              className="p-4 bg-purple-50 border border-purple-200 rounded-lg text-left hover:bg-purple-100 transition-colors"
            >
              <div className="font-medium text-purple-900 mb-1">
                💬 AIに質問
              </div>
              <div className="text-sm text-purple-700">
                この議員について詳しく聞く
              </div>
            </button>
            <button
              type="button"
              className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-left hover:bg-gray-100 transition-colors"
            >
              <div className="font-medium text-gray-900 mb-1">
                🌐 公式ページ
              </div>
              <div className="text-sm text-gray-700">
                議員の公式ウェブサイト
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
