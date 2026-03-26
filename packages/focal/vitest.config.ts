import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

const core = (p: string) => resolve(__dirname, "../core/lib", p);

export default defineConfig({
	resolve: {
		alias: {
			"@oofp/core/io": core("io.ts"),
			"@oofp/core/maybe": core("maybe.ts"),
			"@oofp/core/either": core("either.ts"),
			"@oofp/core/pipe": core("pipe.ts"),
			"@oofp/core/flow": core("flow.ts"),
			"@oofp/core/function": core("function.ts"),
			// core-internal alias (@/*) used by core's own modules
			"@": resolve(__dirname, "../core/lib"),
		},
	},
	test: {
		globals: true,
		environment: "node",
		watch: false,
	},
});
