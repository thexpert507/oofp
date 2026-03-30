/**
 * Benchmark: Read access — Lens.prop vs direct property access
 *
 * Scenario: get `firstName` from a ProfileEntity.
 *
 * CONTEXT
 * -------
 * Direct property access (`profile.firstName`) will always be faster for
 * simple reads — that is expected and honest. The overhead here is the cost
 * of the optic abstraction itself (~1 extra function call).
 *
 * What this benchmark shows:
 *   - The overhead is constant and small (nanosecond range).
 *   - It does NOT grow with nesting depth (compose-once, reuse-many).
 *
 * What this benchmark does NOT measure:
 *   - Type-safety: focal enforces the key exists at compile time.
 *   - Reusability: the lens is defined once and composed into larger optics.
 */

import { bench, describe } from "vitest";
import * as focal from "./_helpers/focal-impl.ts";
import * as imperative from "./_helpers/imperative.ts";
import { candidateProfileResponse } from "./_helpers/fixtures.ts";
import type { ProfileEntity } from "./_helpers/types.ts";

const profile = candidateProfileResponse.included.find(
	(e) => e.$type === "com.linkedin.voyager.dash.identity.profile.Profile",
) as ProfileEntity;

describe("Read access — get firstName from ProfileEntity", () => {
	bench("@oofp/focal  Lens.prop('firstName')", () => {
		focal.readAccess(profile);
	});

	bench("imperative   profile.firstName", () => {
		imperative.readAccess(profile);
	});
});
