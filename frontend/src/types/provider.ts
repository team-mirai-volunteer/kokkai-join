export const ProviderID = {
  KokkaiDB: "kokkai-db",
  WebSearch: "openai-web",
  GovMeetingRag: "gov-meeting-rag",
} as const;

export type ProviderType = (typeof ProviderID)[keyof typeof ProviderID];

export const PROVIDER_LABELS: Record<ProviderType, string> = {
  [ProviderID.KokkaiDB]: "国会会議録",
  [ProviderID.WebSearch]: "Web",
  [ProviderID.GovMeetingRag]: "各省庁会議録",
};

// PDF抽出以外のプロバイダー（ユーザーが選択可能）
export const SELECTABLE_PROVIDERS = [
  ProviderID.KokkaiDB,
  ProviderID.WebSearch,
  ProviderID.GovMeetingRag,
] as const;
