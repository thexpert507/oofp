/// <reference types="vitest" />
import { defineConfig } from "vite";
import { resolve } from "node:path";
import dts from "vite-plugin-dts";

export default defineConfig({
	resolve: { alias: { "@": resolve(__dirname, "lib") } },
	build: {
		lib: {
			entry: {
				["maybe-t"]: resolve(__dirname, "lib/maybe-t/index.ts"),
				utils: resolve(__dirname, "lib/utils/index.ts"),
				["bi-compose"]: resolve(__dirname, "lib/bi-compose.ts"),
				compose: resolve(__dirname, "lib/compose.ts"),
				curry: resolve(__dirname, "lib/curry.ts"),
				either: resolve(__dirname, "lib/either.ts"),
				flow: resolve(__dirname, "lib/flow.ts"),
				id: resolve(__dirname, "lib/id.ts"),
				list: resolve(__dirname, "lib/list.ts"),
				maybe: resolve(__dirname, "lib/maybe.ts"),
				memo: resolve(__dirname, "lib/memo.ts"),
				object: resolve(__dirname, "lib/object.ts"),
				pipe: resolve(__dirname, "lib/pipe.ts"),
				profunctor: resolve(__dirname, "lib/profunctor.ts"),
				promise: resolve(__dirname, "lib/promise.ts"),
				["reader-task-either"]: resolve(__dirname, "lib/reader-task-either.ts"),
				reader: resolve(__dirname, "lib/reader.ts"),
				state: resolve(__dirname, "lib/state.ts"),
				string: resolve(__dirname, "lib/string.ts"),
				["task-either"]: resolve(__dirname, "lib/task-either.ts"),
				task: resolve(__dirname, "lib/task.ts"),
				io: resolve(__dirname, "lib/io.ts"),
			},
			name: "fp",
			formats: ["es", "cjs"],
			fileName: (format, chunk) => {
				if (format === "cjs") return `${format}/${chunk}.cjs`;
				return `${format}/${chunk}.js`;
			},
		},
		rollupOptions: { external: [] },
	},
	plugins: [dts({ tsconfigPath: resolve(__dirname, "tsconfig.build.json") })],
	test: { watch: false },
});
