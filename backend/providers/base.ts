import type { DocumentResult, ProviderQuery } from "../types/knowledge.ts";

export interface SearchProvider {
  id: string;
  search(query: ProviderQuery): Promise<DocumentResult[]>;
}
