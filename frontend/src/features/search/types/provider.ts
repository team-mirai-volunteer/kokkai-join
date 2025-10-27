export const ProviderID = {
  KokkaiDB: "kokkai-db",
  WebSearch: "openai-web",
  GovMeetingRag: "gov-meeting-rag",
} as const;

export type ProviderType = (typeof ProviderID)[keyof typeof ProviderID];

export const PROVIDER_LABELS: Readonly<Record<ProviderType, string>> = {
  [ProviderID.KokkaiDB]: "国会会議録",
  [ProviderID.WebSearch]: "Web",
  [ProviderID.GovMeetingRag]: "各省庁会議録",
};

export const SELECTABLE_PROVIDERS: ReadonlyArray<ProviderType> = [
  ProviderID.KokkaiDB,
  ProviderID.WebSearch,
  ProviderID.GovMeetingRag,
] as const;
