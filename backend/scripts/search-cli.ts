#!/usr/bin/env -S deno run -A

// CLI tool for deep research search

const args = Deno.args;
if (args.length === 0) {
  console.error('Usage: deno task search "<query>"');
  console.error('Example: deno task search "保護司法等の一部を改正する法律案"');
  Deno.exit(1);
}

const query = args[0];
const asOfDate = new Date().toISOString().split("T")[0]; // Today's date in YYYY-MM-DD format

const request = {
  query,
  asOfDate,
  limit: 20,
  seedUrls: [],
};

const apiUrl = Deno.env.get("DEEP_RESEARCH_URL") || "http://localhost:8000/v1/deepresearch";

try {
  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`Error: ${response.status} ${response.statusText}`);
    console.error(error);
    Deno.exit(1);
  }

  const markdown = await response.text();
  console.log(markdown);
} catch (error) {
  console.error("Failed to connect to API:", (error as Error).message);
  console.error("Make sure the Deep Research API is running at", apiUrl);
  Deno.exit(1);
}
