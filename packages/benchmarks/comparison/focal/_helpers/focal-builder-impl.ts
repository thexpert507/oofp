// @oofp/focal builder API — fluent usage for the normalized-store scenarios.
//
// PATTERN: every operation uses the fluent FocalBuilder chain that starts with
// FocalBuilder.from<T>() or FocalBuilder.fromEach<T>() and terminates with a
// data-first method (.get, .collect, .modify().run, etc.).
//
// This mirrors the builder API as documented and tested in builder.test.ts.
// No pre-built module-level focals are shared between functions.
// Each function expresses its intent as one fluent chain.

import { FocalBuilder as Focal } from "@oofp/focal/builder";

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

// ── Scenario 1: Read access — get firstName from a ProfileEntity ─────────────

export function readAccess(profile: ProfileEntity): string {
	return Focal.from<ProfileEntity>().prop("firstName").get(profile);
}

// ── Scenario 2: Deep immutable update ────────────────────────────────────────

export function deepUpdate(response: NormalizedStoreResponse): NormalizedStoreResponse {
	return Focal.from<NormalizedStoreResponse>()
		.prop("included")
		.elements()
		.match("$type", T_PROFILE)
		.prop("firstName")
		.modify(() => "Updated")
		.run(response);
}

// ── Scenario 3: Discriminated union filter — collect all skills ──────────────

export function filterByType(entities: IncludedEntity[]): SkillEntity[] {
	return Focal.fromEach<IncludedEntity>()
		.match("$type", T_SKILL)
		.collect(entities) as SkillEntity[];
}

// ── Scenario 4: Full domain mapping ─────────────────────────────────────────

export function domainMapping(response: NormalizedStoreResponse): CandidateProfile {
	const profiles = Focal.from<NormalizedStoreResponse>()
		.prop("included")
		.elements()
		.match("$type", T_PROFILE)
		.collect(response) as ProfileEntity[];

	const positionGroups = Focal.from<NormalizedStoreResponse>()
		.prop("included")
		.elements()
		.match("$type", T_POSITION_GROUP)
		.collect(response) as PositionGroupEntity[];

	const certifications = Focal.from<NormalizedStoreResponse>()
		.prop("included")
		.elements()
		.match("$type", T_CERTIFICATION)
		.collect(response) as CertificationEntity[];

	const languages = Focal.from<NormalizedStoreResponse>()
		.prop("included")
		.elements()
		.match("$type", T_LANGUAGE)
		.collect(response) as LanguageEntity[];

	const educations = Focal.from<NormalizedStoreResponse>()
		.prop("included")
		.elements()
		.match("$type", T_EDUCATION)
		.collect(response) as EducationEntity[];

	const mainProfile = profiles[0] as ProfileEntity | undefined;

	const name = mainProfile
		? Focal.from<ProfileEntity>().prop("firstName").get(mainProfile) +
			" " +
			Focal.from<ProfileEntity>().prop("lastName").get(mainProfile)
		: "";

	const summary =
		(Focal.from<NormalizedStoreResponse>()
			.prop("included")
			.elements()
			.match("$type", T_PROFILE)
			.prop("multiLocaleSummary")
			.collect(response)[0] as Record<string, string> | null | undefined)?.["en_US"] ?? null;

	const currentEmployer = positionGroups[0]?.companyName ?? null;

	const jobTitles = Focal.from<NormalizedStoreResponse>()
		.prop("included")
		.elements()
		.match("$type", T_POSITION)
		.prop("title")
		.collect(response) as string[];

	const employers = (
		Focal.from<NormalizedStoreResponse>()
			.prop("included")
			.elements()
			.match("$type", T_POSITION_GROUP)
			.prop("companyName")
			.collect(response) as Array<string | undefined>
	).filter((n): n is string => n !== undefined);

	const skills = Focal.from<NormalizedStoreResponse>()
		.prop("included")
		.elements()
		.match("$type", T_SKILL)
		.prop("name")
		.collect(response) as string[];

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
