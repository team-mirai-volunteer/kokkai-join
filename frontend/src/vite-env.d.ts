/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_API_ENDPOINT: string;
	// more env variables can be added here...
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
