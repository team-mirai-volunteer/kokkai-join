import type { MeetingRecord, SpeechRecord } from '../types/api';

interface SyncSearchParams {
  from: string;
  until: string;
  nameOfHouse?: string;
  nameOfMeeting?: string;
  maximumRecords?: number;
  startRecord?: number;
}

interface SyncApiResponse {
  numberOfRecords: number;
  numberOfReturn: number;
  startRecord: number;
  nextRecordPosition?: number;
  meetingRecord?: MeetingRecord[];
}

interface DetailedMeetingResponse {
  numberOfRecords: number;
  meetingRecord?: Array<
    MeetingRecord & {
      speechRecord?: SpeechRecord[];
    }
  >;
}

export class KokkaiSyncClient {
  private readonly baseURL = 'https://kokkai.ndl.go.jp/api';
  private readonly delay = 1000; // APIへの負荷を考慮して1秒のディレイ

  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async fetchMeetingsByDateRange(
    from: Date,
    until: Date,
    options?: {
      nameOfHouse?: string;
      nameOfMeeting?: string;
      onProgress?: (current: number, total: number) => void;
    }
  ): Promise<MeetingRecord[]> {
    const meetings: MeetingRecord[] = [];
    let startRecord = 1;
    let hasMore = true;
    let totalRecords = 0;

    const params: SyncSearchParams = {
      from: from.toISOString().split('T')[0],
      until: until.toISOString().split('T')[0],
      maximumRecords: 100,
      ...(options?.nameOfHouse && { nameOfHouse: options.nameOfHouse }),
      ...(options?.nameOfMeeting && { nameOfMeeting: options.nameOfMeeting }),
    };

    while (hasMore) {
      try {
        const response = await this.searchMeetings({
          ...params,
          startRecord,
        });

        if (response.meetingRecord && response.meetingRecord.length > 0) {
          meetings.push(...response.meetingRecord);
        }

        totalRecords = response.numberOfRecords;

        if (options?.onProgress) {
          options.onProgress(meetings.length, totalRecords);
        }

        if (response.nextRecordPosition) {
          startRecord = response.nextRecordPosition;
          await this.sleep(this.delay);
        } else {
          hasMore = false;
        }
      } catch (error) {
        console.error(`Error fetching meetings at position ${startRecord}:`, error);
        hasMore = false;
      }
    }

    return meetings;
  }

  async fetchMeetingDetail(
    issueID: string
  ): Promise<(MeetingRecord & { speechRecord?: SpeechRecord[] }) | null> {
    try {
      const url = `${this.baseURL}/meeting?issueID=${encodeURIComponent(issueID)}&recordPacking=json`;

      const response = await fetch(url, {
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data: DetailedMeetingResponse = await response.json();

      if (data.meetingRecord && data.meetingRecord.length > 0) {
        return data.meetingRecord[0];
      }

      return null;
    } catch (error) {
      console.error(`Error fetching meeting detail for ${issueID}:`, error);
      return null;
    }
  }

  async fetchAllMeetingDetails(
    meetings: MeetingRecord[],
    options?: {
      onProgress?: (current: number, total: number) => void;
      batchSize?: number;
    }
  ): Promise<Array<MeetingRecord & { speechRecord?: SpeechRecord[] }>> {
    const detailedMeetings: Array<MeetingRecord & { speechRecord?: SpeechRecord[] }> = [];
    const batchSize = options?.batchSize || 10;

    for (let i = 0; i < meetings.length; i += batchSize) {
      const batch = meetings.slice(i, Math.min(i + batchSize, meetings.length));

      const batchResults = await Promise.all(
        batch.map(async (meeting) => {
          await this.sleep(this.delay * Math.random()); // ランダムなディレイで負荷分散
          return this.fetchMeetingDetail(meeting.issueID);
        })
      );

      for (const result of batchResults) {
        if (result) {
          detailedMeetings.push(result);
        }
      }

      if (options?.onProgress) {
        options.onProgress(Math.min(i + batchSize, meetings.length), meetings.length);
      }

      await this.sleep(this.delay * 2); // バッチ間でより長いディレイ
    }

    return detailedMeetings;
  }

  private async searchMeetings(params: SyncSearchParams): Promise<SyncApiResponse> {
    const cleanedParams = this.cleanParams({ ...params } as Record<string, unknown>);
    const searchParams = new URLSearchParams({
      recordPacking: 'json',
      ...cleanedParams,
    });

    const url = `${this.baseURL}/meeting_list?${searchParams.toString()}`;

    try {
      const response = await fetch(url, {
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      return this.normalizeResponse(data);
    } catch (error) {
      console.error('Search meetings failed:', error);
      throw error;
    }
  }

  private cleanParams(params: Record<string, unknown>): Record<string, string> {
    const cleaned: Record<string, string> = {};

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '' && value !== null) {
        cleaned[key] = String(value);
      }
    });

    return cleaned;
  }

  private normalizeResponse(data: unknown): SyncApiResponse {
    const apiData = data as {
      numberOfRecords?: number;
      numberOfReturn?: number;
      startRecord?: number;
      nextRecordPosition?: number;
      meetingRecord?: MeetingRecord[];
    };

    return {
      numberOfRecords: apiData.numberOfRecords || 0,
      numberOfReturn: apiData.numberOfReturn || 0,
      startRecord: apiData.startRecord || 1,
      nextRecordPosition: apiData.nextRecordPosition,
      meetingRecord: apiData.meetingRecord || [],
    };
  }
}

export const kokkaiSyncClient = new KokkaiSyncClient();
