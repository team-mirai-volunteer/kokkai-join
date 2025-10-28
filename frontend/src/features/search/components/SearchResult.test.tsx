import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SearchResult } from "./SearchResult";

describe("SearchResult", () => {
  it("should display placeholder when no result", () => {
    render(<SearchResult result="" loading={false} />);

    expect(
      screen.getByText("検索結果がここに表示されます"),
    ).toBeInTheDocument();
  });

  it("should display nothing when loading without result", () => {
    const { container } = render(<SearchResult result="" loading={true} />);

    // Loading without content should show nothing
    expect(container.firstChild).toBeNull();
  });

  it("should render markdown content", () => {
    const result = "# 見出し\n\n本文です。";

    render(<SearchResult result={result} loading={false} />);

    expect(screen.getByRole("heading", { name: "見出し" })).toBeInTheDocument();
    expect(screen.getByText("本文です。")).toBeInTheDocument();
  });

  it("should not display placeholder when loading", () => {
    render(<SearchResult result="" loading={true} />);

    expect(
      screen.queryByText("検索結果がここに表示されます"),
    ).not.toBeInTheDocument();
  });

  it("should not display placeholder when result exists", () => {
    render(<SearchResult result="# Result" loading={false} />);

    expect(
      screen.queryByText("検索結果がここに表示されます"),
    ).not.toBeInTheDocument();
  });

  it("should display streaming content even when loading is true", () => {
    const streamingResult = "# 政治資金\n\n政治資金に関する情報";

    render(<SearchResult result={streamingResult} loading={true} />);

    // During streaming (loading=true but result exists), should show content
    expect(
      screen.getByRole("heading", { name: "政治資金" }),
    ).toBeInTheDocument();
    expect(screen.getByText("政治資金に関する情報")).toBeInTheDocument();
  });
});
