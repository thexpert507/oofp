/**
 * Benchmark: Discriminated union filter — Traversal + Prism.match vs filter + type guard
 *
 * Scenario: given a heterogeneous IncludedEntity[] (ProfileEntity,
 * PositionEntity, PositionGroupEntity, SkillEntity, CollectionResponse, ...),
 * collect only the SkillEntity items.
 *
 * CONTEXT
 * -------
 * This is the scenario where focal's value proposition is most tangible.
 *
 * Imperative approach:
 *   - Requires a manually-written type guard per variant (`isSkill`, `isProfile`, ...).
 *   - Each guard is a potential source of bugs (wrong `$type` string literal,
 *     missing fields in the check, etc.).
 *   - Adding a new variant = new guard + new filter call = new surface for mistakes.
 *
 * Focal approach:
 *   - `Prism.match` derives the discrimination from the TypeScript type itself.
 *   - Composing `Traversal.each + Prism.match` collects only matching items in
 *     a single pass — no separate filter step needed.
 *   - Adding a new variant = one new `match(...)` call.
 *
 * Performance note:
 *   - Both perform a linear scan of the array; the asymptotic complexity is the
 *     same. The focal version has a small constant overhead from the optic
 *     abstraction; the imperative version may be marginally faster in raw
 *     throughput for this specific single-type case.
 *   - In practice the difference is dominated by array allocation, not optic overhead.
 *
 * What this benchmark does NOT measure:
 *   - The imperative boilerplate grows linearly with the number of variants;
 *     focal's composition does not.
 *   - Type guard correctness is not enforced at compile time in the imperative version.
 */

import { bench, describe } from "vitest";
import * as focalApi from "./_helpers/focal-api-impl.ts";
import * as focalBuilder from "./_helpers/focal-builder-impl.ts";
import * as focal from "./_helpers/focal-impl.ts";
import * as imperative from "./_helpers/imperative.ts";
import { candidateProfileResponse } from "./_helpers/fixtures.ts";

const { included } = candidateProfileResponse;

describe("Discriminated union filter — collect all SkillEntity from mixed array", () => {
	bench("@oofp/focal  Focal API  from().elements().match().collect()", () => {
		focalApi.filterByType(included);
	});

	bench("@oofp/focal  Builder   fromEach().match().collect()", () => {
		focalBuilder.filterByType(included);
	});

	bench("@oofp/focal  Traversal.each + Prism.match + Traversal.collect", () => {
		focal.filterByType(included);
	});

	bench("imperative   array.filter(isSkill) type guard", () => {
		imperative.filterByType(included);
	});
});
