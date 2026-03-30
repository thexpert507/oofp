// Optimized focal-style implementations — same public signatures as focal-impl.ts,
// but with targeted performance improvements applied inline (without modifying the lib).
//
// Each optimization is labeled and explained. The goal is to measure whether the
// improvements justify migrating them into @oofp/focal itself.
//
// Optimizations applied:
//   Opt A — prismModify memoization: cache the derived modify closure at compose
//            time instead of recomputing it on every call to modify.
//   Opt B — allocation-free collect: avoid boxing each element into Maybe<A>
//            during toArray by inlining the $type check directly in the loop.
//            A _matchHint on the Prism carries the {key, value} pair needed.
//   Opt C — Lens.prop set: inline the setter for the identity+prop pattern to
//            avoid the redundant outer get call on every set/modify.
//   Opt D — single-pass domain mapping: replace 7 separate .filter() passes with
//            one loop that classifies each entity — O(n) instead of O(7n).

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

// ---------------------------------------------------------------------------
// Minimal optic types — mirrors @oofp/focal interfaces exactly
// ---------------------------------------------------------------------------

interface Lens<S, A> {
	readonly tag: "Lens";
	readonly get: (s: S) => A;
	readonly set: (a: A) => (s: S) => S;
}

// _matchHint is the key to Opt B: when present on a Prism it lets the
// Traversal compose path skip the Maybe allocation entirely.
interface Prism<S, A> {
	readonly tag: "Prism";
	readonly preview: (s: S) => { tag: "Just"; value: A } | { tag: "Nothing" };
	readonly review: (a: A) => S;
	readonly modify?: (f: (a: A) => A) => (s: S) => S;
	readonly _matchHint?: { key: string; value: string };
}

interface Traversal<S, A> {
	readonly tag: "Traversal";
	readonly modify: (f: (a: A) => A) => (s: S) => S;
	readonly toArray: (s: S) => A[];
}

// ---------------------------------------------------------------------------
// Opt A helper — memoized prismModify
// Called once at compose time; the resulting function is stored in the closure.
// ---------------------------------------------------------------------------

function cachedPrismModify<S, A>(prism: Prism<S, A>): (f: (a: A) => A) => (s: S) => S {
	if (prism.modify) return prism.modify;
	// Derive once; capture preview/review — no repeated null-check at runtime.
	const { preview, review } = prism;
	return (f) => (s) => {
		const ma = preview(s);
		if (ma.tag === "Nothing") return s;
		return review(f(ma.value));
	};
}

// ---------------------------------------------------------------------------
// Constructors
// ---------------------------------------------------------------------------

// Opt C — identity+prop lens: the setter is a direct spread, no outer get.
function makePropLens<S, K extends keyof S>(key: K): Lens<S, S[K]> {
	return {
		tag: "Lens",
		get: (s) => s[key],
		// Direct spread: no intermediate get call, no outer lens indirection.
		set: (v) => (s) => ({ ...s, [key]: v }),
	};
}

// Opt B — match prism with _matchHint attached.
// Three-param form: S is the whole union, A is the narrowed variant (explicit),
// tagKey/tagValue identify which variant to match. This avoids the Extract<S, Record<TK,TV>>
// path that resolves to `never` when S contains an index-signature catch-all (UnknownEntity).
function makeMatchPrism<S, A extends S>(
	tagKey: string,
	tagValue: string,
): Prism<S, A> {
	return {
		tag: "Prism",
		preview: (s) => {
			const rec = s as Record<string, unknown>;
			return rec[tagKey] === tagValue
				? { tag: "Just", value: s as unknown as A }
				: { tag: "Nothing" };
		},
		review: (a) => a as unknown as S,
		_matchHint: { key: tagKey, value: tagValue },
	};
}

// Traversal.each — same as original
function makeEachTraversal<A>(): Traversal<A[], A> {
	return {
		tag: "Traversal",
		modify: (f) => (s) => s.map(f),
		toArray: (s) => s,
	};
}

// ---------------------------------------------------------------------------
// Opt A + Opt B — compose(Traversal, Prism)
// Memoizes prismModify at compose time (Opt A).
// Uses _matchHint to skip Maybe allocation in toArray (Opt B).
// ---------------------------------------------------------------------------

function composeTraversalPrism<S, A, B>(
	from: Traversal<S, A>,
	prism: Prism<A, B>,
): Traversal<S, B> {
	// Opt A: compute once here, not inside the lambda
	const cachedModify = cachedPrismModify(prism);

	// Opt B: if the prism carries a match hint, use a direct property check
	// in toArray to avoid allocating a Maybe object per element.
	const hint = prism._matchHint;
	const fastToArray: (s: S) => B[] = hint
		? (s) => {
				const result: B[] = [];
				for (const a of from.toArray(s)) {
					if ((a as Record<string, unknown>)[hint.key] === hint.value) {
						result.push(a as unknown as B);
					}
				}
				return result;
			}
		: (s) => {
				const result: B[] = [];
				for (const a of from.toArray(s)) {
					const mb = prism.preview(a);
					if (mb.tag === "Just") result.push(mb.value);
				}
				return result;
			};

	return {
		tag: "Traversal",
		modify: (f) => from.modify(cachedModify(f)), // Opt A
		toArray: fastToArray, // Opt B
	};
}

// Compose Traversal + Lens (unchanged from original — already optimal)
function composeTraversalLens<S, A, B>(
	from: Traversal<S, A>,
	lens: Lens<A, B>,
): Traversal<S, B> {
	return {
		tag: "Traversal",
		modify: (f) => from.modify((a) => lens.set(f(lens.get(a)))(a)),
		toArray: (s) => from.toArray(s).map(lens.get),
	};
}

// ---------------------------------------------------------------------------
// Operations
// ---------------------------------------------------------------------------

function traversalCollect<S, A>(t: Traversal<S, A>, s: S): A[] {
	return t.toArray(s);
}

function traversalModify<S, A>(t: Traversal<S, A>, f: (a: A) => A): (s: S) => S {
	return t.modify(f);
}

function lensView<S, A>(lens: Lens<S, A>, s: S): A {
	return lens.get(s);
}

// ---------------------------------------------------------------------------
// Optic definitions — same shape as focal-impl.ts
// ---------------------------------------------------------------------------

const eachEntity = makeEachTraversal<IncludedEntity>();

// Prisms with _matchHint (Opt B)
const profilePrism = makeMatchPrism<IncludedEntity, ProfileEntity>(
	"$type",
	"com.linkedin.voyager.dash.identity.profile.Profile",
);
const positionPrism = makeMatchPrism<IncludedEntity, PositionEntity>(
	"$type",
	"com.linkedin.voyager.dash.identity.profile.Position",
);
const positionGroupPrism = makeMatchPrism<IncludedEntity, PositionGroupEntity>(
	"$type",
	"com.linkedin.voyager.dash.identity.profile.PositionGroup",
);
const skillPrism = makeMatchPrism<IncludedEntity, SkillEntity>(
	"$type",
	"com.linkedin.voyager.dash.identity.profile.Skill",
);
const certificationPrism = makeMatchPrism<IncludedEntity, CertificationEntity>(
	"$type",
	"com.linkedin.voyager.dash.identity.profile.Certification",
);
const languagePrism = makeMatchPrism<IncludedEntity, LanguageEntity>(
	"$type",
	"com.linkedin.voyager.dash.identity.profile.Language",
);
const educationPrism = makeMatchPrism<IncludedEntity, EducationEntity>(
	"$type",
	"com.linkedin.voyager.dash.identity.profile.Education",
);

// Lenses — Opt C: direct prop lenses, no identity() indirection
const firstNameLens = makePropLens<ProfileEntity, "firstName">("firstName");
const lastNameLens = makePropLens<ProfileEntity, "lastName">("lastName");
const summaryLens = makePropLens<ProfileEntity, "multiLocaleSummary">("multiLocaleSummary");
const titleLens = makePropLens<PositionEntity, "title">("title");
const groupCompanyLens = makePropLens<PositionGroupEntity, "companyName">("companyName");
const skillNameLens = makePropLens<SkillEntity, "name">("name");

// Traversals — composed with Opt A + Opt B
const profilesTraversal = composeTraversalPrism(eachEntity, profilePrism);
const firstNameTraversal = composeTraversalLens(profilesTraversal, firstNameLens);
const allSkillsTraversal = composeTraversalPrism(eachEntity, skillPrism);

// ---------------------------------------------------------------------------
// Scenario 1: Read access — Opt C (direct prop lens, no identity overhead)
// ---------------------------------------------------------------------------

export function readAccess(profile: ProfileEntity): string {
	return lensView(firstNameLens, profile);
}

// ---------------------------------------------------------------------------
// Scenario 2: Deep immutable update — Opt A + Opt C
// (prismModify cached at compose time; prop lens setter is a direct spread)
// ---------------------------------------------------------------------------

export function deepUpdate(response: NormalizedStoreResponse): NormalizedStoreResponse {
	return {
		...response,
		included: traversalModify(firstNameTraversal, () => "Updated")(response.included),
	};
}

// ---------------------------------------------------------------------------
// Scenario 3: Discriminated union filter — Opt A + Opt B
// (allocation-free toArray via _matchHint; no Maybe boxing per element)
// ---------------------------------------------------------------------------

export function filterByType(entities: IncludedEntity[]): SkillEntity[] {
	return traversalCollect(allSkillsTraversal, entities);
}

// ---------------------------------------------------------------------------
// Scenario 4: Full domain mapping — Opt A + Opt B + Opt D
// (Opt D: single pass over `included` instead of 7 separate filter passes)
// ---------------------------------------------------------------------------

export function domainMapping(response: NormalizedStoreResponse): CandidateProfile {
	const { included } = response;

	// Opt D — single pass: classify every entity exactly once.
	// This replaces 7 × included.filter(...) calls in the focal-impl version
	// and the imperative version. Both of those are O(7n); this is O(n).
	const profiles: ProfileEntity[] = [];
	const positions: PositionEntity[] = [];
	const positionGroups: PositionGroupEntity[] = [];
	const skills: SkillEntity[] = [];
	const certifications: CertificationEntity[] = [];
	const languages: LanguageEntity[] = [];
	const educations: EducationEntity[] = [];

	for (const e of included) {
		switch (e.$type) {
			case "com.linkedin.voyager.dash.identity.profile.Profile":
				profiles.push(e as ProfileEntity);
				break;
			case "com.linkedin.voyager.dash.identity.profile.Position":
				positions.push(e as PositionEntity);
				break;
			case "com.linkedin.voyager.dash.identity.profile.PositionGroup":
				positionGroups.push(e as PositionGroupEntity);
				break;
			case "com.linkedin.voyager.dash.identity.profile.Skill":
				skills.push(e as SkillEntity);
				break;
			case "com.linkedin.voyager.dash.identity.profile.Certification":
				certifications.push(e as CertificationEntity);
				break;
			case "com.linkedin.voyager.dash.identity.profile.Language":
				languages.push(e as LanguageEntity);
				break;
			case "com.linkedin.voyager.dash.identity.profile.Education":
				educations.push(e as EducationEntity);
				break;
		}
	}

	const mainProfile = profiles[0];

	// Opt C — direct prop lens reads (no identity() + compose overhead)
	const name = mainProfile
		? `${lensView(firstNameLens, mainProfile)} ${lensView(lastNameLens, mainProfile)}`
		: "";

	const summaryRecord = mainProfile ? lensView(summaryLens, mainProfile) : null;
	const summary = summaryRecord?.["en_US"] ?? null;

	const currentEmployer = positionGroups[0]?.companyName ?? null;

	// Opt A + Opt B — traversal-based field extraction on already-filtered sub-arrays.
	// For consistency we keep using optic compositions here (Lens over array of T),
	// but on the pre-classified arrays so we only traverse each subtype once.
	const positionTraversal = makeEachTraversal<PositionEntity>();
	const jobTitles = traversalCollect(composeTraversalLens(positionTraversal, titleLens), positions);

	const employers = positionGroups
		.map((g) => lensView(groupCompanyLens, g))
		.filter((n): n is string => n !== undefined);

	const skillNames = skills.map((s) => lensView(skillNameLens, s));

	return {
		name,
		summary,
		currentEmployer,
		jobTitles,
		employers,
		skills: skillNames,
		certifications: certifications.map((c) => ({ name: c.name, issuer: c.authority })),
		languages: languages.map((l) => ({ name: l.name, proficiency: l.proficiency })),
		education: educations.map((ed) => ({ school: ed.schoolName, field: ed.fieldOfStudy })),
	};
}
