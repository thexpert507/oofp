/**
 * Benchmark: Full domain mapping — NormalizedStoreResponse → CandidateProfile
 *
 * Scenario: transform a complete LinkedIn Voyager Dash API response (a
 * heterogeneous normalized store) into a typed CandidateProfile domain object.
 *
 * The transformation involves:
 *   - 7 entity types to discriminate and collect (Profile, Position,
 *     PositionGroup, Skill, Certification, Language, Education)
 *   - Multiple lens compositions for field extraction
 *   - Traversal + Prism compositions for filtering by $type
 *   - Optional-field handling (summary locale, companyName, etc.)
 *
 * CONTEXT
 * -------
 * This is the real-world scenario focal is designed for. Neither implementation
 * is trivial; the question is which is more maintainable as the schema evolves.
 *
 * Imperative approach (~40 lines of logic):
 *   - 7 hand-written type guards
 *   - 7 `.filter()` calls with those guards
 *   - Optional chaining (?.) scattered across multiple fields
 *   - Each schema change requires updating guards + call sites
 *
 * Focal approach (~50 lines of logic, including optic definitions):
 *   - 7 `Prism.match(...)` declarations (replaces the 7 type guards)
 *   - `collectEntities` helper composes Traversal + Prism in one place
 *   - Schema changes affect only the prism/lens definition, not every consumer
 *   - Optics are reusable across the codebase (define once, compose anywhere)
 *
 * Performance note:
 *   - The imperative version is expected to be faster for this large
 *     transformation because it makes a single pass per entity type, while
 *     focal's composable traversals add constant overhead per composition step.
 *   - The benchmark measures both honestly. In production, this transformation
 *     runs once per API response — the throughput difference is imperceptible.
 *
 * What this benchmark does NOT measure:
 *   - Maintainability cost when `IncludedEntity` grows from 7 to 20 variants.
 *   - Refactoring safety: focal centralises paths; imperative spreads them.
 *   - Correctness guarantees from lawful optics (GetPut, PutGet, etc.).
 */

import { bench, describe } from "vitest";
import * as focalApi from "./_helpers/focal-api-impl.ts";
import * as focalBuilder from "./_helpers/focal-builder-impl.ts";
import * as focal from "./_helpers/focal-impl.ts";
import * as imperative from "./_helpers/imperative.ts";
import { candidateProfileResponse } from "./_helpers/fixtures.ts";

describe("Full domain mapping — NormalizedStoreResponse → CandidateProfile", () => {
	bench("@oofp/focal  Focal API  pipe chains (from/fromEach/match/prop/collect)", () => {
		focalApi.domainMapping(candidateProfileResponse);
	});

	bench("@oofp/focal  Builder   fluent chains (from/match/prop/collect)", () => {
		focalBuilder.domainMapping(candidateProfileResponse);
	});

	bench("@oofp/focal  optic compositions (Lens + Prism + Traversal)", () => {
		focal.domainMapping(candidateProfileResponse);
	});

	bench("imperative   filter/map/find + optional chaining", () => {
		imperative.domainMapping(candidateProfileResponse);
	});
});
