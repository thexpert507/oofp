import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "node:path";

export default defineConfig({
	plugins: [react(), tailwindcss()],
	resolve: {
		alias: [
			// Only @oofp/react points to source for hot-reload during development.
			// @oofp/core and @oofp/focal are resolved from their compiled dist/
			// via pnpm workspace — their internal @/ aliases stay contained.
			{
				find: /^@oofp\/react$/,
				replacement: resolve(__dirname, "../react/lib/index.ts"),
			},
		],
	},
});
