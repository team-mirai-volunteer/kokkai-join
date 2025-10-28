import { describe, expect, it, vi } from "vitest";
import type { DeepResearchRequestValidated } from "../schemas/deepresearch-validation.js";
import type { ProgressEvent } from "../types/progress.js";
import {
  type EmitFn,
  executeDeepResearchStreaming,
} from "./deepresearch-streaming.js";

/**
 * テスト用のemit関数を生成
 * 発生したイベントを配列に記録
 */
function createMockEmit(): { emit: EmitFn; events: ProgressEvent[] } {
  const events: ProgressEvent[] = [];
  const emit: EmitFn = async (event) => {
    events.push(event);
  };
  return { emit, events };
}

describe("createMockEmit", () => {
  it("should record emitted events", () => {
    const { emit, events } = createMockEmit();

    emit({
      type: "progress",
      step: 1,
      totalSteps: 5,
      stepName: "クエリプランニング",
    });

    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({
      type: "progress",
      step: 1,
      totalSteps: 5,
      stepName: "クエリプランニング",
    });
  });
});

describe("executeDeepResearchStreaming", () => {
  const mockRequest: DeepResearchRequestValidated = {
    query: "防衛費の増額について",
    providers: [],
    limit: 10,
  };

  it("should emit 4 progress steps when no files provided", async () => {
    const { emit, events } = createMockEmit();
    const mockServices = {
      queryPlanning: {
        createQueryPlan: vi.fn().mockResolvedValue({
          subqueries: ["防衛費", "増額"],
          entities: { speakers: [], topics: [] },
          enabledStrategies: [],
          confidence: 0.9,
        }),
      },
      orchestrator: {
        run: vi.fn().mockResolvedValue({
          finalDocs: [],
          sectionHitMap: new Map(),
          iterations: 1,
        }),
      },
      pdfExtraction: {
        extractBySections: vi.fn().mockResolvedValue([]),
      },
      sectionSynthesis: {
        synthesize: vi.fn().mockResolvedValue({}),
      },
      providerRegistry: {
        byIds: vi.fn().mockReturnValue([]),
      },
    };

    await executeDeepResearchStreaming(mockRequest, emit, mockServices);

    const progressEvents = events.filter(
      (e): e is Extract<ProgressEvent, { type: "progress" }> =>
        e.type === "progress",
    );

    // ファイルがない場合、PDF抽出ステップはスキップされる
    expect(progressEvents).toHaveLength(4);
    expect(progressEvents[0]?.stepName).toBe("クエリプランニング");
    expect(progressEvents[1]?.stepName).toBe("セクション別検索");
    expect(progressEvents[2]?.stepName).toBe("証拠レコード構築");
    expect(progressEvents[3]?.stepName).toBe("セクション統合");
  });

  it("should emit complete event with markdown result", async () => {
    const { emit, events } = createMockEmit();
    const mockServices = {
      queryPlanning: {
        createQueryPlan: vi.fn().mockResolvedValue({
          subqueries: [],
          entities: { speakers: [], topics: [] },
          enabledStrategies: [],
          confidence: 0.9,
        }),
      },
      orchestrator: {
        run: vi.fn().mockResolvedValue({
          finalDocs: [],
          sectionHitMap: new Map(),
          iterations: 1,
        }),
      },
      pdfExtraction: {
        extractBySections: vi.fn(),
      },
      sectionSynthesis: {
        synthesize: vi.fn().mockResolvedValue({
          purpose_overview: { summary: "概要", citations: [] },
        }),
      },
      providerRegistry: {
        byIds: vi.fn().mockReturnValue([]),
      },
    };

    await executeDeepResearchStreaming(mockRequest, emit, mockServices);

    const completeEvents = events.filter(
      (e): e is Extract<ProgressEvent, { type: "complete" }> =>
        e.type === "complete",
    );

    expect(completeEvents).toHaveLength(1);
    expect(completeEvents[0]?.data).toContain("#");
  });

  it("should emit error event with step info when planning fails", async () => {
    const { emit, events } = createMockEmit();
    const mockServices = {
      queryPlanning: {
        createQueryPlan: vi
          .fn()
          .mockRejectedValue(new Error("Planning failed")),
      },
      orchestrator: {
        run: vi.fn(),
      },
      pdfExtraction: {
        extractBySections: vi.fn(),
      },
      sectionSynthesis: {
        synthesize: vi.fn(),
      },
      providerRegistry: {
        byIds: vi.fn(),
      },
    };

    await expect(
      executeDeepResearchStreaming(mockRequest, emit, mockServices),
    ).rejects.toThrow("Planning failed");

    const errorEvents = events.filter(
      (e): e is Extract<ProgressEvent, { type: "error" }> => e.type === "error",
    );

    expect(errorEvents).toHaveLength(1);
    expect(errorEvents[0]?.step).toBe(1);
    expect(errorEvents[0]?.stepName).toBe("クエリプランニング");
    expect(errorEvents[0]?.message).toContain("Planning failed");
  });

  it("should emit section progress during section search", async () => {
    const { emit, events } = createMockEmit();
    let capturedCallback: (() => void) | undefined;

    const mockServices = {
      queryPlanning: {
        createQueryPlan: vi.fn().mockResolvedValue({
          subqueries: ["test"],
          entities: { speakers: [], topics: [] },
          enabledStrategies: [],
          confidence: 0.9,
        }),
      },
      orchestrator: {
        run: vi.fn().mockImplementation((params) => {
          capturedCallback = params.onSectionComplete;
          // Simulate calling the callback 3 times
          if (capturedCallback) {
            capturedCallback();
            capturedCallback();
            capturedCallback();
          }
          return Promise.resolve({
            finalDocs: [],
            sectionHitMap: new Map(),
            iterations: 1,
          });
        }),
      },
      pdfExtraction: {
        extractBySections: vi.fn(),
      },
      sectionSynthesis: {
        synthesize: vi.fn().mockResolvedValue({}),
      },
      providerRegistry: {
        byIds: vi.fn().mockReturnValue([]),
      },
    };

    await executeDeepResearchStreaming(mockRequest, emit, mockServices);

    // Filter events for section search step
    const sectionEvents = events.filter(
      (e): e is Extract<ProgressEvent, { type: "progress" }> =>
        e.type === "progress" && e.stepName === "セクション別検索",
    );

    // Should have initial emit + 3 progress updates
    expect(sectionEvents.length).toBeGreaterThanOrEqual(1);
    const lastSectionEvent = sectionEvents[sectionEvents.length - 1];
    expect(lastSectionEvent?.sectionProgress).toBeDefined();
    expect(lastSectionEvent?.sectionProgress?.completed).toBe(3);
  });

  it("should handle files when provided", async () => {
    const requestWithFiles: DeepResearchRequestValidated = {
      ...mockRequest,
      files: [
        {
          name: "test.pdf",
          content: "base64content",
          mimeType: "application/pdf",
        },
      ],
    };

    const { emit, events } = createMockEmit();
    const mockServices = {
      queryPlanning: {
        createQueryPlan: vi.fn().mockResolvedValue({
          subqueries: [],
          entities: { speakers: [], topics: [] },
          enabledStrategies: [],
          confidence: 0.9,
        }),
      },
      orchestrator: {
        run: vi.fn().mockResolvedValue({
          finalDocs: [],
          sectionHitMap: new Map(),
          iterations: 1,
        }),
      },
      pdfExtraction: {
        extractBySections: vi.fn().mockResolvedValue([
          {
            sectionKey: "test_section",
            docs: [],
          },
        ]),
      },
      sectionSynthesis: {
        synthesize: vi.fn().mockResolvedValue({}),
      },
      providerRegistry: {
        byIds: vi.fn().mockReturnValue([]),
      },
    };

    await executeDeepResearchStreaming(requestWithFiles, emit, mockServices);

    expect(mockServices.pdfExtraction.extractBySections).toHaveBeenCalled();

    const pdfStepEvents = events.filter(
      (e): e is Extract<ProgressEvent, { type: "progress" }> =>
        e.type === "progress" && e.stepName === "PDF抽出",
    );

    expect(pdfStepEvents.length).toBeGreaterThan(0);
    expect(pdfStepEvents[0]?.message).toContain("1個のファイル");
  });

  it("should pass emit function to section synthesis service", async () => {
    const { emit } = createMockEmit();
    const synthesizeSpy = vi.fn().mockResolvedValue("# テスト結果\n\n概要です");

    const mockServices = {
      queryPlanning: {
        createQueryPlan: vi.fn().mockResolvedValue({
          subqueries: [],
          entities: { speakers: [], topics: [] },
          enabledStrategies: [],
          confidence: 0.9,
        }),
      },
      orchestrator: {
        run: vi.fn().mockResolvedValue({
          finalDocs: [
            {
              id: "doc1",
              text: "test content",
              source: { providerId: "test" },
            },
          ],
          sectionHitMap: new Map(),
          iterations: 1,
        }),
      },
      pdfExtraction: {
        extractBySections: vi.fn(),
      },
      sectionSynthesis: {
        synthesize: synthesizeSpy,
      },
      providerRegistry: {
        byIds: vi.fn().mockReturnValue([]),
      },
    };

    await executeDeepResearchStreaming(mockRequest, emit, mockServices);

    // synthesize が emit パラメータ付きで呼ばれることを確認
    expect(synthesizeSpy).toHaveBeenCalled();
    const synthesizeCall = synthesizeSpy.mock.calls[0];
    expect(synthesizeCall).toBeDefined();
    expect(synthesizeCall?.length).toBe(4); // query, asOfDate, evidences, emit
    expect(typeof synthesizeCall?.[3]).toBe("function"); // 4番目の引数がemit関数
  });

  it("should emit synthesis_chunk events during section synthesis", async () => {
    const { emit, events } = createMockEmit();

    // Mock synthesis that emits chunks
    const synthesizeMock = vi
      .fn()
      .mockImplementation(async (_query, _date, _evidences, emitFn) => {
        if (emitFn) {
          await emitFn({ type: "synthesis_chunk", chunk: "chunk1" });
          await emitFn({ type: "synthesis_chunk", chunk: "chunk2" });
          await emitFn({ type: "synthesis_chunk", chunk: "chunk3" });
        }
        return "# テスト結果\n\n概要です";
      });

    const mockServices = {
      queryPlanning: {
        createQueryPlan: vi.fn().mockResolvedValue({
          subqueries: [],
          entities: { speakers: [], topics: [] },
          enabledStrategies: [],
          confidence: 0.9,
        }),
      },
      orchestrator: {
        run: vi.fn().mockResolvedValue({
          finalDocs: [
            {
              id: "doc1",
              text: "test content",
              source: { providerId: "test" },
            },
          ],
          sectionHitMap: new Map(),
          iterations: 1,
        }),
      },
      pdfExtraction: {
        extractBySections: vi.fn(),
      },
      sectionSynthesis: {
        synthesize: synthesizeMock,
      },
      providerRegistry: {
        byIds: vi.fn().mockReturnValue([]),
      },
    };

    await executeDeepResearchStreaming(mockRequest, emit, mockServices);

    // synthesis_chunk イベントが emit されることを確認
    const chunkEvents = events.filter(
      (e): e is Extract<ProgressEvent, { type: "synthesis_chunk" }> =>
        e.type === "synthesis_chunk",
    );

    expect(chunkEvents).toHaveLength(3);
    expect(chunkEvents[0]?.chunk).toBe("chunk1");
    expect(chunkEvents[1]?.chunk).toBe("chunk2");
    expect(chunkEvents[2]?.chunk).toBe("chunk3");
  });
});
