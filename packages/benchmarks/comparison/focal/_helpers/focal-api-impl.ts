// @oofp/focal high-level API — idiomatic usage for the normalized-store scenarios.
//
// PATTERN: every operation is a single self-contained pipe that starts at the
// root type with Focal.from<T>() and terminates with a data-first operator or
// Focal.run(s). This mirrors how the API is used in real application code and
// in the focal test suite (navigation.test.ts, terminators.test.ts,
// long-chains.test.ts).
//
// No pre-built module-level focals are shared between functions.
// Each function expresses its intent as one declarative pipe.

import { pipe } from "@oofp/core/pipe";
import { Focal } from "@oofp/focal";

import type {
	CandidateProfile,
	CertificationEntity,
	EducationEntity,
	IncludedEntity,
	LanguageEntity,
	NormalizedStoreResponse,
	ProfileEntity,
	PositionEntity,
	PositionGroupEntity,
	SkillEntity,
} from "./types.ts";

// ── $type string literals ────────────────────────────────────────────────────

const T_PROFILE = "com.linkedin.voyager.dash.identity.profile.Profile" as const;
const T_POSITION = "com.linkedin.voyager.dash.identity.profile.Position" as const;
const T_POSITION_GROUP = "com.linkedin.voyager.dash.identity.profile.PositionGroup" as const;
const T_SKILL = "com.linkedin.voyager.dash.identity.profile.Skill" as const;
const T_CERTIFICATION = "com.linkedin.voyager.dash.identity.profile.Certification" as const;
const T_LANGUAGE = "com.linkedin.voyager.dash.identity.profile.Language" as const;
const T_EDUCATION = "com.linkedin.voyager.dash.identity.profile.Education" as const;

// Known $type values — excludes the UnknownEntity catch-all `string`.
type KnownEntityType =
	| typeof T_PROFILE
	| typeof T_POSITION
	| typeof T_POSITION_GROUP
	| typeof T_SKILL
	| typeof T_CERTIFICATION
	| typeof T_LANGUAGE
	| typeof T_EDUCATION;

// ── Scenario 1: Read access — get firstName from a ProfileEntity ─────────────
//
// Idiomatic: from<T>() → prop → get(s)
// No intermediate variables, no module-level lens definitions.

export function readAccess(profile: ProfileEntity): string {
	return pipe(Focal.from<ProfileEntity>(), Focal.prop("firstName"), Focal.get(profile));
}

// ── Scenario 2: Deep immutable update ────────────────────────────────────────
//
// Idiomatic: from<Root>() → navigate to the field → modify → run(s)
// The entire NormalizedStoreResponse is the root; Focal.prop("included")
// descends into the array, Focal.elements() iterates it, match() discriminates,
// prop() selects the field, modify() transforms — run() applies to the value.
// No manual spread operators needed.

export function deepUpdate(response: NormalizedStoreResponse): NormalizedStoreResponse {
	return pipe(
		Focal.from<NormalizedStoreResponse>(),
		Focal.prop("included"),
		Focal.elements(),
		Focal.match<IncludedEntity>()("$type")(T_PROFILE),
		Focal.prop("firstName"),
		Focal.modify(() => "Updated"),
		Focal.run(response),
	);
}

// ── Scenario 3: Discriminated union filter — collect all skills ──────────────
//
// Idiomatic: from<T[]>() → elements() → match() → collect(s)
// The array itself is the root; no fromEach needed.

export function filterByType(entities: IncludedEntity[]): SkillEntity[] {
	return pipe(
		Focal.from<IncludedEntity[]>(),
		Focal.elements(),
		Focal.match<IncludedEntity>()("$type")(T_SKILL),
		Focal.collect(entities),
	) as SkillEntity[];
}

// ── Scenario 4: Full domain mapping ─────────────────────────────────────────
//
// Each entity collection is an independent pipe from the response root.
// Field reads are also self-contained pipes from the entity root.
// No module-level optic variables shared across functions; every path is
// expressed inline — readable, refactorable, and composable.

export function domainMapping(response: NormalizedStoreResponse): CandidateProfile {
	// Helper: collect all entities of a given $type from the response.
	// This is the canonical one-liner for "give me all X from the store".
	// TV is constrained to the known literal $type values (excluding the UnknownEntity catch-all).
	function collectVariant<T>(variant: KnownEntityType): T[] {
		return pipe(
			Focal.from<NormalizedStoreResponse>(),
			Focal.prop("included"),
			Focal.elements(),
			Focal.match<IncludedEntity>()("$type")(variant),
			Focal.collect(response),
		) as T[];
	}

	const profiles = collectVariant<ProfileEntity>(T_PROFILE);
	const positionGroups = collectVariant<PositionGroupEntity>(T_POSITION_GROUP);
	const certifications = collectVariant<CertificationEntity>(T_CERTIFICATION);
	const languages = collectVariant<LanguageEntity>(T_LANGUAGE);
	const educations = collectVariant<EducationEntity>(T_EDUCATION);

	const mainProfile = profiles[0] as ProfileEntity | undefined;

	const name = mainProfile
		? pipe(Focal.from<ProfileEntity>(), Focal.prop("firstName"), Focal.get(mainProfile)) +
			" " +
			pipe(Focal.from<ProfileEntity>(), Focal.prop("lastName"), Focal.get(mainProfile))
		: "";

	const summary =
		pipe(
			Focal.from<NormalizedStoreResponse>(),
			Focal.prop("included"),
			Focal.elements(),
			Focal.match<IncludedEntity>()("$type")(T_PROFILE),
			Focal.prop("multiLocaleSummary"),
			Focal.collect(response),
		)[0]?.["en_US"] ?? null;

	const currentEmployer = positionGroups[0]?.companyName ?? null;

	const jobTitles = pipe(
		Focal.from<NormalizedStoreResponse>(),
		Focal.prop("included"),
		Focal.elements(),
		Focal.match<IncludedEntity>()("$type")(T_POSITION),
		Focal.prop("title"),
		Focal.collect(response),
	) as string[];

	const employers = (
		pipe(
			Focal.from<NormalizedStoreResponse>(),
			Focal.prop("included"),
			Focal.elements(),
			Focal.match<IncludedEntity>()("$type")(T_POSITION_GROUP),
			Focal.prop("companyName"),
			Focal.collect(response),
		) as Array<string | undefined>
	).filter((n): n is string => n !== undefined);

	const skills = pipe(
		Focal.from<NormalizedStoreResponse>(),
		Focal.prop("included"),
		Focal.elements(),
		Focal.match<IncludedEntity>()("$type")(T_SKILL),
		Focal.prop("name"),
		Focal.collect(response),
	) as string[];

	return {
		name,
		summary,
		currentEmployer,
		jobTitles,
		employers,
		skills,
		certifications: certifications.map((c) => ({ name: c.name, issuer: c.authority })),
		languages: languages.map((l) => ({ name: l.name, proficiency: l.proficiency })),
		education: educations.map((ed) => ({ school: ed.schoolName, field: ed.fieldOfStudy })),
	};
}
