// @oofp/focal implementation for the normalized-store benchmark scenarios.
// Each function represents one benchmark scenario.

import { pipe } from "@oofp/core/pipe";
import * as M from "@oofp/core/maybe";
import * as Lens from "@oofp/focal/lens";
import * as Prism from "@oofp/focal/prism";
import * as Traversal from "@oofp/focal/traversal";

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

// ── Prisms (defined once, composed at call sites) ──────────────────────────

const match = Prism.match<IncludedEntity>();

const profilePrism = match("$type", "com.linkedin.voyager.dash.identity.profile.Profile");
const positionPrism = match("$type", "com.linkedin.voyager.dash.identity.profile.Position");
const positionGroupPrism = match("$type", "com.linkedin.voyager.dash.identity.profile.PositionGroup");
const skillPrism = match("$type", "com.linkedin.voyager.dash.identity.profile.Skill");
const certificationPrism = match("$type", "com.linkedin.voyager.dash.identity.profile.Certification");
const languagePrism = match("$type", "com.linkedin.voyager.dash.identity.profile.Language");
const educationPrism = match("$type", "com.linkedin.voyager.dash.identity.profile.Education");

// ── Scenario 1: Read access — get firstName from a ProfileEntity ───────────

const firstNameLens = pipe(Lens.identity<ProfileEntity>(), Lens.prop("firstName"));
const lastNameLens = pipe(Lens.identity<ProfileEntity>(), Lens.prop("lastName"));

export function readAccess(profile: ProfileEntity): string {
	return pipe(firstNameLens, Lens.view(profile));
}

// ── Scenario 2: Deep immutable update — set firstName 3 levels deep ────────
//
// Structure: NormalizedStoreResponse → included[0] (ProfileEntity) → firstName
// Focal composes the path once; the update is expressed declaratively.

const eachEntity = Traversal.each<IncludedEntity>();
const profilesTraversal = pipe(eachEntity, Traversal.compose(profilePrism));
const firstNameTraversal = pipe(profilesTraversal, Traversal.compose(firstNameLens));

export function deepUpdate(response: NormalizedStoreResponse): NormalizedStoreResponse {
	return {
		...response,
		included: pipe(firstNameTraversal, Traversal.modify(() => "Updated"))(response.included),
	};
}

// ── Scenario 3: Discriminated union filter — collect all skills ─────────────
//
// Given a heterogeneous IncludedEntity[], collect only SkillEntity items.
// Focal: Traversal.each + Prism.match handles the discrimination and
// collection in a single composable pass — no manual type guard boilerplate.

const allSkillsTraversal = pipe(eachEntity, Traversal.compose(skillPrism));

export function filterByType(entities: IncludedEntity[]): SkillEntity[] {
	return pipe(allSkillsTraversal, Traversal.collect(entities));
}

// ── Scenario 4: Full domain mapping — NormalizedStoreResponse → CandidateProfile

function collectEntities<T extends IncludedEntity>(
	included: IncludedEntity[],
	prism: Prism.Prism<IncludedEntity, T>,
): T[] {
	return pipe(pipe(eachEntity, Traversal.compose(prism)), Traversal.collect(included));
}

export function domainMapping(response: NormalizedStoreResponse): CandidateProfile {
	const { included } = response;

	const profiles = collectEntities(included, profilePrism);
	const positionGroups = collectEntities(included, positionGroupPrism);
	const certifications = collectEntities(included, certificationPrism);
	const languages = collectEntities(included, languagePrism);
	const educations = collectEntities(included, educationPrism);

	const mainProfile = profiles[0];

	const summaryLens = pipe(Lens.identity<ProfileEntity>(), Lens.prop("multiLocaleSummary"));

	const name = mainProfile
		? `${pipe(firstNameLens, Lens.view(mainProfile))} ${pipe(lastNameLens, Lens.view(mainProfile))}`
		: "";

	const summaryRecord = mainProfile ? pipe(summaryLens, Lens.view(mainProfile)) : null;
	const summary = summaryRecord?.["en_US"] ?? null;

	const firstGroupCompanyLens = pipe(Lens.identity<PositionGroupEntity>(), Lens.prop("companyName"));
	const currentEmployer =
		positionGroups.length > 0
			? (pipe(firstGroupCompanyLens, Lens.view(positionGroups[0])) ?? null)
			: null;

	const titleLens = pipe(Lens.identity<PositionEntity>(), Lens.prop("title"));
	const jobTitles = pipe(
		pipe(eachEntity, Traversal.compose(positionPrism)),
		Traversal.compose(titleLens),
		Traversal.collect(included),
	);

	const groupCompanyLens = pipe(Lens.identity<PositionGroupEntity>(), Lens.prop("companyName"));
	const employers = pipe(
		pipe(eachEntity, Traversal.compose(positionGroupPrism)),
		Traversal.compose(groupCompanyLens),
		Traversal.collect(included),
	).filter((n): n is string => n !== undefined);

	const skillNameLens = pipe(Lens.identity<SkillEntity>(), Lens.prop("name"));
	const skills = pipe(
		pipe(eachEntity, Traversal.compose(skillPrism)),
		Traversal.compose(skillNameLens),
		Traversal.collect(included),
	);

	return {
		name,
		summary,
		currentEmployer: currentEmployer ?? null,
		jobTitles,
		employers,
		skills,
		certifications: certifications.map((c) => ({ name: c.name, issuer: c.authority })),
		languages: languages.map((l) => ({ name: l.name, proficiency: l.proficiency })),
		education: educations.map((ed) => ({ school: ed.schoolName, field: ed.fieldOfStudy })),
	};
}

// ── Safe first-element access via Prism.index ─────────────────────────────

export function safeFirstSkill(skills: SkillEntity[]): M.Maybe<SkillEntity> {
	return pipe(Prism.index<SkillEntity>(0), Prism.preview(skills));
}
