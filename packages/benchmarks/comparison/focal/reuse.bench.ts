/**
 * Benchmark: Route reuse — does pre-building a Focal pipe improve performance?
 *
 * HYPOTHESIS
 * ----------
 * The idiomatic Focal API pattern constructs the full pipe on every call:
 *
 *   pipe(Focal.from<ProfileEntity>(), Focal.prop("firstName"), Focal.get(s))
 *
 * If some of that cost is pipe *construction* (allocating the focal chain)
 * rather than pipe *execution* (traversing the data), then pre-building the
 * route as a module-level constant and only supplying the terminator at call
 * time should be measurably faster:
 *
 *   // built once
 *   const firstNameFocal = pipe(Focal.from<ProfileEntity>(), Focal.prop("firstName"));
 *   // applied per call
 *   pipe(firstNameFocal, Focal.get(s))
 *
 * CANDIDATES (4 per scenario)
 * ---------------------------
 *   A. Focal API — idiomatic     Full pipe constructed on every call (current pattern)
 *   B. Focal API — pre-built     Route is a module-level constant; only terminator varies
 *   C. Optics (pure)             Module-level Lens/Prism/Traversal constants (reference)
 *   D. Imperative                Direct property access / filter (baseline)
 *
 * SCENARIOS
 * ---------
 *   1. Read simple    — get firstName from ProfileEntity
 *   2. Collect        — collect all SkillEntity from IncludedEntity[]
 *   3. Modify + run   — update firstName across all ProfileEntity in the response
 *
 * READING THE RESULTS
 * -------------------
 * The gap between (A) and (B) isolates the cost of pipe construction.
 * The gap between (B) and (C) isolates the cost of the Focal wrapper vs.
 * raw optic primitives — both use pre-built module-level definitions.
 * The gap between (C) and (D) is the irreducible optic abstraction cost.
 *
 * If (A) ≈ (B): construction is cheap — the idiomatic pattern has no penalty.
 * If (A) >> (B): construction dominates — pre-building routes matters for hot paths.
 */

import { bench, describe } from "vitest";
import { pipe } from "@oofp/core/pipe";
import { Focal } from "@oofp/focal";
import { FocalBuilder } from "@oofp/focal/builder";
import * as Lens from "@oofp/focal/lens";
import * as Prism from "@oofp/focal/prism";
import * as Traversal from "@oofp/focal/traversal";
import { compose } from "@oofp/focal/compose";

import * as imperative from "./_helpers/imperative.ts";
import { candidateProfileResponse } from "./_helpers/fixtures.ts";
import type {
	IncludedEntity,
	NormalizedStoreResponse,
	ProfileEntity,
	SkillEntity,
} from "./_helpers/types.ts";

// ── $type constants ───────────────────────────────────────────────────────────

const T_PROFILE = "com.linkedin.voyager.dash.identity.profile.Profile" as const;
const T_SKILL = "com.linkedin.voyager.dash.identity.profile.Skill" as const;

// ── Fixture ───────────────────────────────────────────────────────────────────

const response = candidateProfileResponse;
const profile = response.included.find((e) => e.$type === T_PROFILE) as ProfileEntity;
const { included } = response;

// ── Pre-built Focal API routes (module-level constants) ───────────────────────
//
// These mirror the optic (pure) approach: define the route once, reuse it.
// The terminator (get / collect / modify+run) is still applied per call.

const firstNameFocalPrebuilt = pipe(Focal.from<ProfileEntity>(), Focal.prop("firstName"));

const skillsFocalPrebuilt = pipe(
	Focal.from<IncludedEntity[]>(),
	Focal.elements(),
	Focal.match<IncludedEntity>()("$type")(T_SKILL),
);

const profileFirstNameUpdatePrebuilt = pipe(
	Focal.from<NormalizedStoreResponse>(),
	Focal.prop("included"),
	Focal.elements(),
	Focal.match<IncludedEntity>()("$type")(T_PROFILE),
	Focal.prop("firstName"),
	Focal.modify(() => "Updated"),
);

// ── Pre-built optic (pure) routes (module-level constants) ────────────────────
//
// Low-level Lens/Prism/Traversal — the existing focal-impl.ts pattern.
// Included here as the reference "best case" for pre-built definitions.

const firstNameLens = pipe(Lens.identity<ProfileEntity>(), Lens.prop("firstName"));

const eachEntity = Traversal.each<IncludedEntity>();
const skillPrism = Prism.match<IncludedEntity>()("$type", T_SKILL);
const allSkillsTraversal = compose(skillPrism)(eachEntity);

const profilePrism = Prism.match<IncludedEntity>()("$type", T_PROFILE);
const profilesTraversal = compose(profilePrism)(eachEntity);
const firstNameTraversal = compose(firstNameLens)(profilesTraversal);

// ── Pre-built Builder routes (module-level constants) ─────────────────────────
//
// The builder chain is constructed once and stored; only the terminal
// (.get / .collect / .run) is invoked per call.

const firstNameBuilderPrebuilt = FocalBuilder.from<ProfileEntity>().prop("firstName");

const skillsBuilderPrebuilt = FocalBuilder.fromEach<IncludedEntity>().match("$type", T_SKILL);

const profileFirstNameUpdateBuilderPrebuilt = FocalBuilder.from<NormalizedStoreResponse>()
	.prop("included")
	.elements()
	.match("$type", T_PROFILE)
	.prop("firstName");

// ── Scenario 1: Read simple — get firstName ───────────────────────────────────

describe("Route reuse — read: get firstName from ProfileEntity", () => {
	bench("Focal API  idiomatic  (pipe built per call)", () => {
		pipe(Focal.from<ProfileEntity>(), Focal.prop("firstName"), Focal.get(profile));
	});

	bench("Focal API  pre-built  (route is module-level const)", () => {
		pipe(firstNameFocalPrebuilt, Focal.get(profile));
	});

	bench("Builder    idiomatic  (chain built per call)", () => {
		FocalBuilder.from<ProfileEntity>().prop("firstName").get(profile);
	});

	bench("Builder    pre-built  (route is module-level const)", () => {
		firstNameBuilderPrebuilt.get(profile);
	});

	bench("optics     pre-built  Lens.prop + Lens.view", () => {
		pipe(firstNameLens, Lens.view(profile));
	});

	bench("imperative profile.firstName", () => {
		imperative.readAccess(profile);
	});
});

// ── Scenario 2: Collect — filterByType (skills) ───────────────────────────────

describe("Route reuse — collect: SkillEntity[] from IncludedEntity[]", () => {
	bench("Focal API  idiomatic  (pipe built per call)", () => {
		pipe(
			Focal.from<IncludedEntity[]>(),
			Focal.elements(),
			Focal.match<IncludedEntity>()("$type")(T_SKILL),
			Focal.collect(included),
		);
	});

	bench("Focal API  pre-built  (route is module-level const)", () => {
		pipe(skillsFocalPrebuilt, Focal.collect(included));
	});

	bench("Builder    idiomatic  (chain built per call)", () => {
		FocalBuilder.fromEach<IncludedEntity>().match("$type", T_SKILL).collect(included);
	});

	bench("Builder    pre-built  (route is module-level const)", () => {
		skillsBuilderPrebuilt.collect(included);
	});

	bench("optics     pre-built  Traversal.each + Prism.match + collect", () => {
		pipe(allSkillsTraversal, Traversal.collect(included));
	});

	bench("imperative array.filter(isSkill)", () => {
		imperative.filterByType(included);
	});
});

// ── Scenario 3: Modify + run — deepUpdate ────────────────────────────────────

describe("Route reuse — modify: set firstName across all ProfileEntity", () => {
	bench("Focal API  idiomatic  (pipe built per call)", () => {
		pipe(
			Focal.from<NormalizedStoreResponse>(),
			Focal.prop("included"),
			Focal.elements(),
			Focal.match<IncludedEntity>()("$type")(T_PROFILE),
			Focal.prop("firstName"),
			Focal.modify(() => "Updated"),
			Focal.run(response),
		);
	});

	bench("Focal API  pre-built  (route is module-level const)", () => {
		pipe(profileFirstNameUpdatePrebuilt, Focal.run(response));
	});

	bench("Builder    idiomatic  (chain built per call)", () => {
		FocalBuilder.from<NormalizedStoreResponse>()
			.prop("included")
			.elements()
			.match("$type", T_PROFILE)
			.prop("firstName")
			.modify(() => "Updated")
			.run(response);
	});

	bench("Builder    pre-built  (route is module-level const)", () => {
		profileFirstNameUpdateBuilderPrebuilt.modify(() => "Updated").run(response);
	});

	bench("optics     pre-built  Traversal.compose + modify", () => {
		({
			...response,
			included: pipe(firstNameTraversal, Traversal.modify(() => "Updated"))(included),
		} as NormalizedStoreResponse);
	});

	bench("imperative map + spread", () => {
		imperative.deepUpdate(response);
	});
});
