import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EvidenceRecord } from "../types/deepresearch.js";
import type { EmitFn } from "./deepresearch-streaming.js";
import { SectionSynthesisService } from "./section-synthesis.js";

/**
 * TDD: セクション統合サービスのMarkdownストリーミングテスト
 *
 * テストシナリオ:
 * 1. synthesize メソッドが emit パラメータを受け取る
 * 2. OpenAI API のストリームチャンクを処理する
 * 3. 各Markdownチャンクが emit 関数で送信される
 * 4. 最終的に有効なMarkdownが返される
 */

// OpenAI クライアントのモック - 共有モックオブジェクト
const mockCreate = vi.fn();
const mockClient = {
  chat: {
    completions: {
      create: mockCreate,
    },
  },
};

vi.mock("../config/openai.js", () => ({
  getOpenAIClient: () => mockClient,
}));

describe("SectionSynthesisService - Streaming", () => {
  let service: SectionSynthesisService;
  let mockEmit: EmitFn;
  let emitCalls: unknown[];

  beforeEach(() => {
    service = new SectionSynthesisService();
    emitCalls = [];
    mockEmit = vi.fn(async (event) => {
      emitCalls.push(event);
    });
    // モックをリセット
    mockCreate.mockReset();
  });

  it("should accept emit parameter in synthesize method", async () => {
    // Arrange
    const userQuery = "防衛費と子育て支援の関係";
    const asOfDate = "2025-09-01";
    const evidences: EvidenceRecord[] = [
      {
        id: "e1",
        title: "テスト証拠",
        excerpt: "テスト内容",
        url: "https://example.com",
        source: { providerId: "test", type: "test-provider" },
      },
    ];

    const expectedMarkdown = `# 防衛費と子育て支援の関係

*2025-09-01時点の情報*

## 法案の目的や概要

テスト内容です[^1]

---

[^1]: [テスト証拠](https://example.com)`;

    // モックのOpenAI APIレスポンス（ストリーミング形式）
    const mockStream = createMockStream([
      { delta: { content: expectedMarkdown } },
    ]);

    mockCreate.mockResolvedValue(mockStream as never);

    // Act
    const result = await service.synthesize(
      userQuery,
      asOfDate,
      evidences,
      mockEmit,
    );

    // Assert
    expect(result).toEqual(expectedMarkdown);
    // emit が呼ばれていることを確認（emitパラメータが受け入れられている）
    expect(emitCalls.length).toBeGreaterThan(0);
  });

  it("should stream markdown chunks via emit function", async () => {
    // Arrange
    const userQuery = "防衛費と子育て支援の関係";
    const asOfDate = "2025-09-01";
    const evidences: EvidenceRecord[] = [];

    const markdownResponse = `# 防衛費と子育て支援の関係

## 法案の目的や概要

概要の内容

## 現在の審議状況

審議中です`;

    // チャンクに分割
    const chunks = markdownResponse.match(/.{1,20}/g) || [];
    const mockStreamChunks = chunks.map((content) => ({
      delta: { content },
    }));

    mockCreate.mockImplementation(
      async () => createMockStream(mockStreamChunks) as never,
    );

    // Act
    await service.synthesize(userQuery, asOfDate, evidences, mockEmit);

    // Assert
    // emit が複数回呼ばれていることを確認
    expect(emitCalls.length).toBeGreaterThan(0);

    // synthesis_chunk イベントが含まれていることを確認
    const chunkEvents = (emitCalls as Array<{ type: string }>).filter(
      (event) => event.type === "synthesis_chunk",
    );
    expect(chunkEvents.length).toBeGreaterThan(0);
  });

  it("should accumulate markdown chunks and return complete markdown", async () => {
    // Arrange
    const userQuery = "防衛費と子育て支援の関係";
    const asOfDate = "2025-09-01";
    const evidences: EvidenceRecord[] = [
      {
        id: "e1",
        title: "証拠1",
        excerpt: "証拠内容",
        url: "https://example.com/1",
        source: { providerId: "test", type: "test-provider" },
      },
    ];

    const expectedMarkdown = `# 防衛費と子育て支援の関係

*2025-09-01時点の情報*

## 法案の目的や概要

目的の概要です[^1]

---

[^1]: [証拠1](https://example.com/1)`;

    const mockStreamChunks = [
      { delta: { content: expectedMarkdown.slice(0, 30) } },
      { delta: { content: expectedMarkdown.slice(30, 60) } },
      { delta: { content: expectedMarkdown.slice(60) } },
    ];

    mockCreate.mockImplementation(
      async () => createMockStream(mockStreamChunks) as never,
    );

    // Act
    const result = await service.synthesize(
      userQuery,
      asOfDate,
      evidences,
      mockEmit,
    );

    // Assert
    expect(result).toEqual(expectedMarkdown);
  });

  it("should work without emit parameter (backward compatibility)", async () => {
    // Arrange
    const userQuery = "防衛費と子育て支援の関係";
    const asOfDate = "2025-09-01";
    const evidences: EvidenceRecord[] = [];

    const expectedMarkdown = `# 防衛費と子育て支援の関係

*2025-09-01時点の情報*

## 法案の目的や概要

目的の概要です`;

    mockCreate.mockImplementation(
      async () =>
        createMockStream([{ delta: { content: expectedMarkdown } }]) as never,
    );

    // Act - emit なしで呼び出し
    const result = await service.synthesize(userQuery, asOfDate, evidences);

    // Assert
    expect(result).toEqual(expectedMarkdown);
  });

  it("should continue processing even if emit fails", async () => {
    // Arrange
    const userQuery = "防衛費と子育て支援の関係";
    const asOfDate = "2025-09-01";
    const evidences: EvidenceRecord[] = [];

    const expectedMarkdown = `# 防衛費と子育て支援の関係

*2025-09-01時点の情報*

## 法案の目的や概要

目的の概要です`;

    // Mock emit that throws error
    const mockEmitWithError = vi.fn().mockImplementation(async () => {
      throw new Error("Emit failed");
    });

    mockCreate.mockImplementation(
      async () =>
        createMockStream([
          { delta: { content: expectedMarkdown.slice(0, 30) } },
          { delta: { content: expectedMarkdown.slice(30, 60) } },
          { delta: { content: expectedMarkdown.slice(60) } },
        ]) as never,
    );

    // Act - emit が失敗しても処理は継続するべき
    const result = await service.synthesize(
      userQuery,
      asOfDate,
      evidences,
      mockEmitWithError,
    );

    // Assert
    expect(result).toEqual(expectedMarkdown);
    expect(mockEmitWithError).toHaveBeenCalled();
  });

  it("should throw error when stream processing fails", async () => {
    // Arrange
    const userQuery = "防衛費と子育て支援の関係";
    const asOfDate = "2025-09-01";
    const evidences: EvidenceRecord[] = [];

    // Mock stream that throws error
    const failingStream = {
      async *[Symbol.asyncIterator]() {
        yield {
          choices: [{ delta: { content: "# タイトル\n\n## セクション" } }],
        };
        throw new Error("Stream connection lost");
      },
    };

    mockCreate.mockImplementation(async () => failingStream as never);

    // Act & Assert
    await expect(
      service.synthesize(userQuery, asOfDate, evidences),
    ).rejects.toThrow("Stream processing failed");
  });
});

/**
 * OpenAI ストリームのモックを作成するヘルパー関数
 */
function createMockStream(chunks: Array<{ delta: { content?: string } }>) {
  return {
    async *[Symbol.asyncIterator]() {
      for (const chunk of chunks) {
        yield {
          choices: [chunk],
        };
      }
    },
  };
}
