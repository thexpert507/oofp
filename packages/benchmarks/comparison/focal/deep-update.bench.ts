/**
 * Benchmark: Deep immutable update — Traversal.compose vs spread chain
 *
 * Scenario: produce a new NormalizedStoreResponse where every ProfileEntity's
 * `firstName` is replaced with "Updated".
 *
 * Structure traversed: response → included[] → ProfileEntity → firstName
 *
 * CONTEXT
 * -------
 * For updates that touch multiple levels of nesting, the imperative approach
 * relies on spread-operator chains (`{ ...a, b: { ...a.b, x: v } }`).
 * Ergonomic concerns with the imperative approach:
 *   - Each level of nesting adds a manual spread that the compiler cannot
 *     fully protect you from (e.g., forgetting a field is a silent bug).
 *   - Changing the schema (e.g., renaming a field) requires updating every
 *     call site; the focal optic centralises the path.
 *
 * What this benchmark shows:
 *   - Both do the same structural traversal; focal has a small constant
 *     overhead from the optic machinery but no asymptotic difference.
 *   - The primary argument for focal here is ergonomics and safety, not speed.
 *
 * What this benchmark does NOT measure:
 *   - The compile-time guarantee that the path exists.
 *   - How much code each approach requires when paths change.
 */

import { bench, describe } from "vitest";
import * as focal from "./_helpers/focal-impl.ts";
import * as imperative from "./_helpers/imperative.ts";
import { candidateProfileResponse } from "./_helpers/fixtures.ts";

describe("Deep immutable update — set firstName across all ProfileEntities", () => {
	bench("@oofp/focal  Traversal.compose + Traversal.modify", () => {
		focal.deepUpdate(candidateProfileResponse);
	});

	bench("imperative   included.map + spread", () => {
		imperative.deepUpdate(candidateProfileResponse);
	});
});
