#!/usr/bin/env npx tsx

/**
 * PDFSectionExtractionService の単体テストスクリプト
 *
 * 使用方法:
 *   npx tsx scripts/test-pdf-extraction.ts <pdf-file-path> <query>
 *
 * 例:
 *   npx tsx scripts/test-pdf-extraction.ts ./test.pdf "防衛費増額について"
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import { PDFSectionExtractionService, PDFSectionResult } from "../services/pdf-section-extraction.js";
import { config } from "dotenv";

async function main() {
  config();
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error("Usage: npx tsx scripts/test-pdf-extraction.ts <pdf-file-path> <query>");
    console.error('Example: npx tsx scripts/test-pdf-extraction.ts ./test.pdf "防衛費増額について"');
    process.exit(1);
  }

  const [pdfPath, query] = args;
  const resolvedPath = resolve(pdfPath);

  console.log("📄 PDF Section Extraction Test");
  console.log("================================");
  console.log(`PDF Path: ${resolvedPath}`);
  console.log(`Query: ${query}`);
  console.log("");

  // PDFファイルを読み込み
  let fileBuffer: Buffer;
  try {
    fileBuffer = readFileSync(resolvedPath);
    console.log(`✅ PDF loaded: ${fileBuffer.length} bytes`);
  } catch (error) {
    console.error(`❌ Failed to read PDF file: ${(error as Error).message}`);
    process.exit(1);
  }

  // PDFSectionExtractionService のインスタンス作成
  const service = new PDFSectionExtractionService();

  // 抽出実行
  console.log("");
  console.log("🔍 Extracting sections from PDF...");
  console.log("");

  const startTime = Date.now();
  let results: PDFSectionResult[];

  try {
    results = await service.extractBySections({
      query,
      fileBuffer,
      fileName: pdfPath.split("/").pop(),
      mimeType: "application/pdf",
    });
    const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ Extraction completed in ${elapsedTime}s`);
  } catch (error) {
    console.error(`❌ Extraction failed: ${(error as Error).message}`);
    process.exit(1);
  }

  // 結果を表示
  console.log("");
  console.log("📊 Results");
  console.log("==========");
  console.log(`Total sections with results: ${results.length}`);
  console.log("");

  if (results.length === 0) {
    console.log("⚠️  No relevant sections found in PDF");
    return;
  }

  // 各セクションの詳細を表示
  for (const { sectionKey, docs } of results) {
    console.log(`\n🔹 Section: ${sectionKey}`);
    console.log(`   Documents: ${docs.length}`);

    docs.forEach((doc, index) => {
      console.log(`\n   Document ${index + 1}:`);
      console.log(`   - ID: ${doc.id}`);
      console.log(`   - Title: ${doc.title}`);
      console.log(`   - Score: ${doc.score?.toFixed(2) ?? "N/A"}`);
      console.log(`   - Page: ${doc.extras?.pageNumber ?? "N/A"}`);
      console.log(`   - Keywords: ${doc.extras?.keywords ? (doc.extras.keywords as string[]).join(", ") : "N/A"}`);
      console.log(`   - Content (first 150 chars): ${doc.content.substring(0, 150)}...`);
    });
  }

  console.log("\n");
  console.log("✅ Test completed successfully");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
