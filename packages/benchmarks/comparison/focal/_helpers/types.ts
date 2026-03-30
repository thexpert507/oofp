// ---------------------------------------------------------------------------
// Shared date types
// ---------------------------------------------------------------------------

export type DateOnly = {
	year?: number;
	month?: number;
	$type: "com.linkedin.common.Date";
};

export type DateRange = {
	start: DateOnly;
	end?: DateOnly;
	$type: "com.linkedin.common.DateRange";
};

// ---------------------------------------------------------------------------
// Profile picture types
// ---------------------------------------------------------------------------

export type VectorArtifact = {
	width: number;
	height: number;
	fileIdentifyingUrlPathSegment: string;
	expiresAt: number;
};

export type VectorImage = {
	artifacts: VectorArtifact[];
};

export type ProfilePicture = {
	displayImageReference: {
		vectorImage: VectorImage;
	};
};

// ---------------------------------------------------------------------------
// Entity variants — discriminated by $type
// ---------------------------------------------------------------------------

export type ProfileEntity = {
	$type: "com.linkedin.voyager.dash.identity.profile.Profile";
	entityUrn: string;
	firstName: string;
	lastName: string;
	multiLocaleSummary: Record<string, string> | null;
	profilePicture: ProfilePicture | null;
};

export type PositionEntity = {
	$type: "com.linkedin.voyager.dash.identity.profile.Position";
	entityUrn: string;
	title: string;
	companyName?: string;
	description: string | null;
	dateRange: DateRange;
};

export type PositionGroupEntity = {
	$type: "com.linkedin.voyager.dash.identity.profile.PositionGroup";
	entityUrn: string;
	companyName?: string;
	dateRange: DateRange;
};

export type SkillEntity = {
	$type: "com.linkedin.voyager.dash.identity.profile.Skill";
	entityUrn: string;
	name: string;
};

export type CertificationEntity = {
	$type: "com.linkedin.voyager.dash.identity.profile.Certification";
	entityUrn: string;
	name: string;
	authority: string;
	displaySource?: string;
	url?: string;
};

export type LanguageEntity = {
	$type: "com.linkedin.voyager.dash.identity.profile.Language";
	entityUrn: string;
	name: string;
	proficiency:
		| "NATIVE_OR_BILINGUAL"
		| "FULL_PROFESSIONAL"
		| "PROFESSIONAL_WORKING"
		| "LIMITED_WORKING"
		| "ELEMENTARY";
};

export type EducationEntity = {
	$type: "com.linkedin.voyager.dash.identity.profile.Education";
	entityUrn: string;
	schoolName: string;
	fieldOfStudy: string | null;
	degreeName: string | null;
	dateRange: DateRange;
};

export type UnknownEntity = {
	$type: string;
	entityUrn?: string;
	[key: string]: unknown;
};

export type IncludedEntity =
	| ProfileEntity
	| PositionEntity
	| PositionGroupEntity
	| SkillEntity
	| CertificationEntity
	| LanguageEntity
	| EducationEntity
	| UnknownEntity;

export type NormalizedStoreResponse = {
	data: {
		entityUrn: string;
		"*elements": string[];
	};
	included: IncludedEntity[];
};

// ---------------------------------------------------------------------------
// Domain output type
// ---------------------------------------------------------------------------

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
