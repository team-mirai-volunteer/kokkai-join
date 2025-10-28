import { serve } from "@hono/node-server";
import { KokkaiDeepResearchAPI } from "./lib/deepresearch-api.js";

const PORT = parseInt(process.env.PORT || "8000");

async function main() {
	const api = new KokkaiDeepResearchAPI();

	try {
		await api.initialize();

		const handleShutdown = async (signal: string) => {
			console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);
			await api.close();
			process.exit(0);
		};

		process.on("SIGINT", () => handleShutdown("SIGINT"));
		process.on("SIGTERM", () => handleShutdown("SIGTERM"));

		const app = api.getApp();

		console.log(`🚀 Starting server on port ${PORT}...`);
		serve({
			fetch: app.fetch,
			port: PORT,
			hostname: "0.0.0.0",
		});

		console.log(`🌐 Server running at http://localhost:${PORT}`);
		console.log("📋 Available endpoints:");
		console.log(`   GET  /                          - API information`);
		console.log(`   POST /api/v1/deepresearch/stream - Deep research streaming pipeline`);
	} catch (error) {
		console.error("❌ Failed to start server:", error);
		await api.close();
		process.exit(1);
	}
}

main();
