import { Test } from "@nestjs/testing";
import * as R from "@oofp/core/reader";
import { describe, expect, it } from "vitest";
import { provideReader } from "../src/shared/provide-reader";

describe("provideReader", () => {
	it("builds a Reader service from Nest injection tokens", async () => {
		const prefixToken = Symbol("prefix");
		const serviceToken = Symbol("service");
		const reader = R.from((context: { prefix: string }) => ({
			greet: (name: string) => `${context.prefix}, ${name}`,
		}));
		const moduleRef = await Test.createTestingModule({
			providers: [
				{ provide: prefixToken, useValue: "Hello" },
				provideReader({ provide: serviceToken, reader, context: { prefix: prefixToken } }),
			],
		}).compile();

		const service = moduleRef.get<{ greet: (name: string) => string }>(serviceToken);
		expect(service.greet("Ada")).toBe("Hello, Ada");
	});
});
