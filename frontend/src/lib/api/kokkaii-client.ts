import type {
  ApiResponse,
  SearchParams,
  MeetingRecord,
  RecentMeeting,
  SpeechRecord,
} from "../types/api";

export class KokkaiiAPIClient {
  private readonly baseURL = "https://kokkai.ndl.go.jp/api";
  private readonly defaultParams: Record<string, string> = {
    recordPacking: "json",
  };

  async searchMeetings(params: SearchParams): Promise<ApiResponse> {
    const cleanedParams = this.cleanParams(params);
    const allParams = { ...this.defaultParams, ...cleanedParams };
    const searchParams = new URLSearchParams(allParams);
    const url = `${this.baseURL}/meeting_list?${searchParams.toString()}`;

    try {
      const response = await fetch(url, {
        next: {
          revalidate: 3600,
          tags: ["kokkaii-search"],
        },
      });

      if (!response.ok) {
        throw new Error(
          `API request failed: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      return this.normalizeResponse(data);
    } catch (error) {
      console.error("Kokkaii API search failed:", error);
      throw new Error("会議録の検索に失敗しました");
    }
  }

  async getRecentMeetings(limit: number = 10): Promise<RecentMeeting[]> {
    try {
      const today = new Date();
      const allMeetings: RecentMeeting[] = [];
      const maxMonthsToCheck = 6;

      for (let monthsBack = 0; monthsBack < maxMonthsToCheck; monthsBack++) {
        const endDate = new Date(today);
        endDate.setMonth(today.getMonth() - monthsBack);
        const startDate = new Date(endDate);
        startDate.setMonth(endDate.getMonth() - 1);

        const fromStr = startDate.toISOString().split("T")[0];
        const untilStr = endDate.toISOString().split("T")[0];

        try {
          const response = await this.searchMeetings({
            from: fromStr,
            until: untilStr,
            maximumRecords: 100,
          });

          if (response.meetingRecord && response.meetingRecord.length > 0) {
            const transformedMeetings = this.transformToRecentMeetings(
              response.meetingRecord
            );
            allMeetings.push(...transformedMeetings);

            if (allMeetings.length >= limit * 2) {
              break;
            }
          }
        } catch {
          continue;
        }
      }

      const sortedMeetings = allMeetings.sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return dateB - dateA;
      });

      return sortedMeetings.slice(0, limit);
    } catch (error) {
      console.error("Failed to fetch recent meetings:", error);
      return [];
    }
  }

  async getMeetingDetail(issueId: string): Promise<MeetingRecord | null> {
    try {
      const response = await fetch(
        `${this.baseURL}/meeting?issueID=${encodeURIComponent(
          issueId
        )}&recordPacking=json`,
        {
          next: {
            revalidate: 86400, // 24時間キャッシュ
            tags: ["kokkaii-meeting", `meeting-${issueId}`],
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch meeting detail: ${response.status}`);
      }

      const data = await response.json();
      const normalized = this.normalizeResponse(data);
      return normalized.meetingRecord?.[0] || null;
    } catch (error) {
      console.error("Failed to fetch meeting detail:", error);
      return null;
    }
  }

  private cleanParams(params: SearchParams): Record<string, string> {
    const cleaned: Record<string, string> = {};

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== "" && value !== null) {
        cleaned[key] = String(value);
      }
    });

    return cleaned;
  }

  private normalizeResponse(data: unknown): ApiResponse {
    const responseData = data as {
      numberOfRecords?: number
      numberOfReturn?: number
      startRecord?: number
      nextRecordPosition?: number
      meetingRecord?: MeetingRecord[]
      speechRecord?: SpeechRecord[]
    }
    
    return {
      numberOfRecords: responseData.numberOfRecords || 0,
      numberOfReturn: responseData.numberOfReturn || 0,
      startRecord: responseData.startRecord || 1,
      nextRecordPosition: responseData.nextRecordPosition,
      meetingRecord: responseData.meetingRecord || [],
      speechRecord: responseData.speechRecord || [],
    };
  }

  private transformToRecentMeetings(
    meetings: MeetingRecord[]
  ): RecentMeeting[] {
    return meetings.map((meeting) => ({
      id: meeting.issueID,
      title: meeting.nameOfMeeting,
      house: meeting.nameOfHouse,
      date: meeting.date,
      session: `第${meeting.session}回`,
      issue: meeting.issue || "",
      url: meeting.meetingURL,
      pdfUrl: meeting.pdfURL,
      speechCount: meeting.speechRecord?.length || 0,
    }));
  }
}

// シングルトンインスタンス
export const kokkaiiAPI = new KokkaiiAPIClient();
