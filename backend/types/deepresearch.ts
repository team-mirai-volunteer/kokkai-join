// Types for Deep Research API (/v1/deepresearch)

import type { DocumentResult } from "./knowledge.ts";

export interface DeepResearchRequest {
  query: string;
  limit?: number; // default 20
  providers?: string[]; // default ["kokkai-db"]
  asOfDate?: string; // ISO date (YYYY-MM-DD)
  seedUrls?: string[]; // Optional seed URLs (HTML/PDF)
}

export type SectionType = "text" | "list" | "timeline" | "links";

export interface SectionText {
  title: string;
  type: "text";
  content: string;
  citations: string[]; // evidence ids
}

export interface SectionListItem { text: string; citations: string[] }
export interface SectionList {
  title: string;
  type: "list";
  items: SectionListItem[];
}

export interface SectionTimelineItem { date: string; text: string; citations: string[] }
export interface SectionTimeline {
  title: string;
  type: "timeline";
  items: SectionTimelineItem[];
}

export interface SectionLinkItem { label: string; url: string; citations: string[] }
export interface SectionLinks {
  title: string;
  type: "links";
  links: SectionLinkItem[];
}

export interface DeepResearchSections {
  purpose_overview: SectionText;
  current_status: SectionText;
  timeline: SectionTimeline;
  key_points: SectionList;
  background: SectionText;
  main_issues: SectionList;
  past_debates_summary: SectionText;
  status_notes: SectionText;
  related_links: SectionLinks;
}

export interface EvidenceSourceRef { providerId: string; type: string }
export interface EvidenceRecord {
  id: string; // e.g., e1
  source: EvidenceSourceRef;
  url?: string;
  date?: string;
  title?: string;
  excerpt?: string;
  score?: number;
  extras?: Record<string, unknown>;
  sectionHints?: string[]; // which sections this evidence is intended for
}

export interface HumanSourceSummary {
  id: string;
  title?: string;
  url?: string;
  date?: string;
  speaker?: string;
  party?: string;
  speechId?: string;
}

export interface DeepResearchResponse {
  query: string;
  asOfDate?: string;
  sections: DeepResearchSections;
  evidences: EvidenceRecord[];
  metadata: {
    usedProviders: string[];
    iterations: number;
    totalResults: number;
    processingTime: number;
    timestamp: string;
    version: string;
  };
}

// Helper converter: DocumentResult -> EvidenceRecord (id assigned separately)
export function toEvidenceRecord(d: DocumentResult, id: string): EvidenceRecord {
  return {
    id,
    source: d.source,
    url: d.url,
    date: d.date,
    title: d.title,
    excerpt: d.content?.length ? d.content.slice(0, 400) : undefined,
    score: d.score,
    extras: d.extras,
  };
}
