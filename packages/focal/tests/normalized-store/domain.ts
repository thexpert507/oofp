import { pipe } from "@oofp/core/pipe";
import * as Lens from "../../lib/lens.ts";
import * as Prism from "../../lib/prism.ts";
import * as Traversal from "../../lib/traversal.ts";

import type {
	IncludedEntity,
	NormalizedStoreResponse,
	PositionEntity,
	PositionGroupEntity,
	ProfileEntity,
	SkillEntity,
} from "./types.ts";

// ============================================================================
// Prisms for discriminating the polymorphic union by $type
// ============================================================================

const IncludedEntityMatcher = Prism.match<IncludedEntity>();

export const profilePrism = IncludedEntityMatcher(
	"$type",
	"com.linkedin.voyager.dash.identity.profile.Profile",
);

export const positionPrism = IncludedEntityMatcher(
	"$type",
	"com.linkedin.voyager.dash.identity.profile.Position",
);

export const positionGroupPrism = IncludedEntityMatcher(
	"$type",
	"com.linkedin.voyager.dash.identity.profile.PositionGroup",
);

export const skillPrism = IncludedEntityMatcher(
	"$type",
	"com.linkedin.voyager.dash.identity.profile.Skill",
);

export const certificationPrism = IncludedEntityMatcher(
	"$type",
	"com.linkedin.voyager.dash.identity.profile.Certification",
);

export const languagePrism = IncludedEntityMatcher(
	"$type",
	"com.linkedin.voyager.dash.identity.profile.Language",
);

export const educationPrism = IncludedEntityMatcher(
	"$type",
	"com.linkedin.voyager.dash.identity.profile.Education",
);

// ============================================================================
// Domain model
// ============================================================================

export type CandidateProfile = {
	name: string;
	summary: string | null;
	currentEmployer: string | null;
	jobTitles: string[];
	employers: string[];
	skills: string[];
	certifications: Array<{ name: string; issuer: string }>;
	languages: Array<{ name: string; proficiency: string }>;
	education: Array<{ school: string; field: string | null }>;
};

// ============================================================================
// Helper and mapping function
// ============================================================================

export function collectEntities<T extends IncludedEntity>(
	included: IncludedEntity[],
	prism: Prism.Prism<IncludedEntity, T>,
): T[] {
	return pipe(
		pipe(Traversal.each<IncludedEntity>(), Traversal.compose(prism)),
		Traversal.collect(included),
	);
}

export function toCandidateProfile(response: NormalizedStoreResponse): CandidateProfile {
	const { included } = response;

	// Extract typed entities
	const profiles = collectEntities(included, profilePrism);
	const positionGroups = collectEntities(included, positionGroupPrism);
	const certifications = collectEntities(included, certificationPrism);
	const languages = collectEntities(included, languagePrism);
	const educations = collectEntities(included, educationPrism);

	const mainProfile = profiles[0];

	// name
	const firstNameLens = pipe(Lens.identity<ProfileEntity>(), Lens.prop("firstName"));
	const lastNameLens = pipe(Lens.identity<ProfileEntity>(), Lens.prop("lastName"));
	const name = mainProfile
		? `${pipe(firstNameLens, Lens.view(mainProfile))} ${pipe(lastNameLens, Lens.view(mainProfile))}`
		: "";

	// summary
	const summaryLens = pipe(Lens.identity<ProfileEntity>(), Lens.prop("multiLocaleSummary"));
	const summaryRecord = mainProfile ? pipe(summaryLens, Lens.view(mainProfile)) : null;
	const summary = summaryRecord?.["en_US"] ?? null;

	// currentEmployer — companyName of the first PositionGroup
	const firstGroupCompanyLens = pipe(
		Lens.identity<PositionGroupEntity>(),
		Lens.prop("companyName"),
	);
	const currentEmployer =
		positionGroups.length > 0
			? (pipe(firstGroupCompanyLens, Lens.view(positionGroups[0])) ?? null)
			: null;

	// jobTitles — all title values from Position entities
	const titleLens = pipe(Lens.identity<PositionEntity>(), Lens.prop("title"));
	const jobTitles = pipe(
		pipe(Traversal.each<IncludedEntity>(), Traversal.compose(positionPrism)),
		Traversal.compose(titleLens),
		Traversal.collect(included),
	);

	// employers — all companyName values from PositionGroup entities
	const groupCompanyLens = pipe(Lens.identity<PositionGroupEntity>(), Lens.prop("companyName"));
	const employers = pipe(
		pipe(Traversal.each<IncludedEntity>(), Traversal.compose(positionGroupPrism)),
		Traversal.compose(groupCompanyLens),
		Traversal.collect(included),
	).filter((name): name is string => name !== undefined);

	// skills — all name values from Skill entities
	const skillNameLens = pipe(Lens.identity<SkillEntity>(), Lens.prop("name"));
	const skillNames = pipe(
		pipe(Traversal.each<IncludedEntity>(), Traversal.compose(skillPrism)),
		Traversal.compose(skillNameLens),
		Traversal.collect(included),
	);

	// certifications
	const certifications_mapped = certifications.map((c) => ({
		name: c.name,
		issuer: c.authority,
	}));

	// languages
	const languages_mapped = languages.map((l) => ({
		name: l.name,
		proficiency: l.proficiency,
	}));

	// education
	const education_mapped = educations.map((ed) => ({
		school: ed.schoolName,
		field: ed.fieldOfStudy,
	}));

	return {
		name,
		summary,
		currentEmployer: currentEmployer ?? null,
		jobTitles,
		employers,
		skills: skillNames,
		certifications: certifications_mapped,
		languages: languages_mapped,
		education: education_mapped,
	};
}
