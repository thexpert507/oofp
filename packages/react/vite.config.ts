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
			external: ["@oofp/core", "react", "react-dom", "react/jsx-runtime", "immer"],
			output: {
				preserveModules: false,
			},
		},
		sourcemap: true,
		minify: false,
	},
	test: {
		watch: false,
	},
});
