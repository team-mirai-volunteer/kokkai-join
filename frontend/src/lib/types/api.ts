// 国会会議録検索APIの型定義

export interface MeetingRecord {
  issueID: string;
  imageKind: string;
  searchObject: string;
  session: string;
  nameOfHouse: string;
  nameOfMeeting: string;
  issue: string;
  date: string;
  closing: string;
  meetingURL: string;
  pdfURL?: string;
  speechRecord: SpeechRecord[];
}

export interface SpeechRecord {
  speechID: string;
  speechOrder: string;
  speaker: string;
  speakerYomi?: string;
  speakerGroup?: string;
  speakerPosition?: string;
  speakerRole?: string;
  speech?: string;
  startPage?: string;
  createTime?: string;
  updateTime?: string;
  speechURL: string;
}

export interface ApiResponse {
  numberOfRecords: number;
  numberOfReturn: number;
  startRecord: number;
  nextRecordPosition?: number;
  meetingRecord?: MeetingRecord[];
  speechRecord?: SpeechRecord[];
}

export interface SearchParams {
  any?: string;
  nameOfHouse?: string;
  nameOfMeeting?: string;
  speaker?: string;
  from?: string;
  until?: string;
  sessionFrom?: number;
  sessionTo?: number;
  issueFrom?: number;
  issueTo?: number;
  startRecord?: number;
  maximumRecords?: number;
  recordPacking?: 'xml' | 'json';
}

// 表示用の簡略化された型
export interface RecentMeeting {
  id: string;
  title: string;
  house: string;
  date: string;
  session: string;
  issue: string;
  url: string;
  pdfUrl?: string;
  speechCount: number;
}
