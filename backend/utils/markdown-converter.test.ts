import { describe, expect, it } from "vitest";
import { convertDeepResearchToMarkdown } from "./markdown-converter.js";
import type { DeepResearchResponse } from "../types/deepresearch.js";

describe("convertDeepResearchToMarkdown", () => {
  it("should create footnotes for evidences with URLs", () => {
    const response: DeepResearchResponse = {
      query: "テストクエリ",
      sections: {
        purpose_overview: {
          title: "概要",
          type: "text",
          content: "これはテストです",
          citations: ["e1"],
        },
      } as DeepResearchResponse["sections"],
      evidences: [
        {
          id: "e1",
          title: "テスト資料",
          url: "https://example.com/test",
          source: { providerId: "kokkai-db", type: "kokkai-db" },
        },
      ],
      metadata: {
        usedProviders: ["kokkai-db"],
        iterations: 1,
        totalResults: 1,
        processingTime: 1000,
        timestamp: "2025-01-01T00:00:00.000Z",
      },
    };

    const markdown = convertDeepResearchToMarkdown(response);

    expect(markdown).toContain("これはテストです[^1]");
    expect(markdown).toContain("[^1]: [テスト資料](https://example.com/test)");
  });

  it("should create footnotes for PDF evidences with pseudo-URLs", () => {
    const response: DeepResearchResponse = {
      query: "テストクエリ",
      sections: {
        purpose_overview: {
          title: "概要",
          type: "text",
          content: "PDFからの情報です",
          citations: ["e1"],
        },
      } as DeepResearchResponse["sections"],
      evidences: [
        {
          id: "e1",
          title: "document.pdf - ページ 5",
          url: "document.pdf#ページ5",
          source: { providerId: "pdf-extract", type: "pdf-extract" },
          extras: { pageNumber: 5 },
        },
      ],
      metadata: {
        usedProviders: ["pdf-extract"],
        iterations: 1,
        totalResults: 1,
        processingTime: 1000,
        timestamp: "2025-01-01T00:00:00.000Z",
      },
    };

    const markdown = convertDeepResearchToMarkdown(response);

    expect(markdown).toContain("PDFからの情報です[^1]");
    expect(markdown).toContain(
      "[^1]: [document.pdf - ページ 5](document.pdf#ページ5)",
    );
  });

  it("should handle mixed evidences with real and pseudo URLs", () => {
    const response: DeepResearchResponse = {
      query: "テストクエリ",
      sections: {
        purpose_overview: {
          title: "概要",
          type: "text",
          content: "複数の情報源",
          citations: ["e1", "e2", "e3"],
        },
      } as DeepResearchResponse["sections"],
      evidences: [
        {
          id: "e1",
          title: "Web資料",
          url: "https://example.com/1",
          source: { providerId: "openai-web", type: "openai-web" },
        },
        {
          id: "e2",
          title: "report.pdf - ページ 10",
          url: "report.pdf#ページ10",
          source: { providerId: "pdf-extract", type: "pdf-extract" },
          extras: { pageNumber: 10 },
        },
        {
          id: "e3",
          title: "国会議事録",
          url: "https://kokkai.ndl.go.jp/example",
          source: { providerId: "kokkai-db", type: "kokkai-db" },
        },
      ],
      metadata: {
        usedProviders: ["openai-web", "pdf-extract", "kokkai-db"],
        iterations: 1,
        totalResults: 3,
        processingTime: 1000,
        timestamp: "2025-01-01T00:00:00.000Z",
      },
    };

    const markdown = convertDeepResearchToMarkdown(response);

    expect(markdown).toContain("複数の情報源[^1][^2][^3]");
    expect(markdown).toContain("[^1]: [Web資料](https://example.com/1)");
    expect(markdown).toContain(
      "[^2]: [report.pdf - ページ 10](report.pdf#ページ10)",
    );
    expect(markdown).toContain(
      "[^3]: [国会議事録](https://kokkai.ndl.go.jp/example)",
    );
  });
});
