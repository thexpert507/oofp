import { pipe } from "@oofp/core/pipe";
import * as M from "@oofp/core/maybe";
import * as Focal from "../../lib/focal/index.ts";

import type {
	CertificationEntity,
	EducationEntity,
	IncludedEntity,
	LanguageEntity,
	NormalizedStoreResponse,
	PositionEntity,
	PositionGroupEntity,
	ProfileEntity,
	SkillEntity,
} from "./types.ts";

// ============================================================================
// Partial matcher — fixed on IncludedEntity's discriminant key "$type".
// Create it once; use it to build every entity focal without repeating
// the type param or the tag key.
// ============================================================================

const byType = Focal.match<IncludedEntity>()("$type");

// ============================================================================
// Focals for a single IncludedEntity — Focal<Prism, IncludedEntity, NarrowedType>
// Used for preview on a single entity or as building blocks via Focal.compose.
// ============================================================================

export const profileFocal = pipe(
	Focal.from<IncludedEntity>(),
	byType("com.linkedin.voyager.dash.identity.profile.Profile"),
);

export const positionFocal = pipe(
	Focal.from<IncludedEntity>(),
	byType("com.linkedin.voyager.dash.identity.profile.Position"),
);

export const positionGroupFocal = pipe(
	Focal.from<IncludedEntity>(),
	byType("com.linkedin.voyager.dash.identity.profile.PositionGroup"),
);

export const skillFocal = pipe(
	Focal.from<IncludedEntity>(),
	byType("com.linkedin.voyager.dash.identity.profile.Skill"),
);

export const certificationFocal = pipe(
	Focal.from<IncludedEntity>(),
	byType("com.linkedin.voyager.dash.identity.profile.Certification"),
);

export const languageFocal = pipe(
	Focal.from<IncludedEntity>(),
	byType("com.linkedin.voyager.dash.identity.profile.Language"),
);

export const educationFocal = pipe(
	Focal.from<IncludedEntity>(),
	byType("com.linkedin.voyager.dash.identity.profile.Education"),
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
// Mapping function
// ============================================================================

export function toCandidateProfile(response: NormalizedStoreResponse): CandidateProfile {
	const { included } = response;

	// Helper: traverse included[], keep only entities of the given focal's type
	const allOf = <T extends IncludedEntity>(focal: Focal.Focal<"Prism", IncludedEntity, T>): T[] =>
		pipe(Focal.fromEach<IncludedEntity>(), Focal.compose(focal), Focal.collect(included));

	const profiles = allOf(profileFocal);
	const positionGroups = allOf(positionGroupFocal);
	const positions = allOf(positionFocal);
	const rawSkills = allOf(skillFocal);
	const certifications = allOf(certificationFocal);
	const languages = allOf(languageFocal);
	const educations = allOf(educationFocal);

	const mainProfile = profiles[0] ?? null;

	// name
	const name = mainProfile
		? `${pipe(Focal.from<ProfileEntity>(), Focal.prop("firstName"), Focal.get(mainProfile))} ${pipe(Focal.from<ProfileEntity>(), Focal.prop("lastName"), Focal.get(mainProfile))}`
		: "";

	// summary — en_US locale
	const summaryMaybe = mainProfile
		? pipe(
				Focal.from<ProfileEntity>(),
				Focal.optional("multiLocaleSummary"),
				Focal.preview(mainProfile),
			)
		: M.nothing<Record<string, string>>();
	const summary = pipe(
		summaryMaybe,
		M.map((rec: Record<string, string>) => rec["en_US"] ?? null),
		M.getOrElse(null as string | null),
	);

	// currentEmployer — companyName of the first PositionGroup
	const currentEmployerMaybe =
		positionGroups.length > 0
			? pipe(
					Focal.from<PositionGroupEntity>(),
					Focal.optional("companyName"),
					Focal.preview(positionGroups[0]),
				)
			: M.nothing<string>();
	const currentEmployer = pipe(
		currentEmployerMaybe,
		M.getOrElse(null as string | null),
	);

	// jobTitles — title from every Position entity
	const jobTitles = pipe(
		Focal.fromEach<PositionEntity>(),
		Focal.prop("title"),
		Focal.collect(positions),
	);

	// employers — companyName from every PositionGroup entity
	const employers = pipe(
		Focal.fromEach<PositionGroupEntity>(),
		Focal.optional("companyName"),
		Focal.collect(positionGroups),
	);

	// skills — name from every Skill entity
	const skills = pipe(Focal.fromEach<SkillEntity>(), Focal.prop("name"), Focal.collect(rawSkills));

	// certifications
	const certificationsMapped = certifications.map((c) => ({
		name: pipe(Focal.from<CertificationEntity>(), Focal.prop("name"), Focal.get(c)),
		issuer: pipe(Focal.from<CertificationEntity>(), Focal.prop("authority"), Focal.get(c)),
	}));

	// languages
	const languagesMapped = languages.map((l) => ({
		name: pipe(Focal.from<LanguageEntity>(), Focal.prop("name"), Focal.get(l)),
		proficiency: pipe(Focal.from<LanguageEntity>(), Focal.prop("proficiency"), Focal.get(l)),
	}));

	// education
	const educationMapped = educations.map((ed) => ({
		school: pipe(Focal.from<EducationEntity>(), Focal.prop("schoolName"), Focal.get(ed)),
		field: pipe(
			pipe(Focal.from<EducationEntity>(), Focal.optional("fieldOfStudy"), Focal.preview(ed)),
			M.getOrElse(null as string | null),
		),
	}));

	return {
		name,
		summary,
		currentEmployer: currentEmployer ?? null,
		jobTitles,
		employers,
		skills,
		certifications: certificationsMapped,
		languages: languagesMapped,
		education: educationMapped,
	};
}
