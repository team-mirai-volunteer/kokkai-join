import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ProgressState } from "@/features/search/types/progress";
import { ProgressDisplay } from "./ProgressDisplay";

describe("ProgressDisplay", () => {
	it("should display basic progress information", () => {
		const progress: ProgressState = {
			step: 1,
			totalSteps: 5,
			stepName: "クエリプランニング",
		};

		render(<ProgressDisplay progress={progress} />);

		expect(
			screen.getByText("ステップ 1/5: クエリプランニング"),
		).toBeInTheDocument();
	});

	it("should display optional message when provided", () => {
		const progress: ProgressState = {
			step: 2,
			totalSteps: 5,
			stepName: "セクション別検索",
			message: "検索を実行しています...",
		};

		render(<ProgressDisplay progress={progress} />);

		expect(screen.getByText("検索を実行しています...")).toBeInTheDocument();
	});

	it("should not display message when not provided", () => {
		const progress: ProgressState = {
			step: 1,
			totalSteps: 5,
			stepName: "クエリプランニング",
		};

		const { container } = render(<ProgressDisplay progress={progress} />);

		// Only step information should be shown
		const progressDisplay = container.querySelector(".progress-display");
		expect(progressDisplay?.textContent).toBe("ステップ 1/5: クエリプランニング");
	});

	it("should display section progress when provided", () => {
		const progress: ProgressState = {
			step: 2,
			totalSteps: 5,
			stepName: "セクション別検索",
			sectionProgress: {
				completed: 3,
				total: 9,
			},
		};

		render(<ProgressDisplay progress={progress} />);

		expect(screen.getByText("3/9 完了")).toBeInTheDocument();
	});

	it("should display both message and section progress when both provided", () => {
		const progress: ProgressState = {
			step: 2,
			totalSteps: 5,
			stepName: "セクション別検索",
			message: "検索中...",
			sectionProgress: {
				completed: 5,
				total: 9,
			},
		};

		render(<ProgressDisplay progress={progress} />);

		expect(screen.getByText("検索中...")).toBeInTheDocument();
		expect(screen.getByText("5/9 完了")).toBeInTheDocument();
	});

	it("should handle different step numbers correctly", () => {
		const progress: ProgressState = {
			step: 4,
			totalSteps: 4,
			stepName: "セクション統合",
		};

		render(<ProgressDisplay progress={progress} />);

		expect(
			screen.getByText("ステップ 4/4: セクション統合"),
		).toBeInTheDocument();
	});

	it("should have proper ARIA attributes for progress bars", () => {
		const progress: ProgressState = {
			step: 1,
			totalSteps: 5,
			stepName: "クエリプランニング",
		};

		render(<ProgressDisplay progress={progress} />);

		expect(screen.getByRole("progressbar")).toBeInTheDocument();
	});

	it("should calculate and display progress percentage", () => {
		const progress: ProgressState = {
			step: 2,
			totalSteps: 4,
			stepName: "セクション別検索",
		};

		render(<ProgressDisplay progress={progress} />);

		// Step 2 of 4 = 50%
		const progressBar = screen.getByRole("progressbar");
		expect(progressBar).toHaveAttribute("aria-valuenow", "50");
		expect(progressBar).toHaveAttribute("aria-valuemin", "0");
		expect(progressBar).toHaveAttribute("aria-valuemax", "100");
	});

	it("should handle section progress percentage correctly", () => {
		const progress: ProgressState = {
			step: 2,
			totalSteps: 5,
			stepName: "セクション別検索",
			sectionProgress: {
				completed: 6,
				total: 9,
			},
		};

		render(<ProgressDisplay progress={progress} />);

		// 6 of 9 sections ≈ 66.67%
		const sectionProgress = screen.getByRole("progressbar", {
			name: /section/i,
		});
		expect(sectionProgress).toHaveAttribute("aria-valuenow", "67");
	});
});
