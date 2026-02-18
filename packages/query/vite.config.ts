/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import { resolve } from "node:path";
import dts from "vite-plugin-dts";

export default defineConfig({
	resolve: { alias: { "@": resolve(__dirname, "lib") } },
	build: {
		lib: {
			entry: resolve(__dirname, "lib/index.ts"),
			name: "oofp-query",
			formats: ["es", "cjs"],
			fileName: (format, chunk) => {
				if (format === "cjs") return `${format}/${chunk}.cjs`;
				return `${format}/${chunk}.js`;
			},
		},
		rollupOptions: {
			external: ["@oofp/core", "redis"],
		},
	},
	plugins: [
		dts({
			tsconfigPath: resolve(__dirname, "tsconfig.build.json"),
			rollupTypes: true,
		}),
	],
	test: {
		watch: false,
		include: ["**/*.{test,spec}.?(c|m)[jt]s?(x)"],
		exclude: ["**/*.bench.ts", "**/node_modules/**", "**/.git/**"],
	},
});
