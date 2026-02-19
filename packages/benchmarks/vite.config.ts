/// <reference types="vitest/config" />
import { defineConfig } from "vite";

export default defineConfig({
	test: {
		watch: false,
		benchmark: {
			include: ["comparison/**/*.bench.ts"],
		},
	},
});
