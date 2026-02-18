import { version } from "@/index";
import { describe, expect, it } from "vitest";

describe("oofp-query", () => {
	it("should export version", () => {
		expect(version).toBe("0.1.0-beta.1");
	});
});
