import type { DocumentResult, ProviderQuery } from "../types/knowledge.js";

export interface SearchProvider {
  id: string;
  search(query: ProviderQuery): Promise<DocumentResult[]>;
}
