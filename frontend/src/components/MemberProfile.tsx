"use client";

import Link from "next/link";
import type { Member } from "@/data/mock_data";

interface MemberProfileProps {
  member: Member;
}

export default function MemberProfile({ member }: MemberProfileProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
      {/* 基本情報ヘッダー */}
      <div className="flex items-start space-x-6 mb-6">
        <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center text-3xl">
          👤
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {member.name}
          </h1>
          <div className="space-y-1 text-sm text-gray-600">
            <p>
              <span className="font-medium">所属:</span> {member.party} |{" "}
              {member.house}
            </p>
            <p>
              <span className="font-medium">選挙区:</span> {member.constituency}
            </p>
            <p>
              <span className="font-medium">経歴:</span> {member.experience}
            </p>
          </div>
        </div>
      </div>

      {/* 専門分野・委員会 */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-2">
            🏛️ 所属委員会
          </h3>
          <div className="flex flex-wrap gap-2">
            {member.committees.map((committee) => (
              <span
                key={committee}
                className="px-3 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
              >
                {committee}
              </span>
            ))}
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-2">
            🎯 専門分野
          </h3>
          <div className="flex flex-wrap gap-2">
            {member.specialties.map((specialty) => (
              <span
                key={specialty}
                className="px-3 py-1 bg-green-100 text-green-800 text-xs rounded-full"
              >
                {specialty}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 議員のスタンス */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          🎯 議員のスタンス
        </h3>
        <div className="space-y-6">
          {member.politicalStances.map((stance) => (
            <div key={stance.area} className="border-l-4 border-blue-500 pl-4">
              <h4 className="font-medium text-gray-900 mb-2">
                📌 {stance.area}
              </h4>
              <div className="flex justify-between items-start">
                <p className="text-sm text-gray-700 leading-relaxed flex-1 mr-4">
                  {stance.stance}
                </p>
                <Link
                  href={`/members/${member.id}/statements/${stance.evidenceStatements[0].statementId}`}
                  className="text-blue-600 hover:text-blue-800 font-medium text-sm whitespace-nowrap"
                >
                  根拠へ →
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 活動統計 */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">
          📊 活動統計
        </h3>
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700 flex items-center">
              📈 発言回数:
            </span>
            <span className="text-sm font-medium text-gray-900">
              {member.activityStats.speechesPerYear}回/年
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700 flex items-center">
              🎯 出席率:
            </span>
            <span className="text-sm font-medium text-gray-900">
              {member.activityStats.attendanceRate}%
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700 flex items-center">
              💬 注目発言:
            </span>
            <span className="text-sm font-medium text-gray-900">
              {member.activityStats.noteworthySpeeches}件
            </span>
          </div>
        </div>
      </div>

      {/* 略歴・プロフィール */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-2">
          📝 プロフィール
        </h3>
        <p className="text-sm text-gray-700 leading-relaxed">
          {member.biography}
        </p>
      </div>
    </div>
  );
}
