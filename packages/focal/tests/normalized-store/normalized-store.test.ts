/**
 * Normalized store — optics integration tests.
 *
 * Demonstrates Lens / Prism / Traversal applied to a real-world polymorphic
 * normalized store API response, including:
 *
 *  1. Prism.match  — filter by $type discriminant
 *  2. Lens.prop    — deep immutable access
 *  3. Traversal.each + Lens — collect across all entities of a type
 *  4. Traversal.filtered — selective traversal
 *  5. Prism.index  — safe array element access
 *  6. Domain mapping — NormalizedStoreResponse → CandidateProfile
 */

import { describe, it, expect } from "vitest";
import { pipe } from "@oofp/core/pipe";
import * as M from "@oofp/core/maybe";
import * as Lens from "../../lib/lens.ts";
import * as Prism from "../../lib/prism.ts";
import * as Traversal from "../../lib/traversal.ts";

import type {
	IncludedEntity,
	ProfileEntity,
	PositionEntity,
	PositionGroupEntity,
	SkillEntity,
	CertificationEntity,
} from "./types.ts";

import {
	profilePrism,
	positionPrism,
	positionGroupPrism,
	skillPrism,
	certificationPrism,
	toCandidateProfile,
	type CandidateProfile,
} from "./domain.ts";

import { candidateProfileResponse } from "./fixtures.ts";

// ============================================================================
// 1. Prism.match — filter by $type
// ============================================================================

describe("Prism.match — filter by $type", () => {
	const { included } = candidateProfileResponse;

	const firstSkill = included.find(
		(e) => e.$type === "com.linkedin.voyager.dash.identity.profile.Skill",
	) as SkillEntity;

	const firstCollectionResponse = included.find(
		(e) => e.$type === "com.linkedin.restli.common.CollectionResponse",
	) as IncludedEntity;

	it("preview returns Just for a matching Skill entity", () => {
		expect(skillPrism.preview(firstSkill)).toEqual(M.just(firstSkill));
	});

	it("preview returns Nothing for a non-matching entity", () => {
		expect(skillPrism.preview(firstCollectionResponse)).toEqual(M.nothing());
	});

	it("preview returns Just for a matching Certification entity", () => {
		const cert = included.find(
			(e) => e.$type === "com.linkedin.voyager.dash.identity.profile.Certification",
		) as CertificationEntity;
		expect(certificationPrism.preview(cert)).toEqual(M.just(cert));
	});

	it("positionPrism.preview returns Nothing for a CollectionResponse", () => {
		expect(positionPrism.preview(firstCollectionResponse)).toEqual(M.nothing());
	});

	it("collect all skills via Traversal.each + Traversal.compose(skillPrism)", () => {
		const allSkillsTraversal = pipe(
			Traversal.each<IncludedEntity>(),
			Traversal.compose(skillPrism),
		);
		const skills = pipe(allSkillsTraversal, Traversal.collect(included));
		expect(skills).toHaveLength(5);
		expect(skills.map((s) => s.name)).toContain("Scrum");
		expect(skills.map((s) => s.name)).toContain("Artificial Intelligence (AI)");
	});

	it("collect does not include CollectionResponse entities", () => {
		const allSkillsTraversal = pipe(
			Traversal.each<IncludedEntity>(),
			Traversal.compose(skillPrism),
		);
		const skills = pipe(allSkillsTraversal, Traversal.collect(included));
		// All returned items must be skills
		skills.forEach((s) => {
			expect(s.$type).toBe("com.linkedin.voyager.dash.identity.profile.Skill");
		});
	});
});

// ============================================================================
// 2. Lens.prop — deep immutable access
// ============================================================================

describe("Lens.prop — deep immutable access", () => {
	const profile = candidateProfileResponse.included.find(
		(e) => e.$type === "com.linkedin.voyager.dash.identity.profile.Profile",
	) as ProfileEntity;

	const firstNameLens = pipe(
		Lens.identity<ProfileEntity>(),
		Lens.prop("firstName"),
	);

	const lastNameLens = pipe(
		Lens.identity<ProfileEntity>(),
		Lens.prop("lastName"),
	);

	it("reads firstName", () => {
		expect(pipe(firstNameLens, Lens.view(profile))).toBe("Jose");
	});

	it("reads lastName", () => {
		expect(pipe(lastNameLens, Lens.view(profile))).toBe("Cruset");
	});

	it("set firstName produces a new object", () => {
		const updated = pipe(firstNameLens, Lens.set("Joseph"))(profile);
		expect(updated.firstName).toBe("Joseph");
		expect(updated.lastName).toBe("Cruset");
	});

	it("set does not mutate the original", () => {
		pipe(firstNameLens, Lens.set("ShouldNotPersist"))(profile);
		expect(profile.firstName).toBe("Jose");
	});

	it("reads nested profilePicture artifact width via Prism._just + Prism.index", () => {
		const pictureLens = pipe(
			Lens.identity<ProfileEntity>(),
			Lens.prop("profilePicture"),
		);

		const pictureValue = pipe(pictureLens, Lens.view(profile));

		if (pictureValue === null) throw new Error("Expected profilePicture to be non-null");

		const artifacts = pictureValue.displayImageReference.vectorImage.artifacts;
		// Safely access the first artifact using Prism.index
		const firstArtifact = pipe(
			Prism.index<(typeof artifacts)[number]>(0),
			Prism.preview(artifacts),
		);
		expect(M.isJust(firstArtifact)).toBe(true);
		if (M.isJust(firstArtifact)) {
			expect(firstArtifact.value.width).toBe(100);
		}
	});

	it("satisfies GetPut law for firstName", () => {
		expect(firstNameLens.set(firstNameLens.get(profile))(profile)).toEqual(profile);
	});

	it("satisfies PutGet law for lastName", () => {
		expect(lastNameLens.get(lastNameLens.set("Updated")(profile))).toBe("Updated");
	});
});

// ============================================================================
// 3. Traversal.each + Lens — collect across all entities
// ============================================================================

describe("Traversal.each + Lens — collect across all entities of a type", () => {
	const { included } = candidateProfileResponse;

	it("collects all position titles", () => {
		const titleLens = pipe(Lens.identity<PositionEntity>(), Lens.prop("title"));
		const allTitles = pipe(
			pipe(Traversal.each<IncludedEntity>(), Traversal.compose(positionPrism)),
			Traversal.compose(titleLens),
		);
		const titles = pipe(allTitles, Traversal.collect(included));
		expect(titles).toEqual([
			"Founder & Chief Technology Officer",
			"Chief Technology Officer",
			"Tech Lead / Senior Software Engineer",
		]);
	});

	it("collects all positionGroup company names", () => {
		const companyNameLens = pipe(
			Lens.identity<PositionGroupEntity>(),
			Lens.prop("companyName"),
		);
		const allCompanies = pipe(
			pipe(Traversal.each<IncludedEntity>(), Traversal.compose(positionGroupPrism)),
			Traversal.compose(companyNameLens),
		);
		const companies = pipe(allCompanies, Traversal.collect(included));
		// Three PositionGroups have companyName defined
		expect(companies).toContain("Alfa AI & Blockchain");
		expect(companies).toContain("Waicont Systems");
		expect(companies).toContain("Telio Group");
	});

	it("modifies all skill names to uppercase", () => {
		const nameLens = pipe(Lens.identity<SkillEntity>(), Lens.prop("name"));
		const allSkillNames = pipe(
			pipe(Traversal.each<IncludedEntity>(), Traversal.compose(skillPrism)),
			Traversal.compose(nameLens),
		);
		const modified = pipe(allSkillNames, Traversal.modify((n: string) => n.toUpperCase()))(included);
		const skills = pipe(
			pipe(Traversal.each<IncludedEntity>(), Traversal.compose(skillPrism)),
			Traversal.collect(modified),
		);
		skills.forEach((s) => {
			expect(s.name).toBe(s.name.toUpperCase());
		});
	});

	it("modification does not affect non-skill entities", () => {
		const nameLens = pipe(Lens.identity<SkillEntity>(), Lens.prop("name"));
		const allSkillNames = pipe(
			pipe(Traversal.each<IncludedEntity>(), Traversal.compose(skillPrism)),
			Traversal.compose(nameLens),
		);
		const modified = pipe(allSkillNames, Traversal.modify((n: string) => n.toUpperCase()))(included);
		const profileAfter = modified.find(
			(e) => e.$type === "com.linkedin.voyager.dash.identity.profile.Profile",
		) as ProfileEntity;
		// firstName should be unchanged
		expect(profileAfter.firstName).toBe("Jose");
	});
});

// ============================================================================
// 4. Traversal.filtered — selective traversal
// ============================================================================

describe("Traversal.filtered — selective traversal", () => {
	const { included } = candidateProfileResponse;

	const positions = included.filter(
		(e): e is PositionEntity =>
			e.$type === "com.linkedin.voyager.dash.identity.profile.Position",
	);

	it("toArray only returns positions with a non-null description", () => {
		const withDescription = Traversal.filtered<PositionEntity>(
			(p) => p.description !== null,
		);
		const result = pipe(withDescription, Traversal.collect(positions));
		expect(result.length).toBeGreaterThan(0);
		result.forEach((p) => expect(p.description).not.toBeNull());
	});

	it("toArray does not return positions with null description", () => {
		const withDescription = Traversal.filtered<PositionEntity>(
			(p) => p.description !== null,
		);
		const result = pipe(withDescription, Traversal.collect(positions));
		const nullDescPositions = positions.filter((p) => p.description === null);
		nullDescPositions.forEach((np) => {
			expect(result).not.toContainEqual(np);
		});
	});

	it("set on filtered traversal only affects matching positions", () => {
		const withDescription = Traversal.filtered<PositionEntity>(
			(p) => p.description !== null,
		);

		const sentinel = "CLEARED";
		const modified = pipe(withDescription, Traversal.set(
			{ ...positions[0], description: sentinel } as PositionEntity,
		))(positions);

		// Positions that had a description are now replaced with the sentinel object
		// Positions that had null description are unchanged
		const nullDescPositions = positions.filter((p) => p.description === null);
		nullDescPositions.forEach((original) => {
			const found = modified.find((p) => p.entityUrn === original.entityUrn);
			expect(found?.description).toBeNull();
		});
	});

	it("satisfies Identity law on filtered traversal", () => {
		const withDescription = Traversal.filtered<PositionEntity>(
			(p) => p.description !== null,
		);
		expect(pipe(withDescription, Traversal.modify((x) => x))(positions)).toEqual(positions);
	});
});

// ============================================================================
// 5. Prism.index — safe array element access
// ============================================================================

describe("Prism.index — safe array element access", () => {
	const { included } = candidateProfileResponse;

	const skills = included.filter(
		(e): e is SkillEntity =>
			e.$type === "com.linkedin.voyager.dash.identity.profile.Skill",
	);

	const certifications = included.filter(
		(e): e is CertificationEntity =>
			e.$type === "com.linkedin.voyager.dash.identity.profile.Certification",
	);

	it("Prism.index(0) returns Just with the first skill", () => {
		const result = pipe(Prism.index<SkillEntity>(0), Prism.preview(skills));
		expect(M.isJust(result)).toBe(true);
		if (M.isJust(result)) {
			expect(result.value.name).toBe("Scrum");
		}
	});

	it("Prism.index(999) returns Nothing safely", () => {
		const result = pipe(Prism.index<SkillEntity>(999), Prism.preview(skills));
		expect(result).toEqual(M.nothing());
	});

	it("chains Prism.index(0) with Lens.prop to get first certification name", () => {
		const nameLens = pipe(Lens.identity<CertificationEntity>(), Lens.prop("name"));
		const firstCertName = pipe(
			Prism.index<CertificationEntity>(0),
			Prism.compose(nameLens),
		);
		const result = pipe(firstCertName, Prism.preview(certifications));
		expect(result).toEqual(M.just("Professional Scrum Product Owner (PSPO)"));
	});

	it("Prism.index on an empty array returns Nothing", () => {
		const empty: SkillEntity[] = [];
		const result = pipe(Prism.index<SkillEntity>(0), Prism.preview(empty));
		expect(result).toEqual(M.nothing());
	});

	it("Prism.index(1) returns the second skill", () => {
		const result = pipe(Prism.index<SkillEntity>(1), Prism.preview(skills));
		expect(M.isJust(result)).toBe(true);
		if (M.isJust(result)) {
			expect(result.value.name).toBe("Artificial Intelligence (AI)");
		}
	});
});

// ============================================================================
// 6. Domain mapping — NormalizedStoreResponse → CandidateProfile
// ============================================================================

describe("Domain mapping — NormalizedStoreResponse → CandidateProfile", () => {
	const result = toCandidateProfile(candidateProfileResponse);

	it("maps name correctly", () => {
		expect(result.name).toBe("Jose Cruset");
	});

	it("maps summary from en_US locale", () => {
		expect(result.summary).toContain("Artificial Intelligence");
	});

	it("maps currentEmployer from first PositionGroup", () => {
		expect(result.currentEmployer).toBe("Alfa AI & Blockchain");
	});

	it("maps all job titles from Position entities", () => {
		expect(result.jobTitles).toEqual([
			"Founder & Chief Technology Officer",
			"Chief Technology Officer",
			"Tech Lead / Senior Software Engineer",
		]);
	});

	it("maps all employers from PositionGroup entities", () => {
		expect(result.employers).toContain("Alfa AI & Blockchain");
		expect(result.employers).toContain("Waicont Systems");
		expect(result.employers).toContain("Telio Group");
	});

	it("maps all skills", () => {
		expect(result.skills).toContain("Scrum");
		expect(result.skills).toContain("Artificial Intelligence (AI)");
		expect(result.skills).toContain("Machine Learning");
		expect(result.skills).toContain("Project Management");
		expect(result.skills).toContain("Business Development");
	});

	it("maps certifications with name and issuer", () => {
		expect(result.certifications).toContainEqual({
			name: "Professional Scrum Product Owner (PSPO)",
			issuer: "Scrum.org",
		});
		expect(result.certifications).toContainEqual({
			name: "Python for Everybody Specialization",
			issuer: "Coursera",
		});
	});

	it("maps languages with name and proficiency", () => {
		expect(result.languages).toContainEqual({
			name: "Spanish",
			proficiency: "NATIVE_OR_BILINGUAL",
		});
		expect(result.languages).toContainEqual({
			name: "English",
			proficiency: "FULL_PROFESSIONAL",
		});
	});

	it("maps education with school and field", () => {
		expect(result.education).toContainEqual({
			school: "IESE Business School - University of Navarra",
			field: "Business Administration",
		});
		expect(result.education).toContainEqual({
			school: "Goethe University Frankfurt, Germany",
			field: "Business Administration",
		});
	});

	it("full domain object shape is correct", () => {
		const expected: CandidateProfile = {
			name: "Jose Cruset",
			summary: result.summary,
			currentEmployer: "Alfa AI & Blockchain",
			jobTitles: [
				"Founder & Chief Technology Officer",
				"Chief Technology Officer",
				"Tech Lead / Senior Software Engineer",
			],
			employers: result.employers,
			skills: result.skills,
			certifications: [
				{ name: "Professional Scrum Product Owner (PSPO)", issuer: "Scrum.org" },
				{ name: "Professional Scrum Master (PSM)", issuer: "Scrum.org" },
				{ name: "Python for Everybody Specialization", issuer: "Coursera" },
			],
			languages: result.languages,
			education: [
				{ school: "IESE Business School - University of Navarra", field: "Business Administration" },
				{ school: "Goethe University Frankfurt, Germany", field: "Business Administration" },
			],
		};
		expect(result.name).toBe(expected.name);
		expect(result.currentEmployer).toBe(expected.currentEmployer);
		expect(result.jobTitles).toEqual(expected.jobTitles);
		expect(result.certifications).toEqual(expected.certifications);
		expect(result.education).toEqual(expected.education);
	});
});
