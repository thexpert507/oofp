import type {
	NormalizedStoreResponse,
	UnknownEntity,
	ProfileEntity,
	PositionEntity,
	PositionGroupEntity,
	SkillEntity,
	CertificationEntity,
	LanguageEntity,
	EducationEntity,
} from "./types.ts";

// ---------------------------------------------------------------------------
// Fixture — inlined subset of a real normalized store API response
// (copied from packages/focal/tests/normalized-store/fixtures.ts to keep
//  the benchmarks package self-contained)
// ---------------------------------------------------------------------------

export const candidateProfileResponse: NormalizedStoreResponse = {
	data: {
		entityUrn: "urn:li:collectionResponse:zgPLu/BWdeAjK0VG+Mtx8DLJ5x/Kb91+rPeqmbhCKM8=",
		"*elements": ["urn:li:fsd_profile:ACoAAAAjlMUBvuXXoLA2TxxR7yKbVD7wINxNGtk"],
	},
	included: [
		// --- CollectionResponse entities (noise that traversals should skip) ---
		{
			$type: "com.linkedin.restli.common.CollectionResponse",
			entityUrn: "urn:li:collectionResponse:QHLyjMPrpm05sfXTXKQd8kgV4VG5GVzEaH8KbFXyeY0=",
		} as UnknownEntity,
		{
			$type: "com.linkedin.restli.common.CollectionResponse",
			entityUrn: "urn:li:collectionResponse:WK4Fr9AbyALZfb/JxhSay8AyuKOwcokT52iETpoWFMs=",
		} as UnknownEntity,

		// --- Profile ---
		{
			$type: "com.linkedin.voyager.dash.identity.profile.Profile",
			entityUrn: "urn:li:fsd_profile:ACoAAAAjlMUBvuXXoLA2TxxR7yKbVD7wINxNGtk",
			firstName: "Jose",
			lastName: "Cruset",
			multiLocaleSummary: {
				en_US:
					"Leveraging value through the use of Artificial Intelligence\nTokenising assets and raising funds through Blockchain.\nUsing Artificial Intelligence to help recruiters find great talent.\n\nExpert in Information Technology, Business Consultant, Project Manager, Scrum Master / Product Owner, \nExperienced Business Development Manager.",
			},
			profilePicture: {
				displayImageReference: {
					vectorImage: {
						artifacts: [
							{
								width: 100,
								height: 100,
								fileIdentifyingUrlPathSegment:
									"100_100/profile-displayphoto-shrink_100_100/0/1715868936528?e=1741824000",
								expiresAt: 1741824000000,
							},
							{
								width: 200,
								height: 200,
								fileIdentifyingUrlPathSegment:
									"200_200/profile-displayphoto-shrink_200_200/0/1715868936528?e=1741824000",
								expiresAt: 1741824000000,
							},
							{
								width: 400,
								height: 400,
								fileIdentifyingUrlPathSegment:
									"400_400/profile-displayphoto-shrink_400_400/0/1715868936528?e=1741824000",
								expiresAt: 1741824000000,
							},
						],
					},
				},
			},
		} satisfies ProfileEntity,

		// --- Positions ---
		{
			$type: "com.linkedin.voyager.dash.identity.profile.Position",
			entityUrn: "urn:li:fsd_profilePosition:(ACoAAAAjlMUBvuXXoLA2TxxR7yKbVD7wINxNGtk,1223749612)",
			title: "Founder & Chief Technology Officer",
			companyName: "Alfa AI & Blockchain",
			description:
				"Helping companies with Artificial Intelligence solutions keeping their data private.",
			dateRange: {
				start: { month: 6, year: 2018, $type: "com.linkedin.common.Date" },
				$type: "com.linkedin.common.DateRange",
			},
		} satisfies PositionEntity,
		{
			$type: "com.linkedin.voyager.dash.identity.profile.Position",
			entityUrn: "urn:li:fsd_profilePosition:(ACoAAAAjlMUBvuXXoLA2TxxR7yKbVD7wINxNGtk,1827499151)",
			title: "Chief Technology Officer",
			companyName: "Waicont Systems",
			description: null,
			dateRange: {
				start: { month: 2, year: 2021, $type: "com.linkedin.common.Date" },
				$type: "com.linkedin.common.DateRange",
			},
		} satisfies PositionEntity,
		{
			$type: "com.linkedin.voyager.dash.identity.profile.Position",
			entityUrn: "urn:li:fsd_profilePosition:(ACoAAAAjlMUBvuXXoLA2TxxR7yKbVD7wINxNGtk,625638673)",
			title: "Tech Lead / Senior Software Engineer",
			companyName: undefined,
			description:
				"Lead developer of a KYC application for a large German Bank.",
			dateRange: {
				start: { month: 3, year: 2019, $type: "com.linkedin.common.Date" },
				end: { month: 10, year: 2020, $type: "com.linkedin.common.Date" },
				$type: "com.linkedin.common.DateRange",
			},
		} satisfies PositionEntity,

		// --- PositionGroups ---
		{
			$type: "com.linkedin.voyager.dash.identity.profile.PositionGroup",
			entityUrn:
				"urn:li:fsd_profilePositionGroup:(ACoAAAAjlMUBvuXXoLA2TxxR7yKbVD7wINxNGtk,d7f64fa54fd608dcec1c64be434f0f6528db8387)",
			companyName: "Alfa AI & Blockchain",
			dateRange: {
				start: { month: 6, year: 2018, $type: "com.linkedin.common.Date" },
				$type: "com.linkedin.common.DateRange",
			},
		} satisfies PositionGroupEntity,
		{
			$type: "com.linkedin.voyager.dash.identity.profile.PositionGroup",
			entityUrn:
				"urn:li:fsd_profilePositionGroup:(ACoAAAAjlMUBvuXXoLA2TxxR7yKbVD7wINxNGtk,696bb99c6c23ec8060d1daed7b802e599bce90c1)",
			companyName: "Waicont Systems",
			dateRange: {
				start: { month: 2, year: 2021, $type: "com.linkedin.common.Date" },
				$type: "com.linkedin.common.DateRange",
			},
		} satisfies PositionGroupEntity,
		{
			$type: "com.linkedin.voyager.dash.identity.profile.PositionGroup",
			entityUrn:
				"urn:li:fsd_profilePositionGroup:(ACoAAAAjlMUBvuXXoLA2TxxR7yKbVD7wINxNGtk,28a700f7625f2625d63c7e536e035984883282e2)",
			companyName: "Telio Group",
			dateRange: {
				start: { month: 1, year: 2017, $type: "com.linkedin.common.Date" },
				end: { month: 2, year: 2019, $type: "com.linkedin.common.Date" },
				$type: "com.linkedin.common.DateRange",
			},
		} satisfies PositionGroupEntity,

		// --- Skills ---
		{
			$type: "com.linkedin.voyager.dash.identity.profile.Skill",
			entityUrn: "urn:li:fsd_skill:(ACoAAAAjlMUBvuXXoLA2TxxR7yKbVD7wINxNGtk,5)",
			name: "Scrum",
		} satisfies SkillEntity,
		{
			$type: "com.linkedin.voyager.dash.identity.profile.Skill",
			entityUrn: "urn:li:fsd_skill:(ACoAAAAjlMUBvuXXoLA2TxxR7yKbVD7wINxNGtk,934117273)",
			name: "Artificial Intelligence (AI)",
		} satisfies SkillEntity,
		{
			$type: "com.linkedin.voyager.dash.identity.profile.Skill",
			entityUrn: "urn:li:fsd_skill:(ACoAAAAjlMUBvuXXoLA2TxxR7yKbVD7wINxNGtk,934101100)",
			name: "Machine Learning",
		} satisfies SkillEntity,
		{
			$type: "com.linkedin.voyager.dash.identity.profile.Skill",
			entityUrn: "urn:li:fsd_skill:(ACoAAAAjlMUBvuXXoLA2TxxR7yKbVD7wINxNGtk,28)",
			name: "Project Management",
		} satisfies SkillEntity,
		{
			$type: "com.linkedin.voyager.dash.identity.profile.Skill",
			entityUrn: "urn:li:fsd_skill:(ACoAAAAjlMUBvuXXoLA2TxxR7yKbVD7wINxNGtk,57)",
			name: "Business Development",
		} satisfies SkillEntity,

		// --- Certifications ---
		{
			$type: "com.linkedin.voyager.dash.identity.profile.Certification",
			entityUrn:
				"urn:li:fsd_profileCertification:(ACoAAAAjlMUBvuXXoLA2TxxR7yKbVD7wINxNGtk,1542878455)",
			name: "Professional Scrum Product Owner (PSPO)",
			authority: "Scrum.org",
			displaySource: "scrum.org",
			url: "https://www.scrum.org/certificates/851397",
		} satisfies CertificationEntity,
		{
			$type: "com.linkedin.voyager.dash.identity.profile.Certification",
			entityUrn:
				"urn:li:fsd_profileCertification:(ACoAAAAjlMUBvuXXoLA2TxxR7yKbVD7wINxNGtk,1099056612)",
			name: "Professional Scrum Master (PSM)",
			authority: "Scrum.org",
		} satisfies CertificationEntity,
		{
			$type: "com.linkedin.voyager.dash.identity.profile.Certification",
			entityUrn:
				"urn:li:fsd_profileCertification:(ACoAAAAjlMUBvuXXoLA2TxxR7yKbVD7wINxNGtk,938591691)",
			name: "Python for Everybody Specialization",
			authority: "Coursera",
		} satisfies CertificationEntity,

		// --- Languages ---
		{
			$type: "com.linkedin.voyager.dash.identity.profile.Language",
			entityUrn: "urn:li:fsd_profileLanguage:(ACoAAAAjlMUBvuXXoLA2TxxR7yKbVD7wINxNGtk,22)",
			name: "Spanish",
			proficiency: "NATIVE_OR_BILINGUAL",
		} satisfies LanguageEntity,
		{
			$type: "com.linkedin.voyager.dash.identity.profile.Language",
			entityUrn: "urn:li:fsd_profileLanguage:(ACoAAAAjlMUBvuXXoLA2TxxR7yKbVD7wINxNGtk,21)",
			name: "English",
			proficiency: "FULL_PROFESSIONAL",
		} satisfies LanguageEntity,
		{
			$type: "com.linkedin.voyager.dash.identity.profile.Language",
			entityUrn: "urn:li:fsd_profileLanguage:(ACoAAAAjlMUBvuXXoLA2TxxR7yKbVD7wINxNGtk,23)",
			name: "German",
			proficiency: "NATIVE_OR_BILINGUAL",
		} satisfies LanguageEntity,

		// --- Educations ---
		{
			$type: "com.linkedin.voyager.dash.identity.profile.Education",
			entityUrn:
				"urn:li:fsd_profileEducation:(ACoAAAAjlMUBvuXXoLA2TxxR7yKbVD7wINxNGtk,213923976)",
			schoolName: "IESE Business School - University of Navarra",
			fieldOfStudy: "Business Administration",
			degreeName: "Advanced Management Program (AMP)",
			dateRange: {
				start: { year: 2014, $type: "com.linkedin.common.Date" },
				end: { year: 2014, $type: "com.linkedin.common.Date" },
				$type: "com.linkedin.common.DateRange",
			},
		} satisfies EducationEntity,
		{
			$type: "com.linkedin.voyager.dash.identity.profile.Education",
			entityUrn: "urn:li:fsd_profileEducation:(ACoAAAAjlMUBvuXXoLA2TxxR7yKbVD7wINxNGtk,794207)",
			schoolName: "Goethe University Frankfurt, Germany",
			fieldOfStudy: "Business Administration",
			degreeName: "Dipl. Kfm. / MBA",
			dateRange: {
				start: { year: 1989, $type: "com.linkedin.common.Date" },
				end: { year: 1996, $type: "com.linkedin.common.Date" },
				$type: "com.linkedin.common.DateRange",
			},
		} satisfies EducationEntity,
	],
};
