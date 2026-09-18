/// <reference types="vite/client" />

interface ImportMetaEnv {
	/** Default route path for the application */
	readonly VITE_APP_DEFAULT_ROUTE: string;
	/** Public path for static assets */
	readonly VITE_APP_PUBLIC_PATH: string;
	/** Base URL for API endpoints */
	readonly VITE_APP_API_BASE_URL: string;
	/** Routing mode: frontend routing or backend routing */
	readonly VITE_APP_ROUTER_MODE: "frontend" | "backend";
	/** Enable Vercel Analytics only when the deployment serves /_vercel/insights/script.js */
	readonly VITE_APP_ENABLE_VERCEL_ANALYTICS?: "true" | "false";

	readonly VITE_DEV_PROXY_TARGET: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
