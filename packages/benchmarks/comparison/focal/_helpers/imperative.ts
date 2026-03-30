// Pure imperative implementations — equivalent to focal-impl.ts but using
// spread operators, filter/map/find, and manual type guards.
// These implementations perform the same work; they exist to give an honest
// performance and ergonomics comparison.

import type {
	IncludedEntity,
	NormalizedStoreResponse,
	ProfileEntity,
	PositionEntity,
	PositionGroupEntity,
	SkillEntity,
	CertificationEntity,
	LanguageEntity,
	EducationEntity,
	CandidateProfile,
} from "./types.ts";

// ── Type guards (required boilerplate in the imperative approach) ──────────

function isProfile(e: IncludedEntity): e is ProfileEntity {
	return e.$type === "com.linkedin.voyager.dash.identity.profile.Profile";
}

function isPosition(e: IncludedEntity): e is PositionEntity {
	return e.$type === "com.linkedin.voyager.dash.identity.profile.Position";
}

function isPositionGroup(e: IncludedEntity): e is PositionGroupEntity {
	return e.$type === "com.linkedin.voyager.dash.identity.profile.PositionGroup";
}

function isSkill(e: IncludedEntity): e is SkillEntity {
	return e.$type === "com.linkedin.voyager.dash.identity.profile.Skill";
}

function isCertification(e: IncludedEntity): e is CertificationEntity {
	return e.$type === "com.linkedin.voyager.dash.identity.profile.Certification";
}

function isLanguage(e: IncludedEntity): e is LanguageEntity {
	return e.$type === "com.linkedin.voyager.dash.identity.profile.Language";
}

function isEducation(e: IncludedEntity): e is EducationEntity {
	return e.$type === "com.linkedin.voyager.dash.identity.profile.Education";
}

// ── Scenario 1: Read access — get firstName from a ProfileEntity ───────────

export function readAccess(profile: ProfileEntity): string {
	return profile.firstName;
}

// ── Scenario 2: Deep immutable update — set firstName 3 levels deep ────────
//
// Produces a new NormalizedStoreResponse where every ProfileEntity's firstName
// is replaced. Uses spread-operator chains to stay immutable.

export function deepUpdate(response: NormalizedStoreResponse): NormalizedStoreResponse {
	return {
		...response,
		included: response.included.map((entity) => {
			if (!isProfile(entity)) return entity;
			return { ...entity, firstName: "Updated" };
		}),
	};
}

// ── Scenario 3: Discriminated union filter — collect all skills ─────────────
//
// Imperative: filter + type guard. Straightforward for this single type,
// but each additional entity type requires a new guard and a new filter pass.

export function filterByType(entities: IncludedEntity[]): SkillEntity[] {
	return entities.filter(isSkill);
}

// ── Scenario 4: Full domain mapping — NormalizedStoreResponse → CandidateProfile
//
// The same transformation as focal-impl.ts/domainMapping, written imperatively.

export function domainMapping(response: NormalizedStoreResponse): CandidateProfile {
	const { included } = response;

	const profiles = included.filter(isProfile);
	const positionGroups = included.filter(isPositionGroup);
	const certifications = included.filter(isCertification);
	const languages = included.filter(isLanguage);
	const educations = included.filter(isEducation);

	const mainProfile = profiles[0];

	const name = mainProfile ? `${mainProfile.firstName} ${mainProfile.lastName}` : "";

	const summary = mainProfile?.multiLocaleSummary?.["en_US"] ?? null;

	const currentEmployer = positionGroups[0]?.companyName ?? null;

	const jobTitles = included.filter(isPosition).map((p) => p.title);

	const employers = positionGroups
		.map((g) => g.companyName)
		.filter((n): n is string => n !== undefined);

	const skills = included.filter(isSkill).map((s) => s.name);

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

// ── Safe first-element access via index check + undefined ─────────────────

export function safeFirstSkill(skills: SkillEntity[]): SkillEntity | undefined {
	return skills[0];
}
