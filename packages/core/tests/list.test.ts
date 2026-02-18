/**
 * Copyright (c) 2025 thexpert507
 * Licensed under the MIT License. See LICENSE file in the project root.
 */

import { describe, it, expect } from "vitest";
import * as L from "../lib/list";

describe("List Functor", () => {
	it("Is equals function", () => {
		const a1 = [1, 2, 3];
		const a2 = [1, 2, 3];

		expect(L.equals(a1)(a2)).toBe(true);
	});
});
