import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SearchResult } from "./SearchResult";

describe("SearchResult", () => {
  it("should display placeholder when no result", () => {
    render(<SearchResult result="" query="" loading={false} />);

    expect(screen.getByText("検索結果がここに表示されます")).toBeInTheDocument();
  });

  it("should display loading message when loading", () => {
    render(<SearchResult result="" query="" loading={true} />);

    expect(screen.getByText("処理中...")).toBeInTheDocument();
  });

  it("should display search result with query as title", () => {
    const query = "防衛費";
    const result = "# 検索結果\n\n防衛費に関する情報です。";

    render(<SearchResult result={result} query={query} loading={false} />);

    expect(screen.getByRole("heading", { name: query })).toBeInTheDocument();
  });

  it("should render markdown content", () => {
    const result = "# 見出し\n\n本文です。";

    render(<SearchResult result={result} query="test" loading={false} />);

    expect(screen.getByRole("heading", { name: "見出し" })).toBeInTheDocument();
    expect(screen.getByText("本文です。")).toBeInTheDocument();
  });

  it("should not display placeholder when loading", () => {
    render(<SearchResult result="" query="" loading={true} />);

    expect(screen.queryByText("検索結果がここに表示されます")).not.toBeInTheDocument();
  });

  it("should not display placeholder when result exists", () => {
    render(<SearchResult result="# Result" query="test" loading={false} />);

    expect(screen.queryByText("検索結果がここに表示されます")).not.toBeInTheDocument();
  });
});
