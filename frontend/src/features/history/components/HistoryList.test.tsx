import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HistoryList } from "./HistoryList";
import type { SearchHistoryListItem } from "../../../../../types/supabase.types";

describe("HistoryList", () => {
  it("should render empty state when no histories", () => {
    render(
      <HistoryList
        histories={[]}
        loading={false}
        onHistoryClick={vi.fn()}
        onHistoryDelete={vi.fn()}
      />,
    );

    expect(screen.getByText("検索履歴がありません")).toBeInTheDocument();
  });

  it("should render loading state", () => {
    render(
      <HistoryList
        histories={[]}
        loading={true}
        onHistoryClick={vi.fn()}
        onHistoryDelete={vi.fn()}
      />,
    );

    expect(screen.getByText("読み込み中...")).toBeInTheDocument();
  });

  it("should render history list items", () => {
    const mockHistories: SearchHistoryListItem[] = [
      {
        id: "1",
        query: "防衛費と子育て支援",
        providers: ["kokkai", "web"],
        result_summary: "検索結果のサマリー...",
        file_names: [],
        created_at: "2025-01-26T00:00:00Z",
      },
      {
        id: "2",
        query: "教育改革について",
        providers: ["gov"],
        result_summary: "教育改革の検索結果...",
        file_names: ["document.pdf"],
        created_at: "2025-01-25T00:00:00Z",
      },
    ];

    render(
      <HistoryList
        histories={mockHistories}
        loading={false}
        onHistoryClick={vi.fn()}
        onHistoryDelete={vi.fn()}
      />,
    );

    expect(screen.getByText("防衛費と子育て支援")).toBeInTheDocument();
    expect(screen.getByText("教育改革について")).toBeInTheDocument();
  });

  it("should call onHistoryClick when history item is clicked", async () => {
    const mockHistories: SearchHistoryListItem[] = [
      {
        id: "1",
        query: "防衛費と子育て支援",
        providers: ["kokkai"],
        result_summary: "サマリー",
        file_names: [],
        created_at: "2025-01-26T00:00:00Z",
      },
    ];
    const onHistoryClick = vi.fn();
    const user = userEvent.setup();

    render(
      <HistoryList
        histories={mockHistories}
        loading={false}
        onHistoryClick={onHistoryClick}
        onHistoryDelete={vi.fn()}
      />,
    );

    const historyItem = screen.getByText("防衛費と子育て支援").closest("div");
    if (historyItem) {
      await user.click(historyItem);
      expect(onHistoryClick).toHaveBeenCalledWith("1");
    }
  });

  it("should call onHistoryDelete when delete button is clicked", async () => {
    const mockHistories: SearchHistoryListItem[] = [
      {
        id: "1",
        query: "防衛費と子育て支援",
        providers: ["kokkai"],
        result_summary: "サマリー",
        file_names: [],
        created_at: "2025-01-26T00:00:00Z",
      },
    ];
    const onHistoryDelete = vi.fn();
    const user = userEvent.setup();

    render(
      <HistoryList
        histories={mockHistories}
        loading={false}
        onHistoryClick={vi.fn()}
        onHistoryDelete={onHistoryDelete}
      />,
    );

    const deleteButton = screen.getByRole("button", { name: /削除/i });
    await user.click(deleteButton);

    expect(onHistoryDelete).toHaveBeenCalledWith("1");
  });

  it("should display provider badges", () => {
    const mockHistories: SearchHistoryListItem[] = [
      {
        id: "1",
        query: "test",
        providers: ["kokkai", "web", "gov"],
        result_summary: "summary",
        file_names: [],
        created_at: "2025-01-26T00:00:00Z",
      },
    ];

    render(
      <HistoryList
        histories={mockHistories}
        loading={false}
        onHistoryClick={vi.fn()}
        onHistoryDelete={vi.fn()}
      />,
    );

    expect(screen.getByText("kokkai")).toBeInTheDocument();
    expect(screen.getByText("web")).toBeInTheDocument();
    expect(screen.getByText("gov")).toBeInTheDocument();
  });

  it("should display file names when present", () => {
    const mockHistories: SearchHistoryListItem[] = [
      {
        id: "1",
        query: "test",
        providers: ["kokkai"],
        result_summary: "summary",
        file_names: ["document1.pdf", "document2.pdf"],
        created_at: "2025-01-26T00:00:00Z",
      },
    ];

    render(
      <HistoryList
        histories={mockHistories}
        loading={false}
        onHistoryClick={vi.fn()}
        onHistoryDelete={vi.fn()}
      />,
    );

    expect(screen.getByText(/document1.pdf/)).toBeInTheDocument();
    expect(screen.getByText(/document2.pdf/)).toBeInTheDocument();
  });
});
