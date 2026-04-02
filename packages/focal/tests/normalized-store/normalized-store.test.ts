/**
 * Normalized store — optics integration tests.
 *
 * Demonstrates the Focal fluent API applied to a real-world polymorphic
 * normalized store API response, including:
 *
 *  1. Focal.match  — filter by $type discriminant
 *  2. Focal.prop   — deep immutable access
 *  3. Focal.fromEach + match + prop — collect across all entities of a type
 *  4. Focal.filter — selective traversal
 *  5. Focal.index  — safe array element access
 *  6. Domain mapping — NormalizedStoreResponse → CandidateProfile
 */

import * as M from "@oofp/core/maybe";
import { pipe } from "@oofp/core/pipe";
import { describe, expect, it } from "vitest";
import * as Focal from "../../lib/focal/index.ts";

import type { CertificationEntity, IncludedEntity, PositionEntity, SkillEntity } from "./types.ts";

import {
	type CandidateProfile,
	certificationFocal,
	positionFocal,
	positionGroupFocal,
	skillFocal,
	toCandidateProfile,
} from "./domain.ts";

import { candidateProfileResponse } from "./fixtures.ts";

// ============================================================================
// 1. Focal.match — filter by $type
// ============================================================================

describe("Focal.match — filter by $type", () => {
	const { included } = candidateProfileResponse;

	const firstSkill = included.find(
		(e) => e.$type === "com.linkedin.voyager.dash.identity.profile.Skill",
	) as IncludedEntity;

	const firstCollectionResponse = included.find(
		(e) => e.$type === "com.linkedin.restli.common.CollectionResponse",
	) as IncludedEntity;

	it("preview returns Just for a matching Skill entity", () => {
		expect(pipe(skillFocal, Focal.preview(firstSkill))).toEqual(M.just(firstSkill));
	});

	it("preview returns Nothing for a non-matching entity", () => {
		expect(pipe(skillFocal, Focal.preview(firstCollectionResponse))).toEqual(M.nothing());
	});

	it("preview returns Just for a matching Certification entity", () => {
		const cert = included.find(
			(e) => e.$type === "com.linkedin.voyager.dash.identity.profile.Certification",
		) as IncludedEntity;
		expect(pipe(certificationFocal, Focal.preview(cert))).toEqual(M.just(cert));
	});

	it("positionFocal.preview returns Nothing for a CollectionResponse", () => {
		expect(pipe(positionFocal, Focal.preview(firstCollectionResponse))).toEqual(M.nothing());
	});

	it("collect all skills via fromEach + compose(skillFocal)", () => {
		const skills = pipe(
			Focal.fromEach<IncludedEntity>(),
			Focal.compose(skillFocal),
			Focal.collect(included),
		);
		expect(skills).toHaveLength(5);
		expect(skills.map((s) => s.name)).toContain("Scrum");
		expect(skills.map((s) => s.name)).toContain("Artificial Intelligence (AI)");
	});

	it("collect does not include CollectionResponse entities", () => {
		const skills = pipe(
			Focal.fromEach<IncludedEntity>(),
			Focal.compose(skillFocal),
			Focal.collect(included),
		);
		skills.forEach((s) => {
			expect(s.$type).toBe("com.linkedin.voyager.dash.identity.profile.Skill");
		});
	});
});

// ============================================================================
// 2. Focal.prop — deep immutable access
// ============================================================================

describe("Focal.prop — deep immutable access", () => {
	const profile = candidateProfileResponse.included.find(
		(e) => e.$type === "com.linkedin.voyager.dash.identity.profile.Profile",
	) as import("./types.ts").ProfileEntity;

	it("reads firstName", () => {
		const firstName = pipe(
			Focal.from<typeof profile>(),
			Focal.prop("firstName"),
			Focal.get(profile),
		);
		expect(firstName).toBe("Jose");
	});

	it("reads lastName", () => {
		const lastName = pipe(Focal.from<typeof profile>(), Focal.prop("lastName"), Focal.get(profile));
		expect(lastName).toBe("Cruset");
	});

	it("set firstName produces a new object", () => {
		const updated = pipe(
			Focal.from<typeof profile>(),
			Focal.prop("firstName"),
			Focal.set("Joseph"),
			Focal.run(profile),
		);
		expect(updated.firstName).toBe("Joseph");
		expect(updated.lastName).toBe("Cruset");
	});

	it("set does not mutate the original", () => {
		pipe(
			Focal.from<typeof profile>(),
			Focal.prop("firstName"),
			Focal.set("ShouldNotPersist"),
			Focal.run(profile),
		);
		expect(profile.firstName).toBe("Jose");
	});

	it("reads nested profilePicture artifact width via Focal.index", () => {
		const picture = pipe(
			Focal.from<typeof profile>(),
			Focal.prop("profilePicture"),
			Focal.get(profile),
		);

		if (picture === null) throw new Error("Expected profilePicture to be non-null");

		const artifacts = picture.displayImageReference.vectorImage.artifacts;
		const firstArtifact = pipe(
			Focal.from<typeof artifacts>(),
			Focal.index(0),
			Focal.preview(artifacts),
		);
		expect(M.isJust(firstArtifact)).toBe(true);
		if (M.isJust(firstArtifact)) {
			expect(firstArtifact.value.width).toBe(100);
		}
	});

	it("satisfies GetPut law for firstName", () => {
		const firstName = pipe(
			Focal.from<typeof profile>(),
			Focal.prop("firstName"),
			Focal.get(profile),
		);
		const restored = pipe(
			Focal.from<typeof profile>(),
			Focal.prop("firstName"),
			Focal.set(firstName),
			Focal.run(profile),
		);
		expect(restored).toEqual(profile);
	});

	it("satisfies PutGet law for lastName", () => {
		const updated = pipe(
			Focal.from<typeof profile>(),
			Focal.prop("lastName"),
			Focal.set("Updated"),
			Focal.run(profile),
		);
		const lastName = pipe(Focal.from<typeof updated>(), Focal.prop("lastName"), Focal.get(updated));
		expect(lastName).toBe("Updated");
	});
});

// ============================================================================
// 3. fromEach + match + prop — collect across all entities
// ============================================================================

describe("fromEach + match + prop — collect across all entities of a type", () => {
	const { included } = candidateProfileResponse;

	it("collects all position titles", () => {
		const titles = pipe(
			Focal.fromEach<IncludedEntity>(),
			Focal.compose(positionFocal),
			Focal.prop("title"),
			Focal.collect(included),
		);
		expect(titles).toEqual([
			"Founder & Chief Technology Officer",
			"Chief Technology Officer",
			"Tech Lead / Senior Software Engineer",
		]);
	});

	it("collects all positionGroup company names", () => {
		const companies = pipe(
			Focal.fromEach<IncludedEntity>(),
			Focal.compose(positionGroupFocal),
			Focal.prop("companyName"),
			Focal.collect(included),
		);
		expect(companies).toContain("Alfa AI & Blockchain");
		expect(companies).toContain("Waicont Systems");
		expect(companies).toContain("Telio Group");
	});

	it("modifies all skill names to uppercase", () => {
		const modified = pipe(
			Focal.fromEach<IncludedEntity>(),
			Focal.compose(skillFocal),
			Focal.prop("name"),
			Focal.modify((n: string) => n.toUpperCase()),
			Focal.run(included),
		);
		const skills = pipe(
			Focal.fromEach<IncludedEntity>(),
			Focal.compose(skillFocal),
			Focal.collect(modified),
		);
		skills.forEach((s) => {
			expect(s.name).toBe(s.name.toUpperCase());
		});
	});

	it("modification does not affect non-skill entities", () => {
		const modified = pipe(
			Focal.fromEach<IncludedEntity>(),
			Focal.compose(skillFocal),
			Focal.prop("name"),
			Focal.modify((n: string) => n.toUpperCase()),
			Focal.run(included),
		);
		const profileAfter = modified.find(
			(e) => e.$type === "com.linkedin.voyager.dash.identity.profile.Profile",
		) as import("./types.ts").ProfileEntity;
		expect(profileAfter.firstName).toBe("Jose");
	});
});

// ============================================================================
// 4. Focal.filter — selective traversal
// ============================================================================

describe("Focal.filter — selective traversal", () => {
	const { included } = candidateProfileResponse;

	const positions = included.filter(
		(e): e is PositionEntity => e.$type === "com.linkedin.voyager.dash.identity.profile.Position",
	);

	it("collect only returns positions with a non-null description", () => {
		const result = pipe(
			Focal.fromEach<PositionEntity>(),
			Focal.filter((p) => p.description !== null),
			Focal.collect(positions),
		);
		expect(result.length).toBeGreaterThan(0);
		result.forEach((p) => expect(p.description).not.toBeNull());
	});

	it("collect does not return positions with null description", () => {
		const result = pipe(
			Focal.fromEach<PositionEntity>(),
			Focal.filter((p) => p.description !== null),
			Focal.collect(positions),
		);
		const nullDescPositions = positions.filter((p) => p.description === null);
		nullDescPositions.forEach((np) => {
			expect(result).not.toContainEqual(np);
		});
	});

	it("set on filtered focal only affects matching positions", () => {
		const sentinel = "CLEARED";
		const modified = pipe(
			Focal.fromEach<PositionEntity>(),
			Focal.filter((p) => p.description !== null),
			Focal.set({ ...positions[0], description: sentinel } as PositionEntity),
			Focal.run(positions),
		);
		const nullDescPositions = positions.filter((p) => p.description === null);
		nullDescPositions.forEach((original) => {
			const found = modified.find((p) => p.entityUrn === original.entityUrn);
			expect(found?.description).toBeNull();
		});
	});

	it("satisfies Identity law on filtered focal", () => {
		const result = pipe(
			Focal.fromEach<PositionEntity>(),
			Focal.filter((p) => p.description !== null),
			Focal.modify((x) => x),
			Focal.run(positions),
		);
		expect(result).toEqual(positions);
	});
});

// ============================================================================
// 5. Focal.index — safe array element access
// ============================================================================

describe("Focal.index — safe array element access", () => {
	const { included } = candidateProfileResponse;

	const skills = included.filter(
		(e): e is SkillEntity => e.$type === "com.linkedin.voyager.dash.identity.profile.Skill",
	);

	const certifications = included.filter(
		(e): e is CertificationEntity =>
			e.$type === "com.linkedin.voyager.dash.identity.profile.Certification",
	);

	it("index(0) returns Just with the first skill", () => {
		const result = pipe(Focal.from<SkillEntity[]>(), Focal.index(0), Focal.preview(skills));
		expect(M.isJust(result)).toBe(true);
		if (M.isJust(result)) {
			expect(result.value.name).toBe("Scrum");
		}
	});

	it("index(999) returns Nothing safely", () => {
		const result = pipe(Focal.from<SkillEntity[]>(), Focal.index(999), Focal.preview(skills));
		expect(result).toEqual(M.nothing());
	});

	it("chains index(0) + prop to get first certification name", () => {
		const result = pipe(
			Focal.from<CertificationEntity[]>(),
			Focal.index(0),
			Focal.prop("name"),
			Focal.preview(certifications),
		);
		expect(result).toEqual(M.just("Professional Scrum Product Owner (PSPO)"));
	});

	it("index on an empty array returns Nothing", () => {
		const empty: SkillEntity[] = [];
		const result = pipe(Focal.from<SkillEntity[]>(), Focal.index(0), Focal.preview(empty));
		expect(result).toEqual(M.nothing());
	});

	it("index(1) returns the second skill", () => {
		const result = pipe(Focal.from<SkillEntity[]>(), Focal.index(1), Focal.preview(skills));
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
				{
					school: "IESE Business School - University of Navarra",
					field: "Business Administration",
				},
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
