/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import { resolve } from "node:path";
import dts from "vite-plugin-dts";

export default defineConfig({
	plugins: [
		dts({
			tsconfigPath: resolve(__dirname, "tsconfig.build.json"),
			include: ["lib/**/*"],
			exclude: ["tests/**/*", "**/*.test.ts"],
			outDir: "dist",
		}),
	],
	build: {
		lib: {
			entry: {
				index: resolve(__dirname, "lib/index.ts"),
			},
			formats: ["es", "cjs"],
			fileName: (format, entryName) => {
				if (format === "es") return `es/${entryName}.js`;
				if (format === "cjs") return `cjs/${entryName}.cjs`;
				return `${entryName}.js`;
			},
		},
		rollupOptions: {
			external: ["@oofp/core"],
			output: {
				preserveModules: false,
			},
		},
		sourcemap: true,
		minify: false,
	},
	test: {
		globals: true,
		environment: "node",
		watch: false,
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html"],
			exclude: ["tests/**", "**/*.test.ts", "dist/**"],
		},
	},
});
