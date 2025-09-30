import { KokkaiDeepResearchAPI } from "../../lib/deepresearch-api.js";

// Initialize API instance (singleton pattern for warm starts)
const apiInstance = new KokkaiDeepResearchAPI();
await apiInstance.initialize();

// Export Hono app directly - Vercel handles the rest
export default apiInstance.getApp();
