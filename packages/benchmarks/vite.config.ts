import { resolve } from "path";
/// <reference types="vitest/config" />
import { defineConfig } from "vite";

export default defineConfig({
	resolve: {
		alias: [
			// Internal alias used by @oofp/core sources
			{ find: /^@\/(.*)/, replacement: resolve(__dirname, "../core/lib/$1") },
			// Resolve workspace packages directly from source so benchmarks
			// work without a separate build step for sibling packages.
			{ find: "@oofp/focal/lens", replacement: resolve(__dirname, "../focal/lib/lens.ts") },
			{ find: "@oofp/focal/prism", replacement: resolve(__dirname, "../focal/lib/prism.ts") },
			{
				find: "@oofp/focal/traversal",
				replacement: resolve(__dirname, "../focal/lib/traversal.ts"),
			},
			{ find: "@oofp/focal/iso", replacement: resolve(__dirname, "../focal/lib/iso.ts") },
			{ find: "@oofp/focal/compose", replacement: resolve(__dirname, "../focal/lib/compose.ts") },
			{
				find: "@oofp/focal/builder",
				replacement: resolve(__dirname, "../focal/lib/builder/index.ts"),
			},
			{ find: "@oofp/focal", replacement: resolve(__dirname, "../focal/lib/index.ts") },
			{ find: "@oofp/core/pipe", replacement: resolve(__dirname, "../core/lib/pipe.ts") },
			{ find: "@oofp/core/maybe", replacement: resolve(__dirname, "../core/lib/maybe.ts") },
			{ find: "@oofp/core/either", replacement: resolve(__dirname, "../core/lib/either.ts") },
			{ find: "@oofp/core/task", replacement: resolve(__dirname, "../core/lib/task.ts") },
			{
				find: "@oofp/core/task-either",
				replacement: resolve(__dirname, "../core/lib/task-either.ts"),
			},
		],
	},
	test: {
		watch: false,
		benchmark: {
			include: ["comparison/**/*.bench.ts"],
		},
	},
});
