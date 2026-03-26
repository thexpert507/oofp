import { resolve } from "node:path";
/// <reference types="vitest" />
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
	resolve: { alias: { "@": resolve(__dirname, "lib") } },
	build: {
		lib: {
			entry: {
				index: resolve(__dirname, "lib/index.ts"),
				lens: resolve(__dirname, "lib/lens.ts"),
				prism: resolve(__dirname, "lib/prism.ts"),
				traversal: resolve(__dirname, "lib/traversal.ts"),
				iso: resolve(__dirname, "lib/iso.ts"),
			},
			name: "focal",
			formats: ["es", "cjs"],
			fileName: (format, chunk) => {
				if (format === "cjs") return `${format}/${chunk}.cjs`;
				return `${format}/${chunk}.js`;
			},
		},
		rollupOptions: { external: (id) => id.startsWith("@oofp/core") },
	},
	plugins: [dts({ tsconfigPath: resolve(__dirname, "tsconfig.build.json") })],
	test: { watch: false },
});
