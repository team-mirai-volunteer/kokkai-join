import type { DeepResearchResponse } from "../types/deepresearch.js";

export function convertDeepResearchToMarkdown(
  response: DeepResearchResponse,
): string {
  const lines: string[] = [];

  // Title
  lines.push(`# ${response.query}`);
  lines.push("");

  // Date if available
  if (response.asOfDate) {
    lines.push(`*${response.asOfDate}時点の情報*`);
    lines.push("");
  }

  // Create citation map (evidence id -> URL)
  const citationMap = new Map<string, string>();
  const citationNumbers = new Map<string, number>();
  let citationCounter = 1;

  // Collect all citations used in sections
  const collectCitations = (citations: string[]) => {
    for (const cid of citations) {
      if (!citationNumbers.has(cid)) {
        const evidence = response.evidences.find((e) => e.id === cid);
        if (evidence?.url) {
          citationNumbers.set(cid, citationCounter++);
          citationMap.set(cid, evidence.url);
        }
      }
    }
  };

  // Pre-process all sections to collect citations in order
  for (const section of Object.values(response.sections)) {
    if (section.type === "text") {
      collectCitations(section.citations);
    } else if (section.type === "list") {
      for (const item of section.items) {
        collectCitations(item.citations);
      }
    } else if (section.type === "timeline") {
      for (const item of section.items) {
        collectCitations(item.citations);
      }
    } else if (section.type === "impact") {
      for (const item of section.items) {
        collectCitations(item.citations);
      }
    } else if (section.type === "links") {
      for (const link of section.links) {
        collectCitations(link.citations);
      }
    }
  }

  // Format citations as footnote references
  const formatCitations = (citations: string[]): string => {
    const footnotes = citations
      .filter((cid) => citationNumbers.has(cid))
      .map((cid) => `[^${citationNumbers.get(cid)}]`);
    return footnotes.length > 0 ? footnotes.join("") : "";
  };

  // Process sections
  const sections = response.sections;

  // law_name セクションは廃止（不要）

  // Purpose overview
  if (sections.purpose_overview) {
    lines.push(`## ${sections.purpose_overview.title}`);
    lines.push("");
    lines.push(
      `${sections.purpose_overview.content}${formatCitations(sections.purpose_overview.citations)}`,
    );
    lines.push("");
  }

  // Current status
  if (sections.current_status) {
    lines.push(`## ${sections.current_status.title}`);
    lines.push("");
    lines.push(
      `${sections.current_status.content}${formatCitations(sections.current_status.citations)}`,
    );
    lines.push("");
  }

  // Timeline
  if (sections.timeline) {
    lines.push(`## ${sections.timeline.title}`);
    lines.push("");
    for (const item of sections.timeline.items) {
      lines.push(
        `- **${item.date}**: ${item.text}${formatCitations(item.citations)}`,
      );
    }
    lines.push("");
  }

  // Key points
  if (sections.key_points) {
    lines.push(`## ${sections.key_points.title}`);
    lines.push("");
    for (const item of sections.key_points.items) {
      lines.push(`- ${item.text}${formatCitations(item.citations)}`);
    }
    lines.push("");
  }

  // Background
  if (sections.background) {
    lines.push(`## ${sections.background.title}`);
    lines.push("");
    lines.push(
      `${sections.background.content}${formatCitations(sections.background.citations)}`,
    );
    lines.push("");
  }

  // Main issues
  if (sections.main_issues) {
    lines.push(`## ${sections.main_issues.title}`);
    lines.push("");
    for (const item of sections.main_issues.items) {
      lines.push(`- ${item.text}${formatCitations(item.citations)}`);
    }
    lines.push("");
  }

  // Reasons for amendment
  if (sections.reasons_for_amendment) {
    lines.push(`## ${sections.reasons_for_amendment.title}`);
    lines.push("");
    for (const item of sections.reasons_for_amendment.items) {
      lines.push(`- ${item.text}${formatCitations(item.citations)}`);
    }
    lines.push("");
  }

  // Impact analysis
  if (sections.impact_analysis) {
    lines.push(`## ${sections.impact_analysis.title}`);
    lines.push("");
    for (const item of sections.impact_analysis.items) {
      lines.push(`### ${item.target}`);
      lines.push("");
      lines.push(`概要: ${item.overview}`);
      lines.push("");
      lines.push(`理由: ${item.reason}${formatCitations(item.citations)}`);
      lines.push("");
    }
  }

  // Past debates summary
  if (sections.past_debates_summary) {
    lines.push(`## ${sections.past_debates_summary.title}`);
    lines.push("");
    lines.push(
      `${sections.past_debates_summary.content}${formatCitations(
        sections.past_debates_summary.citations,
      )}`,
    );
    lines.push("");
  }

  // Add footnotes section if there are any citations
  if (citationMap.size > 0) {
    lines.push("---");
    lines.push("");

    // Sort by citation number
    const sortedCitations = Array.from(citationNumbers.entries()).sort(
      (a, b) => a[1] - b[1],
    );

    for (const [cid, num] of sortedCitations) {
      const evidence = response.evidences.find((e) => e.id === cid);
      if (evidence) {
        const title = evidence.title || "参照元";
        const url = evidence.url || "";
        lines.push(`[^${num}]: [${title}](${url})`);
      }
    }
  }

  return lines.join("\n");
}
